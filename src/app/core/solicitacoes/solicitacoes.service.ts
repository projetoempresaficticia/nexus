import { Injectable, inject } from '@angular/core';
import { Tables } from '../models/database.types';
import { Item } from '../models/item.model';
import { StatusSolicitacao, TipoSolicitacao } from '../models/rotulos';
import { lancarSeErro } from '../services/erro-api';
import { SUPABASE } from '../supabase.client';

export type Mensagem = Tables<'solicitacao_mensagens'>;
export type Solicitacao = Tables<'solicitacoes'> & { solicitacao_mensagens: Mensagem[] };

interface Resposta {
  solicitacao: Tables<'solicitacoes'>;
  item: Item;
}

/** Solicitações entre pessoas e setores (API.md): leitura direta (RLS) e mudanças pelos RPCs. */
@Injectable({ providedIn: 'root' })
export class SolicitacoesService {
  private readonly supabase = inject(SUPABASE);

  async listar(): Promise<Solicitacao[]> {
    const { data, error } = await this.supabase
      .from('solicitacoes')
      .select('*, solicitacao_mensagens(*)')
      .order('criado_em', { ascending: false });
    lancarSeErro(error);
    return (data ?? []) as Solicitacao[];
  }

  async obter(id: string): Promise<Solicitacao | null> {
    const { data, error } = await this.supabase
      .from('solicitacoes')
      .select('*, solicitacao_mensagens(*)')
      .eq('id', id)
      .maybeSingle();
    lancarSeErro(error);
    return data as Solicitacao | null;
  }

  async abrir(
    itemId: string,
    paraId: string,
    tipo: TipoSolicitacao,
    html: string,
  ): Promise<Resposta> {
    const { data, error } = await this.supabase.rpc('abrir_solicitacao', {
      p_item_id: itemId,
      p_para_id: paraId,
      p_tipo: tipo,
      p_texto_html: html,
    });
    lancarSeErro(error);
    return data as unknown as Resposta;
  }

  async responder(
    id: string,
    resultado: StatusSolicitacao,
    mensagemHtml?: string,
  ): Promise<Resposta> {
    const { data, error } = await this.supabase.rpc('responder_solicitacao', {
      p_id: id,
      p_resultado: resultado,
      p_mensagem_html: mensagemHtml || undefined,
    });
    lancarSeErro(error);
    return data as unknown as Resposta;
  }

  async cancelar(id: string): Promise<{ item: Item }> {
    const { data, error } = await this.supabase.rpc('cancelar_solicitacao', { p_id: id });
    lancarSeErro(error);
    return data as unknown as { item: Item };
  }

  async enviarMensagem(solicitacaoId: string, autorId: string, html: string): Promise<Mensagem> {
    const { data, error } = await this.supabase
      .from('solicitacao_mensagens')
      .insert({ solicitacao_id: solicitacaoId, autor_id: autorId, texto_html: html })
      .select()
      .single();
    lancarSeErro(error);
    return data!;
  }
}
