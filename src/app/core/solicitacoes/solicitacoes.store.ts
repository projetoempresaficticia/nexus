import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ToastService } from '../../shared/ui/toast.service';
import { AcessoStore } from '../auth/acesso.store';
import { ItensStore } from '../itens/itens.store';
import { StatusSolicitacao, TipoSolicitacao } from '../models/rotulos';
import { CacheLocalService } from '../services/cache-local.service';
import { Evento } from '../services/realtime.service';
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
  private readonly cache = inject(CacheLocalService);
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

  constructor() {
    effect(() => {
      const lista = this._lista();
      if (this._carregado()) this.cache.agendar('solicitacoes', lista);
    });
  }

  doItem(itemId: string): Solicitacao[] {
    return this.ordenadas().filter((s) => s.item_id === itemId);
  }

  porId(id: string): Solicitacao | undefined {
    return this._lista().find((s) => s.id === id);
  }

  async carregar(forcar = false): Promise<void> {
    if (this._carregado() && !forcar) return;
    // Retrato da última visita na hora; a lista do servidor chega logo depois (T-44)
    const retrato = this._carregado() ? null : await this.cache.ler<Solicitacao[]>('solicitacoes');
    if (retrato && !this._carregado()) {
      this._lista.set(retrato);
      this._carregado.set(true);
    }
    try {
      this._lista.set(await this.service.listar());
      this._carregado.set(true);
    } catch (e) {
      if (!retrato) this.toast.erro(e); // sem internet: fica com o retrato
    }
  }

  limpar(): void {
    this._lista.set([]);
    this._carregado.set(false);
  }

  /** Tempo real (T-43): busca a solicitação com as mensagens; mensagem nova entra direto. */
  async sincronizar(e: Evento | null): Promise<void> {
    if (!this._carregado()) return;
    if (!e) return this.carregar(true);
    if (e.tabela === 'solicitacoes') {
      const id = String((e.novo ?? e.antigo)?.['id'] ?? '');
      if (e.tipo === 'DELETE') return this._lista.update((l) => l.filter((s) => s.id !== id));
      return this.trazer(id);
    }
    const m = e.novo as Mensagem | null;
    if (!m) return;
    const sol = this.porId(m.solicitacao_id);
    if (!sol) return this.trazer(m.solicitacao_id);
    this.acrescentarMensagem(sol.id, m);
  }

  async abrir(
    itemId: string,
    paraId: string,
    tipo: TipoSolicitacao,
    html: string,
  ): Promise<boolean> {
    try {
      const r = await this.service.abrir(itemId, paraId, tipo, html);
      this._lista.update((l) => [
        { ...r.solicitacao, solicitacao_mensagens: [] },
        ...l.filter((s) => s.id !== r.solicitacao.id),
      ]);
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
        // O evento do tempo real e a resposta do insert trazem a mesma mensagem: entra uma vez.
        s.id === id && !s.solicitacao_mensagens.some((x) => x.id === m.id)
          ? { ...s, solicitacao_mensagens: [...s.solicitacao_mensagens, m] }
          : s,
      ),
    );
  }

  private async trazer(id: string): Promise<void> {
    const nova = await this.service.obter(id).catch(() => undefined);
    if (nova === undefined) return;
    this._lista.update((l) => {
      const sem = l.filter((s) => s.id !== id);
      return nova ? [nova, ...sem] : sem;
    });
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
