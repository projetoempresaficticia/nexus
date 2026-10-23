import { Component, inject } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';
import { ConfirmacaoService } from './confirmacao.service';
import { ModalComponent } from './modal.component';

/** Modal de confirmação (colocado uma vez no componente raiz). */
@Component({
  selector: 'app-confirmacao',
  imports: [ModalComponent],
  template: `
    @if (confirmacao.pedido(); as p) {
      <app-modal [titulo]="p.titulo" [largura]="460" (fechar)="confirmacao.responder(false)">
        <p class="msg">{{ p.mensagem }}</p>
        <button rodape type="button" class="btn" (click)="confirmacao.responder(false)">
          {{ t.comum.cancelar }}
        </button>
        <button
          rodape
          type="button"
          class="btn"
          [class.danger]="p.perigo"
          [class.primary]="!p.perigo"
          (click)="confirmacao.responder(true)"
        >
          {{ p.confirmar }}
        </button>
      </app-modal>
    }
  `,
  styles: `
    .msg {
      margin: 0;
    }
  `,
})
export class ConfirmacaoComponent {
  protected readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;
}
