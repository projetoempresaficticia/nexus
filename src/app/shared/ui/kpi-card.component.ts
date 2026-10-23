import { Component, input, output } from '@angular/core';

/** Cartão de KPI clicável (rótulo com bolinha, valor grande, subtítulo) — leva à lista filtrada. */
@Component({
  selector: 'app-kpi-card',
  template: `
    <button type="button" class="kpi" (click)="abrir.emit()">
      <span class="kpi-l"><span class="dot" [style.background]="cor()"></span>{{ rotulo() }}</span>
      <span class="kpi-v">{{ valor() }}</span>
      <span class="row-sub">{{ subtitulo() }}</span>
    </button>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class KpiCardComponent {
  readonly rotulo = input.required<string>();
  readonly valor = input.required<number | string>();
  readonly subtitulo = input('');
  readonly cor = input('var(--accent)');
  readonly abrir = output();
}
