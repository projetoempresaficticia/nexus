import { Component, computed, input } from '@angular/core';

/** Barra de progresso de 8px. */
@Component({
  selector: 'app-barra',
  template: `<span
    class="bar"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    [attr.aria-valuenow]="limitado()"
    ><span [style.width.%]="limitado()"></span
  ></span>`,
  styles: `
    :host {
      display: block;
    }
    .bar {
      display: block;
    }
  `,
})
export class BarraComponent {
  readonly percentual = input.required<number>();
  protected readonly limitado = computed(() =>
    Math.max(0, Math.min(100, Math.round(this.percentual()))),
  );
}
