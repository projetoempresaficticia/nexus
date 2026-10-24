import DOMPurify from 'dompurify';

// HTML de usuário (descrições, comentários, solicitações) passa por aqui ao salvar e ao exibir (NAO_FAZER #4).
// Mesmas regras do protótipo, mas imagem só por https (nunca base64 — ERROS_CONHECIDOS).

const TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'a',
  'img',
  'ul',
  'ol',
  'li',
  'p',
  'br',
  'div',
  'h3',
  'blockquote',
  'span',
];
const ATRIBUTOS = ['href', 'src', 'alt', 'class', 'data-uid', 'data-caminho', 'target', 'rel'];
/** Imagem colada fica no bucket privado: o HTML guarda o caminho e a tela pede uma URL assinada. */
const CAMINHO_ANEXO = /^[\w-]+\/[\w-]+\/[\w.-]+$/;

let ganchosInstalados = false;

function instalarGanchos(): void {
  if (ganchosInstalados) return;
  ganchosInstalados = true;
  DOMPurify.addHook('afterSanitizeAttributes', (no) => {
    const el = no as Element;
    const tag = el.tagName;
    if (tag === 'A') {
      if (!/^(https:|mailto:)/i.test(el.getAttribute('href') ?? '')) el.removeAttribute('href');
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    } else {
      el.removeAttribute('target');
      el.removeAttribute('rel');
      el.removeAttribute('href');
    }
    if (tag === 'IMG') {
      const caminhoOk = CAMINHO_ANEXO.test(el.getAttribute('data-caminho') ?? '');
      if (!caminhoOk) el.removeAttribute('data-caminho');
      const srcOk = /^https:/i.test(el.getAttribute('src') ?? '');
      if (!srcOk) el.removeAttribute('src');
      if (!srcOk && !caminhoOk) el.remove();
    } else {
      el.removeAttribute('src');
      el.removeAttribute('alt');
      el.removeAttribute('data-caminho');
    }
    // só a pílula de menção usa class/data-uid
    const mencao =
      tag === 'SPAN' &&
      el.getAttribute('class') === 'mention' &&
      /^[\w-]+$/.test(el.getAttribute('data-uid') ?? '');
    if (!mencao) {
      el.removeAttribute('class');
      el.removeAttribute('data-uid');
    }
  });
}

/** Devolve HTML seguro: só as tags/atributos permitidos, links https/mailto abrindo em nova aba. */
export function sanitizar(html: string | null | undefined): string {
  instalarGanchos();
  return DOMPurify.sanitize(html ?? '', { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ATRIBUTOS });
}

/** Texto puro (para trechos em listas, e-mails e título de aba). */
export function textoPuro(html: string | null | undefined): string {
  const div = document.createElement('div');
  div.innerHTML = sanitizar(html);
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** HTML "vazio" do editor (só parágrafos/quebras). */
export function htmlVazio(html: string | null | undefined): boolean {
  return textoPuro(html) === '' && !/<img\s/i.test(html ?? '');
}
