import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Marcada, deHtml, paraHtml } from '../utils/mencoes-texto';
import { PessoaMencao } from './editor-rico/mencoes';

/**
 * Campo de uma linha com @menção (passos do checklist, T-47). Mais leve que o editor rico:
 * digitar "@" abre a lista de pessoas (↑ ↓ Enter/Tab, Esc). `valor` é HTML com <span class="mention">.
 */
@Component({
  selector: 'app-campo-mencao',
  host: { class: 'campo-mencao' },
  template: `
    <input
      #campo
      type="text"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      [attr.aria-expanded]="sugestoes().length > 0"
      [attr.aria-controls]="sugestoes().length ? 'mention-pop' : null"
      [attr.aria-label]="rotulo()"
      [placeholder]="rotulo()"
      [value]="texto()"
      (input)="digitou($any($event.target))"
      (keydown)="tecla($event)"
      (blur)="saiu.emit()"
    />
    @if (sugestoes().length) {
      <div
        id="mention-pop"
        role="listbox"
        [style.left.px]="posicao().left"
        [style.top.px]="posicao().top"
      >
        <div class="mh">Mencionar</div>
        @for (p of sugestoes(); track p.id; let i = $index) {
          <button
            type="button"
            class="mi"
            role="option"
            [class.on]="i === ativo()"
            [attr.aria-selected]="i === ativo()"
            (mousedown)="$event.preventDefault(); escolher(p)"
          >
            <span class="av">{{ p.iniciais }}</span
            ><span>{{ p.nome }}</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      flex: 1;
      min-width: 0;
    }
    input {
      width: 100%;
      height: 40px;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0 12px;
      background: var(--surface);
    }
  `,
})
export class CampoMencaoComponent {
  readonly valor = model('');
  readonly pessoas = input<PessoaMencao[]>([]);
  readonly rotulo = input('');
  readonly focar = input(false);
  /** Enter com a lista fechada. */
  readonly enviar = output();
  /** Esc com a lista fechada. */
  readonly cancelar = output();
  readonly saiu = output();

  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>('campo');
  protected readonly texto = signal('');
  private marcadas: Marcada[] = [];
  private emitido = '';
  /** Texto depois do "@" que está sendo digitado (null = lista fechada). */
  private readonly consulta = signal<string | null>(null);
  protected readonly ativo = signal(0);
  protected readonly posicao = signal({ left: 0, top: 0 });

  protected readonly sugestoes = computed(() => {
    const q = this.consulta();
    if (q === null) return [];
    const termo = q.toLocaleLowerCase('pt');
    return this.pessoas()
      .filter((p) => p.nome.toLocaleLowerCase('pt').includes(termo))
      .slice(0, 6);
  });

  constructor() {
    // Valor vindo de fora (limpar depois de salvar, editar um passo existente)
    effect(() => {
      const v = this.valor();
      if (v === this.emitido) return;
      const { texto, marcadas } = deHtml(v);
      this.texto.set(texto);
      this.marcadas = marcadas;
      this.emitido = v;
      this.consulta.set(null);
    });
    effect(() => {
      if (this.focar()) this.campo().nativeElement.focus();
    });
  }

  protected digitou(el: HTMLInputElement): void {
    this.texto.set(el.value);
    this.emitir();
    const antes = el.value.slice(0, el.selectionStart ?? el.value.length);
    const m = /(?:^|\s)@([^@\n]{0,30})$/.exec(antes);
    this.consulta.set(m ? m[1] : null);
    this.ativo.set(0);
    if (m) {
      const r = el.getBoundingClientRect();
      this.posicao.set({ left: Math.min(r.left, window.innerWidth - 296), top: r.bottom + 6 });
    }
  }

  protected tecla(e: KeyboardEvent): void {
    const n = this.sugestoes().length;
    if (n && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      this.ativo.update((a) => (a + (e.key === 'ArrowDown' ? 1 : n - 1)) % n);
    } else if (n && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      this.escolher(this.sugestoes()[this.ativo()]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (n) this.consulta.set(null);
      else this.cancelar.emit();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.enviar.emit();
    }
  }

  protected escolher(p: PessoaMencao): void {
    const el = this.campo().nativeElement;
    const fim = el.selectionStart ?? el.value.length;
    const antes = el.value.slice(0, fim).replace(/@([^@\n]{0,30})$/, `@${p.nome} `);
    const texto = antes + el.value.slice(fim);
    if (!this.marcadas.some((m) => m.id === p.id)) this.marcadas.push({ id: p.id, nome: p.nome });
    this.texto.set(texto);
    el.value = texto;
    el.setSelectionRange(antes.length, antes.length);
    this.consulta.set(null);
    this.emitir();
  }

  private emitir(): void {
    // Só fica a marcação de quem ainda aparece no texto
    this.marcadas = this.marcadas.filter((m) => this.texto().includes(`@${m.nome}`));
    this.emitido = paraHtml(this.texto(), this.marcadas);
    this.valor.set(this.emitido);
  }
}
