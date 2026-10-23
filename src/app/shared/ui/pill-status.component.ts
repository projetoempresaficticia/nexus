import { Component, computed, input } from '@angular/core';
import {
  STATUS_ITEM,
  STATUS_SOLICITACAO,
  StatusItem,
  StatusSolicitacao,
  TIPO_SOLICITACAO,
  TipoSolicitacao,
} from '../../core/models/rotulos';

type Valor =
  | { tipo: 'item'; valor: StatusItem }
  | { tipo: 'solicitacao'; valor: StatusSolicitacao }
  | { tipo: 'tipo-solicitacao'; valor: TipoSolicitacao };

/** Pílula colorida de status de item, status de solicitação ou tipo de solicitação (DESIGN.md). */
@Component({
  selector: 'app-pill-status',
  template: `<span class="pill" [class]="'pill ' + rotulo().classe">{{ rotulo().texto }}</span>`,
})
export class PillStatusComponent {
  readonly status = input.required<Valor['valor']>();
  readonly tipo = input<Valor['tipo']>('item');

  protected readonly rotulo = computed(() => {
    const v = this.status();
    switch (this.tipo()) {
      case 'solicitacao':
        return STATUS_SOLICITACAO[v as StatusSolicitacao];
      case 'tipo-solicitacao':
        return TIPO_SOLICITACAO[v as TipoSolicitacao];
      default:
        return STATUS_ITEM[v as StatusItem];
    }
  });
}
