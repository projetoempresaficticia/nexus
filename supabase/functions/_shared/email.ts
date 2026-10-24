// Envio de e-mail atrás de uma única função, para trocar de provedor sem mexer no resto (API.md).
// ⚠️ A CONFIRMAR: Resend ou SMTP do Google Workspace. Hoje: EMAIL_PROVEDOR = 'resend' | 'nenhum'.
// 'nenhum' (padrão) não envia: só registra no log — seguro para o nexus-dev.

export interface Mensagem {
  para: string;
  assunto: string;
  texto: string;
  html: string;
}

export async function enviarEmail(m: Mensagem): Promise<void> {
  const provedor = Deno.env.get('EMAIL_PROVEDOR') ?? 'nenhum';
  if (provedor === 'nenhum') {
    console.log(`[e-mail não enviado: EMAIL_PROVEDOR=nenhum] para=${m.para} assunto=${m.assunto}`);
    return;
  }
  if (provedor === 'resend') return enviarResend(m);
  throw new Error(`provedor_desconhecido:${provedor}`);
}

async function enviarResend(m: Mensagem): Promise<void> {
  const chave = Deno.env.get('RESEND_API_KEY');
  const remetente = Deno.env.get('EMAIL_REMETENTE');
  if (!chave || !remetente) throw new Error('email_sem_configuracao');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: remetente, to: [m.para], subject: m.assunto, text: m.texto, html: m.html }),
  });
  if (!r.ok) throw new Error(`resend_${r.status}:${(await r.text()).slice(0, 200)}`);
}
