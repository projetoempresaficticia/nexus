import Mention from '@tiptap/extension-mention';
import { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';

export interface PessoaMencao {
  id: string;
  nome: string;
  iniciais: string;
}

/**
 * Menção gravada como <span class="mention" data-uid="…">@Nome</span> — é isso que o RPC salvar_comentario
 * lê para notificar (API.md). O popup é o #mention-pop do protótipo.
 */
export function extensaoMencao(pessoas: () => PessoaMencao[]) {
  return Mention.extend({
    parseHTML() {
      return [
        {
          tag: 'span.mention[data-uid]',
          getAttrs: (el) => ({
            id: (el as HTMLElement).getAttribute('data-uid'),
            label: ((el as HTMLElement).textContent ?? '').replace(/^@/, ''),
          }),
        },
      ];
    },
    renderHTML({ node }) {
      return [
        'span',
        { class: 'mention', 'data-uid': node.attrs['id'] },
        `@${node.attrs['label']}`,
      ];
    },
    renderText({ node }) {
      return `@${node.attrs['label']}`;
    },
  }).configure({
    suggestion: {
      items: ({ query }) => {
        const q = query.toLocaleLowerCase('pt');
        return pessoas()
          .filter((p) => p.nome.toLocaleLowerCase('pt').includes(q))
          .slice(0, 6);
      },
      command: ({ editor, range, props }) => {
        const p = props as unknown as PessoaMencao;
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            { type: 'mention', attrs: { id: p.id, label: p.nome } },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
      render: () => new PopupMencao(),
    },
  });
}

/** Popup simples em DOM (fora do Angular) para a lista de pessoas; teclado ↑ ↓ Enter Esc. */
class PopupMencao {
  private el?: HTMLDivElement;
  private props?: SuggestionProps<PessoaMencao>;
  private ativo = 0;

  onStart = (props: SuggestionProps<PessoaMencao>) => {
    this.el = document.createElement('div');
    this.el.id = 'mention-pop';
    this.el.setAttribute('role', 'listbox');
    document.body.appendChild(this.el);
    this.onUpdate(props);
  };

  onUpdate = (props: SuggestionProps<PessoaMencao>) => {
    this.props = props;
    this.ativo = 0;
    this.desenhar();
    const r = props.clientRect?.();
    if (r && this.el) {
      this.el.style.left = `${Math.min(r.left, window.innerWidth - 296)}px`;
      this.el.style.top = `${r.bottom + 6}px`;
    }
  };

  onKeyDown = ({ event }: SuggestionKeyDownProps) => {
    const n = this.props?.items.length ?? 0;
    if (event.key === 'Escape') {
      this.onExit();
      return true;
    }
    if (!n) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.ativo = (this.ativo + (event.key === 'ArrowDown' ? 1 : n - 1)) % n;
      this.desenhar();
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      this.escolher(this.ativo);
      return true;
    }
    return false;
  };

  onExit = () => {
    this.el?.remove();
    this.el = undefined;
  };

  private escolher(i: number) {
    const p = this.props?.items[i];
    if (p) this.props?.command(p as never);
  }

  private desenhar() {
    if (!this.el || !this.props) return;
    this.el.replaceChildren();
    const titulo = document.createElement('div');
    titulo.className = 'mh';
    titulo.textContent = 'Mencionar';
    this.el.appendChild(titulo);
    this.props.items.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mi' + (i === this.ativo ? ' on' : '');
      b.setAttribute('role', 'option');
      b.setAttribute('aria-selected', String(i === this.ativo));
      const av = document.createElement('span');
      av.className = 'av';
      av.textContent = p.iniciais;
      const nome = document.createElement('span');
      nome.textContent = p.nome;
      b.append(av, nome);
      b.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.escolher(i);
      });
      this.el!.appendChild(b);
    });
  }
}
