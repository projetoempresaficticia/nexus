import { Injectable, inject } from '@angular/core';
import { lancarSeErro } from '../../core/services/erro-api';
import { SUPABASE } from '../../core/supabase.client';

/**
 * Setores (US-05). Criar é insert direto: a RLS deixa o Adm criar em qualquer lugar e o líder só
 * abaixo de um setor que administra. Renomear, mover, (des)ativar e excluir:
 * RPCs salvar_setor/excluir_setor — o Adm em tudo, o líder nos subsetores abaixo dele (T-51b).
 */
@Injectable({ providedIn: 'root' })
export class SetoresService {
  private readonly supabase = inject(SUPABASE);

  async criar(nome: string, paiId: string | null, criadoPor: string): Promise<void> {
    const { error } = await this.supabase
      .from('setores')
      .insert({ nome: nome.trim(), pai_id: paiId, criado_por: criadoPor });
    lancarSeErro(error);
  }

  /** Só setor vazio; o banco explica o motivo quando não pode (setor_com_*). */
  async excluir(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('excluir_setor', { p_id: id });
    lancarSeErro(error);
  }

  async alterar(
    id: string,
    campos: { nome?: string; pai_id?: string | null; ativo?: boolean },
  ): Promise<void> {
    const { error } = await this.supabase.rpc('salvar_setor', {
      p: { id, ...campos, ...(campos.pai_id === null ? { pai_id: '' } : {}) },
    });
    lancarSeErro(error);
  }
}
