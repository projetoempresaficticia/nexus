import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast.service';
import { Evento } from '../services/realtime.service';
import { Notificacao, NotificacoesService } from './notificacoes.service';

/**
 * As notificações da pessoa logada, para o sino (T-59). Mais simples que ItensStore: sem cache local
 * entre sessões, sempre recarrega as 50 mais recentes ao abrir. Marcar como lida é otimista.
 */
@Injectable({ providedIn: 'root' })
export class NotificacoesStore {
  private readonly service = inject(NotificacoesService);
  private readonly toast = inject(ToastService);
  private readonly _lista = signal<Notificacao[]>([]);
  private readonly _carregado = signal(false);

  readonly lista = this._lista.asReadonly();
  readonly carregado = this._carregado.asReadonly();
  readonly naoLidas = computed(() => this._lista().filter((n) => !n.lido_em).length);

  async carregar(): Promise<void> {
    try {
      this._lista.set(await this.service.listar());
    } finally {
      this._carregado.set(true);
    }
  }

  /**
   * `null` = reconexão: recarrega tudo, para não perder nada enquanto esteve fora do ar. O evento
   * manda a linha crua (sem o nome do autor); busca de novo, como o ItensStore faz com os itens.
   */
  async sincronizar(e: Evento | null): Promise<void> {
    if (!e) return this.carregar();
    if (!this._carregado() || e.tipo === 'DELETE') return;
    const id = String(e.novo?.['id'] ?? '');
    if (!id) return;
    try {
      const notificacao = await this.service.obter(id);
      if (!notificacao) return;
      this._lista.update((l) => {
        const semEla = l.filter((n) => n.id !== notificacao.id);
        return [notificacao, ...semEla].sort((a, b) => b.criado_em.localeCompare(a.criado_em));
      });
    } catch {
      // ignora: a reconexão recarrega
    }
  }

  async marcarLida(id: string): Promise<void> {
    const antes = this._lista();
    if (!antes.find((n) => n.id === id && !n.lido_em)) return;
    const agora = new Date().toISOString();
    this._lista.set(antes.map((n) => (n.id === id ? { ...n, lido_em: agora } : n)));
    try {
      await this.service.marcarLida(id);
    } catch (e) {
      this._lista.set(antes);
      this.toast.erro(e);
    }
  }

  async marcarTodasLidas(): Promise<void> {
    const antes = this._lista();
    const idsNaoLidos = antes.filter((n) => !n.lido_em).map((n) => n.id);
    if (!idsNaoLidos.length) return;
    const agora = new Date().toISOString();
    this._lista.set(antes.map((n) => (n.lido_em ? n : { ...n, lido_em: agora })));
    try {
      await this.service.marcarTodasLidas(idsNaoLidos);
    } catch (e) {
      this._lista.set(antes);
      this.toast.erro(e);
    }
  }

  limpar(): void {
    this._lista.set([]);
    this._carregado.set(false);
  }
}
