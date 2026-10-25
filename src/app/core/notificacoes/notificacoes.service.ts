import { Injectable, inject } from '@angular/core';
import { Tables } from '../models/database.types';
import { lancarSeErro } from '../services/erro-api';
import { SUPABASE } from '../supabase.client';

/** Linha de notificacoes + o nome de quem fez a ação (join: duas FKs para perfis, por isso o hint). */
export type Notificacao = Tables<'notificacoes'> & { autor: { nome: string } | null };

const LIMITE = 50;

/** Notificações da pessoa logada (o sino, US-30/T-59). A RLS já devolve só as dela. */
@Injectable({ providedIn: 'root' })
export class NotificacoesService {
  private readonly supabase = inject(SUPABASE);

  /** As mais recentes primeiro. */
  async listar(): Promise<Notificacao[]> {
    const { data, error } = await this.supabase
      .from('notificacoes')
      .select('*, autor:perfis!notificacoes_autor_id_fkey(nome)')
      .order('criado_em', { ascending: false })
      .limit(LIMITE);
    lancarSeErro(error);
    return (data ?? []) as unknown as Notificacao[];
  }

  /** Uma só, com o autor — o tempo real manda a linha "crua" (sem join), então busca de novo. */
  async obter(id: string): Promise<Notificacao | null> {
    const { data, error } = await this.supabase
      .from('notificacoes')
      .select('*, autor:perfis!notificacoes_autor_id_fkey(nome)')
      .eq('id', id)
      .maybeSingle();
    lancarSeErro(error);
    return data as unknown as Notificacao | null;
  }

  async marcarLida(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('notificacoes')
      .update({ lido_em: new Date().toISOString() })
      .eq('id', id);
    lancarSeErro(error);
  }

  /** Só as que ainda não tinham sido lidas, para não "tocar" numa linha à toa. */
  async marcarTodasLidas(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.supabase
      .from('notificacoes')
      .update({ lido_em: new Date().toISOString() })
      .in('id', ids);
    lancarSeErro(error);
  }
}
