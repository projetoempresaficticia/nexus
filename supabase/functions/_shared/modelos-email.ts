// Modelos dos e-mails automáticos (GLOSSARIO_UI.md §E-mails automáticos).
// Módulo puro (sem Deno nem rede): usado pela Edge Function enviar-notificacoes e testado pelo Vitest.

export type TipoNotificacao =
  | 'boas_vindas'
  | 'atribuicao'
  | 'mencao'
  | 'comentario'
  | 'solicitacao_recebida'
  | 'solicitacao_respondida'
  | 'lembrete_prazo';

export interface DadosEmail {
  tipo: TipoNotificacao;
  destinatario: string;
  autor: string | null;
  item: string | null;
  /** AAAA-MM-DD */
  prazo: string | null;
  /** Código do status do item (em_andamento…). */
  status: string | null;
  /** Texto do comentário, da solicitação ou da resposta (HTML ou texto). */
  trecho: string | null;
  /** Outros responsáveis do item (atribuição). */
  outros: string[];
  /** Setores da pessoa (boas-vindas). */
  setores: string[];
  /** informacao | acao | aprovacao */
  tipoSolicitacao: string | null;
  /** resolvida | aprovada | recusada */
  resultado: string | null;
  link: string;
}

export interface Email {
  assunto: string;
  texto: string;
  html: string;
}

const STATUS: Record<string, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  bloqueada: 'Bloqueada',
  aguardando_aprovacao: 'Aguardando aprovação',
  concluida: 'Concluída',
};
const TIPO_SOLICITACAO: Record<string, string> = {
  informacao: 'Informação',
  acao: 'Ação',
  aprovacao: 'Aprovação',
};
const RESULTADO: Record<string, string> = {
  resolvida: 'resolvida',
  aprovada: 'aprovada',
  recusada: 'recusada',
};

export const REMETENTE_NOME = 'Nexus — Prepara Portugal';
const RODAPE = (link: string) =>
  `Você recebeu este e-mail porque participa do Nexus. Abrir o Nexus: ${link}`;

/** HTML (comentário, solicitação) → texto curto para citar no e-mail. */
export function trechoDe(html: string | null, maximo = 200): string {
  if (!html) return '';
  const texto = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return texto.length > maximo ? `${texto.slice(0, maximo - 1).trimEnd()}…` : texto;
}

/** "2026-11-30" → "30/11/2026" */
export function dataBr(iso: string | null): string {
  if (!iso) return 'sem prazo';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function escaparHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Assunto e corpo de cada tipo, como na tabela do GLOSSARIO_UI. */
export function montarEmail(d: DadosEmail): Email {
  const autor = d.autor ?? 'Alguém';
  const item = d.item ?? '';
  const trecho = trechoDe(d.trecho);
  let assunto: string;
  let corpo: string;
  switch (d.tipo) {
    case 'boas_vindas':
      assunto = 'Bem-vindo(a) ao Nexus';
      corpo =
        `Olá, ${d.destinatario}! Você foi cadastrado(a) no Nexus, o gerenciador de tarefas da equipe` +
        (d.setores.length ? `, nos setores ${d.setores.join(', ')}` : '') +
        `. Entre com a sua conta Google da empresa: ${d.link}`;
      break;
    case 'atribuicao':
      assunto = `Nova tarefa para você: ${item}`;
      corpo =
        `${autor} incluiu você como responsável em "${item}"` +
        (d.outros.length ? ` (com ${d.outros.join(', ')})` : '') +
        `. Prazo: ${dataBr(d.prazo)}. ${d.link}`;
      break;
    case 'mencao':
      assunto = `${autor} mencionou você em "${item}"`;
      corpo = `"${trecho}" — ${d.link}`;
      break;
    case 'comentario':
      assunto = `Novo comentário em "${item}"`;
      corpo = `${autor} comentou: "${trecho}" — ${d.link}`;
      break;
    case 'solicitacao_recebida':
      assunto = `${autor} precisa de você: ${TIPO_SOLICITACAO[d.tipoSolicitacao ?? ''] ?? 'Solicitação'} em "${item}"`;
      corpo = `"${trecho}" — Responder: ${d.link}`;
      break;
    case 'solicitacao_respondida':
      assunto = `Sua solicitação foi ${RESULTADO[d.resultado ?? ''] ?? 'respondida'}: "${item}"`;
      corpo = `${autor} respondeu` + (trecho ? `: "${trecho}"` : '') + ` — ${d.link}`;
      break;
    case 'lembrete_prazo':
      assunto = `Vence amanhã: ${item}`;
      corpo = `"${item}" vence em ${dataBr(d.prazo)}. Status atual: ${STATUS[d.status ?? ''] ?? d.status ?? '—'}. ${d.link}`;
      break;
  }
  const rodape = RODAPE(d.link);
  const texto = `${corpo}\n\n—\n${rodape}`;
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1f2133">` +
    `<p>${escaparHtml(corpo).replace(escaparHtml(d.link), `<a href="${escaparHtml(d.link)}">${escaparHtml(d.link)}</a>`)}</p>` +
    `<p style="font-size:12px;color:#6b6f85">${escaparHtml(rodape)}</p></div>`;
  return { assunto, texto, html };
}

