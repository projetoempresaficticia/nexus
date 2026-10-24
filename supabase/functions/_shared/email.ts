// Envio de e-mail atrás de uma única função, para trocar de provedor sem mexer no resto (API.md).
// Provedor decidido: SMTP do Google Workspace com senha de app (DECISOES 2026-10-24).
//   EMAIL_PROVEDOR = 'smtp'   → envia por SMTP_HOST:SMTP_PORTA (padrão smtp.gmail.com:465, SSL)
//   EMAIL_PROVEDOR = 'nenhum' → não envia, só registra no log (padrão: seguro para o nexus-dev)
// As Edge Functions do Supabase bloqueiam as portas 25 e 587; por isso 465 (SSL desde o início).
import nodemailer from 'npm:nodemailer@6.9.16';

export interface Mensagem {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

type Transporte = ReturnType<typeof nodemailer.createTransport>;
let transporte: Transporte | null = null;

/** Uma ligação SMTP por execução da função (o lote de até 50 e-mails reaproveita). */
function smtp(): Transporte {
  if (transporte) return transporte;
  const usuario = Deno.env.get('SMTP_USUARIO');
  const senha = Deno.env.get('SMTP_SENHA_APP');
  if (!usuario || !senha) throw new Error('email_sem_configuracao');
  const porta = Number(Deno.env.get('SMTP_PORTA') ?? '465');
  if (porta === 25 || porta === 587) throw new Error('porta_bloqueada_nas_edge_functions');
  transporte = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com',
    port: porta,
    secure: true,
    auth: { user: usuario, pass: senha },
    pool: true,
    maxConnections: 1,
  });
  return transporte;
}

export async function enviarEmail(m: Mensagem): Promise<void> {
  const provedor = Deno.env.get('EMAIL_PROVEDOR') ?? 'nenhum';
  if (provedor === 'nenhum') {
    console.log(`[e-mail não enviado: EMAIL_PROVEDOR=nenhum] assunto=${m.assunto}`);
    return;
  }
  if (provedor !== 'smtp') throw new Error(`provedor_desconhecido:${provedor}`);
  const usuario = Deno.env.get('SMTP_USUARIO')!;
  // O Gmail só aceita como remetente a própria conta ou um alias configurado nela
  const remetente = Deno.env.get('EMAIL_REMETENTE') ?? `"Nexus — Prepara Portugal" <${usuario}>`;
  await smtp().sendMail({ from: remetente, to: m.para, subject: m.assunto, text: m.texto, html: m.html });
}

/** Fecha a ligação no fim do lote. */
export function encerrarEmail(): void {
  transporte?.close();
  transporte = null;
}
