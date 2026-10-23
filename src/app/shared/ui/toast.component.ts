import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Mostra o toast atual (colocado uma vez no componente raiz). */
@Component({
  selector: 'app-toast',
  template: `
    @if (toast.atual(); as t) {
      <div class="toast fade" [class.erro]="t.erro" [attr.role]="t.erro ? 'alert' : 'status'">
        {{ t.texto }}
      </div>
    }
  `,
  styles: `
    .toast.erro {
      background: var(--danger-bg);
      color: var(--danger);
      border-color: var(--danger);
    }
  `,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
