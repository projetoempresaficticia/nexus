import { sanitizar } from './html-seguro';

/** Pessoa marcada com @ num texto de uma linha (passo do checklist). */
export interface Marcada {
  id: string;
  nome: string;
}

const UUID = /^[0-9a-f-]{36}$/i;

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Texto simples + pessoas marcadas → HTML com a mesma menção do editor rico
 * (<span class="mention" data-uid>), que o banco lê para avisar (T-47). O resto do texto é escapado.
 */
export function paraHtml(texto: string, marcadas: readonly Marcada[]): string {
  let html = escapar(texto.trim());
  // Nomes mais longos primeiro e marcadores temporários: "@Ana" não pode cair dentro de "@Ana Ribeiro"
  const ordem = [...marcadas]
    .filter((m) => UUID.test(m.id))
    .sort((a, b) => b.nome.length - a.nome.length);
  ordem.forEach((m, i) => {
    html = html.split(escapar(`@${m.nome}`)).join(`${i}`);
  });
  return html.replace(/(\d+)/g, (_, i: string) => {
    const m = ordem[Number(i)];
    return `<span class="mention" data-uid="${m.id}">${escapar(`@${m.nome}`)}</span>`;
  });
}

/** O contrário de `paraHtml`, para editar um passo já salvo. */
export function deHtml(html: string): { texto: string; marcadas: Marcada[] } {
  const caixa = document.createElement('div');
  caixa.innerHTML = sanitizar(html);
  const marcadas: Marcada[] = [];
  caixa.querySelectorAll('span.mention[data-uid]').forEach((el) => {
    const id = el.getAttribute('data-uid') ?? '';
    const nome = (el.textContent ?? '').replace(/^@/, '');
    if (UUID.test(id) && !marcadas.some((m) => m.id === id)) marcadas.push({ id, nome });
  });
  return { texto: caixa.textContent ?? '', marcadas };
}
