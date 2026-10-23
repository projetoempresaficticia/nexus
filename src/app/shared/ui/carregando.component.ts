import { Component } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';

/** Indicador de carregamento acessível. */
@Component({
  selector: 'app-carregando',
  template: `<p class="empty" role="status" aria-live="polite">{{ t.comum.carregando }}</p>`,
  styles: `
    .empty {
      margin: 0;
    }
  `,
})
export class CarregandoComponent {
  protected readonly t = TEXTOS;
}
