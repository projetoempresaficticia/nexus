import { A11yModule } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';

let proximoId = 0;

/**
 * Modal do protótipo: overlay, foco preso, fecha com Esc, com o "X" ou clicando fora.
 * Corpo e botões vêm por projeção; os botões ficam em <div rodape>.
 */
@Component({
  selector: 'app-modal',
  imports: [A11yModule],
  // Clicar no fundo escuro fecha (Esc é a alternativa de teclado).
  host: { '(document:keydown.escape)': 'fechar.emit()', '(click)': 'cliqueFora($event)' },
  template: `
    <div class="overlay">
      <div
        class="modal pop"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="idTitulo"
        [style.max-width.px]="largura()"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
      >
        <div class="topo">
          <h2 [id]="idTitulo">{{ titulo() }}</h2>
          <button
            type="button"
            class="btn sm"
            (click)="fechar.emit()"
            [attr.aria-label]="t.comum.fechar"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ng-content />
        <div class="acoes"><ng-content select="[rodape]" /></div>
      </div>
    </div>
  `,
  styles: `
    .topo {
      display: flex;
      align-items: center;
    }
    .topo h2 {
      margin-right: auto;
    }
    .acoes {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .acoes:empty {
      display: none;
    }
  `,
})
export class ModalComponent {
  protected readonly t = TEXTOS;
  protected readonly idTitulo = `modal-titulo-${++proximoId}`;
  readonly titulo = input.required<string>();
  readonly largura = input(560);
  readonly fechar = output();

  protected cliqueFora(evento: MouseEvent): void {
    if ((evento.target as HTMLElement).classList.contains('overlay')) this.fechar.emit();
  }
}
