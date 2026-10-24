import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';
import { TEXTOS } from '../../../core/models/textos';
import { htmlVazio, sanitizar } from '../../utils/html-seguro';
import { PessoaMencao, extensaoMencao } from './mencoes';

export interface ImagemEnviada {
  src: string;
  caminho?: string;
}

/** Imagem com o caminho do bucket privado em data-caminho (a URL assinada expira; o caminho não). */
const ImagemPrivada = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caminho: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-caminho'),
        renderHTML: (a: Record<string, unknown>) =>
          a['caminho'] ? { 'data-caminho': a['caminho'] } : {},
      },
    };
  },
});

type Marca =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'link';

/**
 * Editor rico (TipTap) com a barra do protótipo: negrito, itálico, sublinhado, riscado, título, listas,
 * citação, link (popup só ao clicar), imagem, limpar formatação e @menção. Valor = HTML sanitizado.
 * Imagens só via `enviarImagem` (upload → URL https); colar imagem sem esse gancho é ignorado.
 */
@Component({
  selector: 'app-editor-rico',
  templateUrl: './editor-rico.component.html',
  styles: `
    :host {
      display: block;
    }
    .rte-ed ::ng-deep .ProseMirror {
      outline: none;
      min-height: 64px;
    }
    .rte-ed ::ng-deep p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--muted);
      float: left;
      height: 0;
      pointer-events: none;
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class EditorRicoComponent implements OnDestroy {
  protected readonly t = TEXTOS;
  readonly valor = model('');
  readonly rotulo = input('Texto');
  readonly pessoas = input<PessoaMencao[]>([]);
  /** Upload da imagem: devolve o endereço para mostrar agora e o caminho privado no Storage. */
  readonly enviarImagem = input<((arquivo: File) => Promise<ImagemEnviada>) | null>(null);

  private readonly area = viewChild.required<ElementRef<HTMLElement>>('area');
  private readonly arquivo = viewChild.required<ElementRef<HTMLInputElement>>('arquivo');
  private editor?: Editor;
  /** Muda a cada transação para a barra refletir o estado (zoneless). */
  protected readonly versao = signal(0);
  protected readonly popupLink = signal(false);
  protected readonly endereco = signal('');

  constructor() {
    afterNextRender(() => this.criar());
    // Valor trocado por fora (ex.: carregar outro item) → atualiza o editor sem perder o cursor à toa.
    effect(() => {
      const v = this.valor();
      if (this.editor && v !== this.editor.getHTML() && !(htmlVazio(v) && this.editor.isEmpty)) {
        this.editor.commands.setContent(sanitizar(v), { emitUpdate: false });
      }
    });
  }

  private criar(): void {
    this.editor = new Editor({
      element: this.area().nativeElement,
      content: sanitizar(this.valor()),
      extensions: [
        StarterKit.configure({
          heading: { levels: [3] },
          code: false,
          codeBlock: false,
          horizontalRule: false,
          link: {
            openOnClick: false,
            autolink: true,
            protocols: ['https', 'mailto'],
            defaultProtocol: 'https',
          },
        }),
        ImagemPrivada.configure({ allowBase64: false }),
        Placeholder.configure({ placeholder: () => this.rotulo() }),
        extensaoMencao(() => this.pessoas()),
      ],
      editorProps: {
        attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': this.rotulo() },
        handlePaste: (_view, evento) => {
          const imagem = [...(evento.clipboardData?.files ?? [])].find((f) =>
            f.type.startsWith('image/'),
          );
          if (!imagem) return false;
          void this.inserirImagem(imagem);
          return true;
        },
      },
      onUpdate: ({ editor }) => this.valor.set(editor.isEmpty ? '' : sanitizar(editor.getHTML())),
      onTransaction: () => this.versao.update((v) => v + 1),
    });
  }

  protected ativo(marca: Marca): boolean {
    this.versao();
    return this.editor?.isActive(marca) ?? false;
  }

  protected alternar(marca: Exclude<Marca, 'link'>): void {
    const c = this.editor?.chain().focus();
    if (!c) return;
    switch (marca) {
      case 'bold':
        return void c.toggleBold().run();
      case 'italic':
        return void c.toggleItalic().run();
      case 'underline':
        return void c.toggleUnderline().run();
      case 'strike':
        return void c.toggleStrike().run();
      case 'heading':
        return void c.toggleHeading({ level: 3 }).run();
      case 'bulletList':
        return void c.toggleBulletList().run();
      case 'orderedList':
        return void c.toggleOrderedList().run();
      case 'blockquote':
        return void c.toggleBlockquote().run();
    }
  }

  /** Link: clicar de novo num link remove; senão abre o popup do endereço. */
  protected link(): void {
    if (this.ativo('link')) {
      this.editor?.chain().focus().unsetLink().run();
      return;
    }
    this.endereco.set('');
    this.popupLink.set(true);
  }

  protected confirmarLink(): void {
    const url = this.endereco().trim();
    const valido = /^(https:\/\/|mailto:)/i.test(url)
      ? url
      : `https://${url.replace(/^\w+:\/\//, '')}`;
    if (url) this.editor?.chain().focus().extendMarkRange('link').setLink({ href: valido }).run();
    this.popupLink.set(false);
  }

  protected limpar(): void {
    this.editor?.chain().focus().unsetAllMarks().clearNodes().run();
  }

  protected escolherImagem(): void {
    this.arquivo().nativeElement.click();
  }

  protected async arquivoEscolhido(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const f = entrada.files?.[0];
    entrada.value = '';
    if (f) await this.inserirImagem(f);
  }

  private async inserirImagem(f: File): Promise<void> {
    const enviar = this.enviarImagem();
    if (!enviar) return;
    try {
      const { src, caminho } = await enviar(f);
      this.editor
        ?.chain()
        .focus()
        .insertContent({ type: 'image', attrs: { src, alt: f.name, caminho } })
        .run();
    } catch {
      // o gancho já mostrou o erro (ex.: arquivo_grande)
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
  }
}
