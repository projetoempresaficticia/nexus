import { Injectable, inject } from '@angular/core';
import { CamposEditaveis, Item, NovoItem } from '../models/item.model';
import { StatusItem } from '../models/rotulos';
import { lancarSeErro } from '../services/erro-api';
import { buscarTodas } from '../services/paginar';
import { SUPABASE } from '../supabase.client';

export interface ResultadoStatus {
  item: Item;
  novo_item_recorrente: Item | null;
}

export interface ResultadoExclusao {
  apagados: number;
  caminhos_storage: string[];
}

/** Leitura e escrita de itens (API.md). A RLS já devolve só o que a pessoa pode ver. */
@Injectable({ providedIn: 'root' })
export class ItensService {
  private readonly supabase = inject(SUPABASE);

  /** Todos os itens visíveis, em páginas de 1000 (o PostgREST corta acima disso). */
  async listar(): Promise<Item[]> {
    const itens = await buscarTodas((de, ate) =>
      this.supabase
        .from('vw_itens')
        .select('*')
        .order('ordem')
        .order('criado_em')
        .order('id')
        .range(de, ate),
    );
    return itens as unknown as Item[];
  }

  async obter(id: string): Promise<Item | null> {
    const { data, error } = await this.supabase
      .from('vw_itens')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    lancarSeErro(error);
    return data as unknown as Item | null;
  }

  async criar(novo: NovoItem): Promise<Item> {
    const { data, error } = await this.supabase.rpc('criar_item', { p: novo as never });
    lancarSeErro(error);
    return data as unknown as Item;
  }

  async atualizar(id: string, campos: CamposEditaveis): Promise<Item> {
    const { data, error } = await this.supabase.rpc('atualizar_item', {
      p_id: id,
      p_campos: campos as never,
    });
    lancarSeErro(error);
    return data as unknown as Item;
  }

  async mudarStatus(
    id: string,
    status: StatusItem,
    motivoHtml?: string | null,
    aprovadorId?: string | null,
  ): Promise<ResultadoStatus> {
    const { data, error } = await this.supabase.rpc('mudar_status', {
      p_id: id,
      p_status: status,
      p_motivo_html: motivoHtml ?? undefined,
      p_aprovador_id: aprovadorId ?? undefined,
    });
    lancarSeErro(error);
    return data as unknown as ResultadoStatus;
  }

  async definirResponsaveis(id: string, perfis: string[]): Promise<string[]> {
    const { data, error } = await this.supabase.rpc('definir_responsaveis', {
      p_item: id,
      p_perfis: perfis,
    });
    lancarSeErro(error);
    return (data ?? []) as string[];
  }

  async contarDescendentes(id: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('contar_descendentes', { p_id: id });
    lancarSeErro(error);
    return data ?? 0;
  }

  async excluir(id: string): Promise<ResultadoExclusao> {
    const { data, error } = await this.supabase.rpc('excluir_item', { p_id: id });
    lancarSeErro(error);
    return data as unknown as ResultadoExclusao;
  }
}
