import { Injectable, signal } from '@angular/core';

export interface PedidoConfirmacao {
  titulo: string;
  mensagem: string;
  confirmar: string;
  perigo?: boolean;
}

/** Pergunta "tem a certeza?" num modal e devolve a resposta (ex.: exclusão em cascata, US-13). */
@Injectable({ providedIn: 'root' })
export class ConfirmacaoService {
  private readonly _pedido = signal<PedidoConfirmacao | null>(null);
  private resolver?: (ok: boolean) => void;
  readonly pedido = this._pedido.asReadonly();

  perguntar(pedido: PedidoConfirmacao): Promise<boolean> {
    this.resolver?.(false);
    this._pedido.set(pedido);
    return new Promise((resolve) => (this.resolver = resolve));
  }

  responder(ok: boolean): void {
    this._pedido.set(null);
    this.resolver?.(ok);
    this.resolver = undefined;
  }
}
