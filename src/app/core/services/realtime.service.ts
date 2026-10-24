import { DestroyRef, Injectable, Injector, inject, signal } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase.client';

/** Tabelas na publicação supabase_realtime (SCHEMA.md §Tempo real). */
export const TABELAS_TEMPO_REAL = [
  'itens',
  'item_responsaveis',
  'solicitacoes',
  'solicitacao_mensagens',
  'comentarios',
  'checklist_itens',
  'dependencias',
  'anexos',
] as const;
export type TabelaTempoReal = (typeof TABELAS_TEMPO_REAL)[number];

type Linha = Record<string, unknown>;

/**
 * Mudança vinda do banco. Em DELETE, `antigo` traz só a chave primária (a RLS não filtra exclusões,
 * por isso quem ouve só reage se já tinha aquela linha).
 */
export interface Evento {
  tabela: TabelaTempoReal;
  tipo: 'INSERT' | 'UPDATE' | 'DELETE';
  novo: Linha | null;
  antigo: Linha | null;
}

/** `null` = a ligação voltou depois de cair: recarregue o que estiver na tela. */
export type Ouvinte = (evento: Evento | null) => void;

/**
 * O evento mexe nas linhas deste item? Em DELETE só vem a chave, então confere também pelos ids
 * que a tela já mostra. `null` (reconexão) sempre conta.
 */
export function afetaItem(e: Evento | null, itemId: string, idsNaTela: string[] = []): boolean {
  if (!e) return true;
  const l = e.novo ?? e.antigo ?? {};
  if (l['item_id'] === itemId || l['depende_de_id'] === itemId) return true;
  return typeof l['id'] === 'string' && idsNaTela.includes(l['id']);
}

export type EstadoLigacao = 'desligado' | 'ligando' | 'ao_vivo' | 'reconectando';

/**
 * Um único canal Postgres Changes por sessão (ARQUITETURA.md §Tempo real). O Realtime aplica a RLS
 * de cada pessoa: só chegam eventos de linhas que ela pode ver.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  // Cliente pego só ao ligar: quem apenas ouve (componentes, testes) não precisa do Supabase.
  private readonly injector = inject(Injector);
  private readonly ouvintes = new Map<TabelaTempoReal, Set<Ouvinte>>();
  private canal: RealtimeChannel | null = null;
  private caiu = false;
  private pararAuth: (() => void) | null = null;
  private readonly _estado = signal<EstadoLigacao>('desligado');

  readonly estado = this._estado.asReadonly();

  ligar(): void {
    if (this.canal) return;
    const supabase = this.injector.get(SUPABASE);
    this._estado.set('ligando');
    this.caiu = false;
    let canal = supabase.channel('nexus');
    for (const tabela of TABELAS_TEMPO_REAL) {
      // Mensagens nunca mudam nem são apagadas (API.md).
      const event = tabela === 'solicitacao_mensagens' ? 'INSERT' : '*';
      canal = canal.on('postgres_changes', { event, schema: 'public', table: tabela }, (p) =>
        this.entregar(tabela, p),
      );
    }
    this.canal = canal.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this._estado.set('ao_vivo');
        if (this.caiu) this.avisarReconexao();
        this.caiu = false;
      } else if (this.canal) {
        // TIMED_OUT, CHANNEL_ERROR ou CLOSED sem ser no logout: o cliente tenta de novo sozinho.
        this._estado.set('reconectando');
        this.caiu = true;
      }
    });
    // SEGURANCA.md §4.1: o canal usa o JWT da sessão; renovado o token, o canal recebe o novo.
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'TOKEN_REFRESHED' && sessao)
        void supabase.realtime.setAuth(sessao.access_token);
    });
    this.pararAuth = () => data.subscription.unsubscribe();
  }

  async desligar(): Promise<void> {
    const canal = this.canal;
    this.canal = null;
    this.pararAuth?.();
    this.pararAuth = null;
    this._estado.set('desligado');
    if (canal) await this.injector.get(SUPABASE).removeChannel(canal);
  }

  /** Sem internet: mostra "Reconectando…" na hora, sem esperar o tempo limite do canal. */
  semInternet(): void {
    if (!this.canal) return;
    this._estado.set('reconectando');
    this.caiu = true;
  }

  /** Força uma recarga em quem ouve (ex.: aba em segundo plano por muito tempo). */
  avisarReconexao(): void {
    const todos = new Set([...this.ouvintes.values()].flatMap((s) => [...s]));
    for (const fn of todos) fn(null);
  }

  /** Registra um ouvinte; devolve a função que o remove. */
  ouvir(tabelas: readonly TabelaTempoReal[], fn: Ouvinte): () => void {
    for (const t of tabelas) {
      if (!this.ouvintes.has(t)) this.ouvintes.set(t, new Set());
      this.ouvintes.get(t)!.add(fn);
    }
    return () => tabelas.forEach((t) => this.ouvintes.get(t)?.delete(fn));
  }

  /** `ouvir` que se desfaz sozinho quando o componente é destruído (chamar no construtor). */
  ouvirAqui(tabelas: readonly TabelaTempoReal[], fn: Ouvinte): void {
    inject(DestroyRef).onDestroy(this.ouvir(tabelas, fn));
  }

  /** Entrada única dos eventos (pública para os testes simularem o banco). */
  entregar(tabela: TabelaTempoReal, p: RealtimePostgresChangesPayload<Linha>): void {
    const evento: Evento = {
      tabela,
      tipo: p.eventType,
      novo: p.eventType === 'DELETE' ? null : p.new,
      antigo: p.eventType === 'INSERT' ? null : (p.old as Linha),
    };
    for (const fn of this.ouvintes.get(tabela) ?? []) fn(evento);
  }
}
