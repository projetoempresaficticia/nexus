import { Injectable, inject } from '@angular/core';
import { Tables } from '../../core/models/database.types';
import { lancarSeErro } from '../../core/services/erro-api';
import { SUPABASE } from '../../core/supabase.client';

export type PassoChecklist = Tables<'checklist_itens'>;
export type Comentario = Tables<'comentarios'>;
export interface Dependencia {
  item_id: string;
  depende_de_id: string;
}

/** Dados da página do item além do próprio item: checklist e dependências (US-11, US-12). */
@Injectable({ providedIn: 'root' })
export class ItemService {
  private readonly supabase = inject(SUPABASE);

  async listarChecklist(itemId: string): Promise<PassoChecklist[]> {
    const { data, error } = await this.supabase
      .from('checklist_itens')
      .select('*')
      .eq('item_id', itemId)
      .order('ordem');
    lancarSeErro(error);
    return data ?? [];
  }

  async adicionarPasso(itemId: string, texto: string, ordem: number): Promise<PassoChecklist> {
    const { data, error } = await this.supabase
      .from('checklist_itens')
      .insert({ item_id: itemId, texto, ordem })
      .select()
      .single();
    lancarSeErro(error);
    return data!;
  }

  async marcarPasso(id: string, feito: boolean): Promise<void> {
    const { error } = await this.supabase.from('checklist_itens').update({ feito }).eq('id', id);
    lancarSeErro(error);
  }

  async removerPasso(id: string): Promise<void> {
    const { error } = await this.supabase.from('checklist_itens').delete().eq('id', id);
    lancarSeErro(error);
  }

  /** Dependências em que o item espera alguém ou é esperado. */
  async listarDependencias(itemId: string): Promise<Dependencia[]> {
    const { data, error } = await this.supabase
      .from('dependencias')
      .select('item_id, depende_de_id')
      .or(`item_id.eq.${itemId},depende_de_id.eq.${itemId}`);
    lancarSeErro(error);
    return data ?? [];
  }

  async listarComentarios(itemId: string): Promise<Comentario[]> {
    const { data, error } = await this.supabase
      .from('comentarios')
      .select('*')
      .eq('item_id', itemId)
      .order('criado_em');
    lancarSeErro(error);
    return data ?? [];
  }

  /** Novo (id nulo) ou edição (só o autor); o RPC grava as menções e notifica (API.md). */
  async salvarComentario(id: string | null, itemId: string, html: string): Promise<Comentario> {
    const { data, error } = await this.supabase.rpc('salvar_comentario', {
      p_id: id as string,
      p_item_id: itemId,
      p_texto_html: html,
    });
    lancarSeErro(error);
    return data as Comentario;
  }

  /** A RLS deixa apagar o autor ou quem administra o setor do item. */
  async apagarComentario(id: string): Promise<void> {
    const { error } = await this.supabase.from('comentarios').delete().eq('id', id);
    lancarSeErro(error);
  }

  async definirDependencia(itemId: string, dependeDeId: string, ligar: boolean): Promise<void> {
    const { error } = await this.supabase.rpc('definir_dependencia', {
      p_item: itemId,
      p_depende_de: dependeDeId,
      p_ligar: ligar,
    });
    lancarSeErro(error);
  }
}
