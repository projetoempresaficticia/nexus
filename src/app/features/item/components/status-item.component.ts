import { Component, input, viewChild } from '@angular/core';
import { Item } from '../../../core/models/item.model';
import { ORDEM_STATUS, STATUS_ITEM, StatusItem } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { MudarStatusComponent } from '../../../shared/ui/mudar-status.component';

/** Botões de status (FLUXOS.md §1): Bloqueada pede motivo, Aguardando pede aprovador (US-10). */
@Component({
  selector: 'app-status-item',
  imports: [MudarStatusComponent],
  template: `
    <section class="sec">
      <h3>{{ t.item.status }}</h3>
      <div class="status-set">
        @for (s of ordem; track s) {
          <button
            type="button"
            class="st-btn"
            [class]="'st-btn ' + rotulos[s].classe"
            [class.on]="item().status === s"
            [attr.aria-pressed]="item().status === s"
            [disabled]="!podeEditar()"
            (click)="escolher(s)"
          >
            {{ rotulos[s].texto }}
          </button>
        }
      </div>
    </section>
    <app-mudar-status />
  `,
})
export class StatusItemComponent {
  protected readonly t = TEXTOS;
  protected readonly ordem = ORDEM_STATUS;
  protected readonly rotulos = STATUS_ITEM;
  private readonly mudarStatus = viewChild.required(MudarStatusComponent);

  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  protected escolher(status: StatusItem): void {
    void this.mudarStatus().mudar(this.item(), status);
  }
}
