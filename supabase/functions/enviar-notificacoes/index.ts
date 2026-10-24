// Edge Function enviar-notificacoes (T-36): chamada pelo pg_cron a cada 2 min (supabase/agendamentos.sql).
// Lê até 50 notificações pendentes, monta o e-mail (GLOSSARIO_UI) e envia; máximo de 3 tentativas.
// Segurança: não usa o JWT de ninguém — exige o segredo NOTIFICACOES_SEGREDO no cabeçalho x-nexus-segredo.
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';
import { json } from '../_shared/cors.ts';
import { enviarEmail } from '../_shared/email.ts';
import { DadosEmail, montarEmail, TipoNotificacao } from '../_shared/modelos-email.ts';

const LOTE = 50;
const MAX_TENTATIVAS = 3;

interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  destinatario_id: string;
  autor_id: string | null;
  item_id: string | null;
  dados: Record<string, string | null>;
  tentativas: number;
}

/** Comparação em tempo constante (não revela o segredo pelo tempo de resposta). */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('NOTIFICACOES_SEGREDO') ?? '';
  if (!segredo || !iguais(req.headers.get('x-nexus-segredo') ?? '', segredo)) {
    return json({ erro: 'sem_permissao' }, 401);
  }
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');

  const { data: pendentes, error } = await admin
    .from('notificacoes')
    .select('id, tipo, destinatario_id, autor_id, item_id, dados, tentativas')
    .is('enviado_em', null)
    .lt('tentativas', MAX_TENTATIVAS)
    .order('criado_em')
    .limit(LOTE);
  if (error) return json({ erro: 'rede' }, 500);

  let enviados = 0;
  let falhas = 0;
  for (const n of (pendentes ?? []) as Notificacao[]) {
    try {
      const destino = await perfil(admin, n.destinatario_id);
      if (!destino?.ativo) {
        // Quem saiu não recebe; não tenta de novo
        await admin.from('notificacoes').update({ enviado_em: new Date().toISOString(), erro: 'destinatario_inativo' }).eq('id', n.id);
        continue;
      }
      const email = montarEmail(await dados(admin, n, destino.nome, appUrl));
      await enviarEmail({ para: destino.email, ...email });
      await admin.from('notificacoes').update({ enviado_em: new Date().toISOString(), erro: null }).eq('id', n.id);
      enviados++;
    } catch (e) {
      falhas++;
      await admin
        .from('notificacoes')
        .update({ tentativas: n.tentativas + 1, erro: String(e instanceof Error ? e.message : e).slice(0, 500) })
        .eq('id', n.id);
    }
  }
  return json({ enviados, falhas });
});

async function perfil(admin: SupabaseClient, id: string | null) {
  if (!id) return null;
  const { data } = await admin.from('perfis').select('nome, email, ativo').eq('id', id).maybeSingle();
  return data as { nome: string; email: string; ativo: boolean } | null;
}

/** Junta o que o modelo precisa: autor, item, trecho, outros responsáveis, setores, link. */
async function dados(
  admin: SupabaseClient,
  n: Notificacao,
  destinatario: string,
  appUrl: string,
): Promise<DadosEmail> {
  const autor = (await perfil(admin, n.autor_id))?.nome ?? null;
  const { data: item } = n.item_id
    ? await admin.from('itens').select('nome, prazo, status').eq('id', n.item_id).maybeSingle()
    : { data: null };

  let trecho: string | null = null;
  if (n.dados.comentario_id) {
    const { data } = await admin.from('comentarios').select('texto_html').eq('id', n.dados.comentario_id).maybeSingle();
    trecho = data?.texto_html ?? null;
  } else if (n.dados.checklist_id) {
    const { data } = await admin.from('checklist_itens').select('texto').eq('id', n.dados.checklist_id).maybeSingle();
    trecho = data?.texto ?? null;
  } else if (n.tipo === 'solicitacao_recebida' && n.dados.solicitacao_id) {
    const { data } = await admin.from('solicitacoes').select('texto_html').eq('id', n.dados.solicitacao_id).maybeSingle();
    trecho = data?.texto_html ?? null;
  } else if (n.tipo === 'solicitacao_respondida' && n.dados.solicitacao_id) {
    const { data } = await admin
      .from('solicitacao_mensagens')
      .select('texto_html')
      .eq('solicitacao_id', n.dados.solicitacao_id)
      .order('criado_em', { ascending: false })
      .limit(1);
    trecho = data?.[0]?.texto_html ?? null;
  }

  let outros: string[] = [];
  if (n.tipo === 'atribuicao' && n.item_id) {
    const { data } = await admin
      .from('item_responsaveis')
      .select('perfil_id, perfis(nome)')
      .eq('item_id', n.item_id)
      .neq('perfil_id', n.destinatario_id);
    outros = (data ?? []).map((r: { perfis: { nome: string } | null }) => r.perfis?.nome ?? '').filter(Boolean);
  }

  let setores: string[] = [];
  if (n.tipo === 'boas_vindas') {
    const { data } = await admin.from('vinculos').select('setores(nome)').eq('perfil_id', n.destinatario_id);
    setores = (data ?? []).map((v: { setores: { nome: string } | null }) => v.setores?.nome ?? '').filter(Boolean);
  }

  const link = n.dados.solicitacao_id
    ? `${appUrl}/solicitacoes?id=${n.dados.solicitacao_id}`
    : n.item_id
      ? `${appUrl}/item/${n.item_id}`
      : `${appUrl}/`;

  return {
    tipo: n.tipo,
    destinatario,
    autor,
    item: item?.nome ?? n.dados.nome ?? null,
    prazo: item?.prazo ?? n.dados.prazo ?? null,
    status: item?.status ?? n.dados.status ?? null,
    trecho,
    outros,
    setores,
    tipoSolicitacao: n.dados.tipo ?? null,
    resultado: n.dados.resultado ?? null,
    link,
  };
}
