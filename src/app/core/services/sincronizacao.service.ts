import { DOCUMENT, Injectable, inject } from '@angular/core';
import { AcessoStore } from '../auth/acesso.store';
import { ItensStore } from '../itens/itens.store';
import { NotificacoesStore } from '../notificacoes/notificacoes.store';
import { SolicitacoesStore } from '../solicitacoes/solicitacoes.store';
import { RealtimeService } from './realtime.service';

/** Aba em segundo plano por mais que isto: recarga silenciosa ao voltar (ARQUITETURA.md §Tempo real). */
const MAX_ESCONDIDO_MS = 10 * 60_000;

/**
 * Liga o canal de tempo real às stores globais. Começa quando o shell abre (pessoa com acesso)
 * e para quando ele fecha (logout). Os blocos do item ouvem o RealtimeService por conta própria.
 */
@Injectable({ providedIn: 'root' })
export class SincronizacaoService {
  private readonly realtime = inject(RealtimeService);
  private readonly itens = inject(ItensStore);
  private readonly solicitacoes = inject(SolicitacoesStore);
  private readonly notificacoes = inject(NotificacoesStore);
  private readonly acesso = inject(AcessoStore);
  private readonly documento = inject(DOCUMENT);
  private desfazer: (() => void)[] = [];
  private escondidoDesde: number | null = null;

  iniciar(): void {
    if (this.desfazer.length) return;
    this.desfazer = [
      this.realtime.ouvir(['itens', 'item_responsaveis'], (e) => void this.itens.sincronizar(e)),
      this.realtime.ouvir(['solicitacoes', 'solicitacao_mensagens'], (e) => {
        void this.solicitacoes.sincronizar(e);
        if (!e || e.tabela === 'solicitacoes') void this.acesso.recontarPendentes();
      }),
      this.realtime.ouvir(['notificacoes'], (e) => void this.notificacoes.sincronizar(e)),
      this.escutar(this.documento.defaultView, 'offline', () => this.realtime.semInternet()),
      this.escutar(this.documento, 'visibilitychange', () => this.mudouVisibilidade()),
    ];
    this.realtime.ligar();
  }

  async parar(): Promise<void> {
    this.desfazer.forEach((f) => f());
    this.desfazer = [];
    await this.realtime.desligar();
  }

  private mudouVisibilidade(): void {
    if (this.documento.visibilityState === 'hidden') {
      this.escondidoDesde = Date.now();
      return;
    }
    const tempo = this.escondidoDesde === null ? 0 : Date.now() - this.escondidoDesde;
    this.escondidoDesde = null;
    if (tempo > MAX_ESCONDIDO_MS) this.realtime.avisarReconexao();
  }

  private escutar(alvo: EventTarget | null, evento: string, fn: () => void): () => void {
    alvo?.addEventListener(evento, fn);
    return () => alvo?.removeEventListener(evento, fn);
  }
}
