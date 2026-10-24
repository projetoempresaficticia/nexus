import { Injectable, computed, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast.service';
import { AcessoStore } from '../auth/acesso.store';
import { ItensStore } from '../itens/itens.store';
import { StatusSolicitacao, TipoSolicitacao } from '../models/rotulos';
import { Mensagem, Solicitacao, SolicitacoesService } from './solicitacoes.service';

/**
 * Solicitações em cache. Cada RPC devolve também o item (o status dele muda junto) — a store atualiza
 * o ItensStore e o contador do menu (US-15..US-17).
 */
@Injectable({ providedIn: 'root' })
export class SolicitacoesStore {
  private readonly service = inject(SolicitacoesService);
  private readonly itens = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly _lista = signal<Solicitacao[]>([]);
  private readonly _carregado = signal(false);

  readonly lista = this._lista.asReadonly();
  readonly carregado = this._carregado.asReadonly();
  /** Pendentes, primeiro; depois as mais recentes. */
  readonly ordenadas = computed(() =>
    [...this._lista()].sort(
      (a, b) =>
        Number(b.status === 'pendente') - Number(a.status === 'pendente') ||
        b.criado_em.localeCompare(a.criado_em),
    ),
  );

  doItem(itemId: string): Solicitacao[] {
    return this.ordenadas().filter((s) => s.item_id === itemId);
  }

  porId(id: string): Solicitacao | undefined {
    return this._lista().find((s) => s.id === id);
  }

  async carregar(forcar = false): Promise<void> {
    if (this._carregado() && !forcar) return;
    try {
      this._lista.set(await this.service.listar());
      this._carregado.set(true);
    } catch (e) {
      this.toast.erro(e);
    }
  }

  async abrir(
    itemId: string,
    paraId: string,
    tipo: TipoSolicitacao,
    html: string,
  ): Promise<boolean> {
    try {
      const r = await this.service.abrir(itemId, paraId, tipo, html);
      this._lista.update((l) => [{ ...r.solicitacao, solicitacao_mensagens: [] }, ...l]);
      this.itens.aplicar(r.item);
      return true;
    } catch (e) {
      this.toast.erro(e);
      return false;
    }
  }

  async responder(
    id: string,
    resultado: StatusSolicitacao,
    mensagemHtml?: string,
  ): Promise<boolean> {
    const antes = this.porId(id);
    try {
      const r = await this.service.responder(id, resultado, mensagemHtml);
      await this.recarregarUma(id, r.solicitacao);
      this.itens.aplicar(r.item);
      if (antes?.para_id === this.acesso.perfil()?.id) this.acesso.incrementarPendentes(-1);
      return true;
    } catch (e) {
      this.toast.erro(e);
      return false;
    }
  }

  async cancelar(id: string): Promise<boolean> {
    try {
      const r = await this.service.cancelar(id);
      this._lista.update((l) => l.filter((s) => s.id !== id));
      this.itens.aplicar(r.item);
      return true;
    } catch (e) {
      this.toast.erro(e);
      return false;
    }
  }

  async enviarMensagem(id: string, html: string): Promise<boolean> {
    const eu = this.acesso.perfil()?.id;
    if (!eu) return false;
    try {
      const m = await this.service.enviarMensagem(id, eu, html);
      this.acrescentarMensagem(id, m);
      return true;
    } catch (e) {
      this.toast.erro(e);
      return false;
    }
  }

  private acrescentarMensagem(id: string, m: Mensagem): void {
    this._lista.update((l) =>
      l.map((s) =>
        s.id === id ? { ...s, solicitacao_mensagens: [...s.solicitacao_mensagens, m] } : s,
      ),
    );
  }

  /** Depois de responder, a mensagem e o status vêm do servidor. */
  private async recarregarUma(
    id: string,
    linha: Omit<Solicitacao, 'solicitacao_mensagens'>,
  ): Promise<void> {
    const nova = await this.service.obter(id).catch(() => null);
    this._lista.update((l) => l.map((s) => (s.id === id ? (nova ?? { ...s, ...linha }) : s)));
  }
}
