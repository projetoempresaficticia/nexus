// Edge Function enviar-anexo (T-52): o arquivo vai para o Google Drive partilhado (pasta do setor) e o
// Nexus guarda só a linha com o link. Quem pode anexar decide a RLS: a linha é gravada com o login da
// pessoa; só o drive_id é completado com a service role (a pessoa não pode gravá-lo — ver migration).
// Sem os secrets do Drive responde drive_nao_configurado e o Angular usa o Storage (desenvolvimento).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { cors, json } from '../_shared/cors.ts';
import { Drive, lerConfig } from '../_shared/drive.ts';

const LIMITE = 20 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405);

  const config = lerConfig(
    Deno.env.get('GDRIVE_SERVICE_ACCOUNT_JSON'),
    Deno.env.get('GDRIVE_ANEXOS_FOLDER_ID'),
    Deno.env.get('GDRIVE_DOMINIO'),
  );
  if (!config) return json({ erro: 'drive_nao_configurado' }, 503);

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: sessao } = await usuario.auth.getUser();
  if (!sessao.user) return json({ erro: 'sem_permissao' }, 401);

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get('arquivo');
  const itemId = form?.get('item_id');
  const comentarioId = form?.get('comentario_id') || null;
  if (
    !(arquivo instanceof File) ||
    typeof itemId !== 'string' ||
    !UUID.test(itemId) ||
    (comentarioId !== null && (typeof comentarioId !== 'string' || !UUID.test(comentarioId)))
  ) {
    return json({ erro: 'pedido_invalido' }, 400);
  }
  if (arquivo.size > LIMITE) return json({ erro: 'arquivo_grande' }, 413);

  // A RLS responde se a pessoa vê o item; o perfil dela vai em enviado_por
  const [{ data: item }, { data: perfil }] = await Promise.all([
    usuario.from('itens').select('id, setor_id, nome').eq('id', itemId).maybeSingle(),
    usuario.from('perfis').select('id').eq('auth_id', sessao.user.id).eq('ativo', true).maybeSingle(),
  ]);
  if (!item || !perfil) return json({ erro: 'sem_permissao' }, 403);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: setor } = await admin
    .from('setores')
    .select('nome')
    .eq('id', item.setor_id)
    .single();

  let drive: Drive;
  let enviado: { id: string; link: string };
  try {
    drive = await Drive.conectar(config);
    const pasta = await drive.pastaDoSetor(item.setor_id, setor?.nome ?? item.setor_id);
    enviado = await drive.enviar({
      pasta,
      nome: arquivo.name,
      mime: arquivo.type || 'application/octet-stream',
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
      descricao: `Anexo do Nexus — item "${item.nome}"`,
      propriedades: { nexus_anexo: '1', nexus_item_id: item.id, nexus_setor_id: item.setor_id },
    });
  } catch (e) {
    console.error('enviar-anexo: falha no Drive', (e as Error).message);
    return json({ erro: 'drive_falhou' }, 502);
  }
  // Sem a permissão do domínio o arquivo continua visível para os membros do Drive partilhado
  await drive
    .compartilharComDominio(enviado.id)
    .catch((e) => console.warn('enviar-anexo: permissão do domínio', (e as Error).message));

  const { data: anexo, error } = await usuario
    .from('anexos')
    .insert({
      item_id: item.id,
      comentario_id: comentarioId,
      nome: arquivo.name,
      link_externo: enviado.link,
      tamanho_bytes: arquivo.size,
      mime: arquivo.type || null,
      enviado_por: perfil.id,
    })
    .select()
    .single();
  if (error || !anexo) {
    await drive.lixeira(enviado.id).catch(() => undefined);
    return json({ erro: error?.code === 'P0001' ? error.message : 'sem_permissao' }, 403);
  }

  const { error: erroId } = await admin
    .from('anexos')
    .update({ drive_id: enviado.id })
    .eq('id', anexo.id);
  if (erroId) {
    await admin.from('anexos').delete().eq('id', anexo.id);
    await drive.lixeira(enviado.id).catch(() => undefined);
    return json({ erro: 'rede' }, 500);
  }
  return json({ ...anexo, drive_id: enviado.id });
});
