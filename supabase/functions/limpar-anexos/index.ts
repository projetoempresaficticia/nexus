// Edge Function limpar-anexos (T-23): depois de excluir_item, apaga do Storage os arquivos dos anexos apagados.
// Segurança: exige usuário logado e só apaga caminhos que NÃO têm mais linha em public.anexos —
// assim ninguém consegue apagar arquivo de item que ainda existe.
// T-52: também esvazia a fila anexos_drive_lixeira (preenchida pelo banco quando a linha some) e manda
// esses arquivos para a lixeira do Google Drive. O navegador não escolhe quais: a fila vem do banco.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { cors, json } from '../_shared/cors.ts';
import { Drive, lerConfig } from '../_shared/drive.ts';

const CAMINHO = /^[\w-]+\/[\w-]+\/[\w.-]+$/;
const LOTE_DRIVE = 100;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: sessao } = await usuario.auth.getUser();
  if (!sessao.user) return json({ erro: 'sem_permissao' }, 401);

  const corpo = await req.json().catch(() => null);
  const caminhos: unknown = corpo?.caminhos ?? [];
  if (!Array.isArray(caminhos) || caminhos.length > 500) return json({ erro: 'pedido_invalido' }, 400);
  const validos = caminhos.filter((c): c is string => typeof c === 'string' && CAMINHO.test(c));

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let apagados = 0;
  if (validos.length) {
    const { data: ainda, error } = await admin.from('anexos').select('caminho').in('caminho', validos);
    if (error) return json({ erro: 'rede' }, 500);
    const usados = new Set((ainda ?? []).map((a) => a.caminho));
    const apagar = validos.filter((c) => !usados.has(c));
    if (apagar.length) await admin.storage.from('anexos').remove(apagar);
    apagados = apagar.length;
  }

  return json({ apagados, drive: await esvaziarFilaDrive(admin) });
});

/** Manda para a lixeira do Drive os arquivos da fila; o que falhar fica para a próxima chamada. */
async function esvaziarFilaDrive(admin: SupabaseClient): Promise<number> {
  const config = lerConfig(
    Deno.env.get('GDRIVE_SERVICE_ACCOUNT_JSON'),
    Deno.env.get('GDRIVE_ANEXOS_FOLDER_ID'),
    Deno.env.get('GDRIVE_DOMINIO'),
  );
  if (!config) return 0;
  const { data: fila } = await admin
    .from('anexos_drive_lixeira')
    .select('drive_id')
    .order('criado_em')
    .limit(LOTE_DRIVE);
  if (!fila?.length) return 0;
  try {
    const drive = await Drive.conectar(config);
    const feitos: string[] = [];
    for (const { drive_id } of fila as { drive_id: string }[]) {
      try {
        await drive.lixeira(drive_id);
        feitos.push(drive_id);
      } catch (e) {
        console.warn('limpar-anexos: lixeira do Drive', (e as Error).message);
      }
    }
    if (feitos.length) await admin.from('anexos_drive_lixeira').delete().in('drive_id', feitos);
    return feitos.length;
  } catch (e) {
    console.error('limpar-anexos: Drive', (e as Error).message);
    return 0;
  }
}
