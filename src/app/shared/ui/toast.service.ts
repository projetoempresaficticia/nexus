import { Injectable, signal } from '@angular/core';
import { ErroApi } from '../../core/services/erro-api';
import { TEXTOS } from '../../core/models/textos';

export interface Toast {
  texto: string;
  erro: boolean;
}

/** Mensagens curtas no rodapé da tela (sucesso ou erro). Uma por vez; somem sozinhas. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _atual = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  readonly atual = this._atual.asReadonly();

  sucesso(texto: string): void {
    this.mostrar({ texto, erro: false });
  }

  /** Erro da API (código → texto do glossário) ou erro inesperado (mensagem genérica de rede). */
  erro(e: unknown): void {
    this.mostrar({ texto: e instanceof ErroApi ? e.message : TEXTOS.erros.rede, erro: true });
  }

  fechar(): void {
    clearTimeout(this.timer);
    this._atual.set(null);
  }

  private mostrar(toast: Toast): void {
    clearTimeout(this.timer);
    this._atual.set(toast);
    this.timer = setTimeout(() => this._atual.set(null), toast.erro ? 6000 : 3500);
  }
}
