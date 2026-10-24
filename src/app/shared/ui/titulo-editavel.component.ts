import { Component, ElementRef, effect, input, output, signal, viewChild } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';

/**
 * Título do item (H1) que vira campo ao clicar ou no lápis; Enter ou sair do campo salva, Esc cancela;
 * vazio não é aceite (US-09, DESIGN.md `titulo-editavel`).
 */
@Component({
  selector: 'app-titulo-editavel',
  template: `
    @if (editando()) {
      <input
        #campo
        class="campo"
        maxlength="200"
        [attr.aria-label]="t.item.editarTitulo"
        [value]="rascunho()"
        (input)="rascunho.set($any($event.target).value)"
        (keydown.enter)="$event.preventDefault(); confirmar()"
        (keydown.escape)="cancelar()"
        (blur)="confirmar()"
      />
      @if (erro()) {
        <p class="erro" role="alert">{{ t.item.tituloVazio }}</p>
      }
    } @else {
      <h1>
        @if (podeEditar()) {
          <button type="button" class="texto" (click)="abrir()">{{ texto() }}</button>
          <button
            type="button"
            class="btn sm ghost lapis"
            [attr.aria-label]="t.item.editarTitulo"
            (click)="abrir()"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
        } @else {
          {{ texto() }}
        }
      </h1>
    }
  `,
  styles: `
    h1 {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .texto {
      border: 0;
      background: transparent;
      padding: 0;
      font: inherit;
      text-align: left;
      color: inherit;
      cursor: text;
    }
    .lapis {
      color: var(--muted);
    }
    .campo {
      width: 100%;
      font-family: var(--f-display);
      font-size: 30px;
      font-weight: 700;
      line-height: 1.15;
      border: 2px solid var(--accent);
      border-radius: 10px;
      padding: 2px 8px;
      background: var(--surface);
      outline: none;
    }
  `,
})
export class TituloEditavelComponent {
  protected readonly t = TEXTOS;
  readonly texto = input.required<string>();
  readonly podeEditar = input(false);
  readonly salvar = output<string>();

  protected readonly editando = signal(false);
  protected readonly rascunho = signal('');
  protected readonly erro = signal(false);
  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  constructor() {
    effect(() => this.campo()?.nativeElement.focus());
  }

  protected abrir(): void {
    this.rascunho.set(this.texto());
    this.erro.set(false);
    this.editando.set(true);
  }

  protected confirmar(): void {
    if (!this.editando()) return;
    const novo = this.rascunho().trim();
    if (!novo) {
      this.erro.set(true);
      return;
    }
    this.editando.set(false);
    if (novo !== this.texto()) this.salvar.emit(novo);
  }

  protected cancelar(): void {
    this.erro.set(false);
    this.editando.set(false);
  }
}
