import { Injectable, inject } from '@angular/core';
import { Tables } from '../../core/models/database.types';
import { VinculoResumo } from '../../core/models/acesso.model';
import { StatusItem } from '../../core/models/rotulos';
import { lancarSeErro } from '../../core/services/erro-api';
import { SUPABASE } from '../../core/supabase.client';

export type Usuario = Pick<
  Tables<'perfis'>,
  | 'id'
  | 'nome'
  | 'email'
  | 'iniciais'
  | 'ativo'
  | 'is_admin'
  | 'desativado_em'
  | 'receber_email_notificacoes'
> & { vinculos: VinculoResumo[] };

/** Item aberto de quem foi desativado (resposta de desativar_usuario). */
export interface ItemAberto {
  id: string;
  nome: string;
  nivel: number;
  setor_id: string;
  prazo: string | null;
  status: StatusItem;
}

/** Pessoas e vínculos (só o Adm: a RLS deixa ver inativos e todos os vínculos; RPCs exigem admin). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly supabase = inject(SUPABASE);

  async listar(): Promise<Usuario[]> {
    const { data, error } = await this.supabase
      .from('perfis')
      .select(
        'id, nome, email, iniciais, ativo, is_admin, desativado_em, receber_email_notificacoes, vinculos(setor_id, papel)',
      )
      .order('nome');
    lancarSeErro(error);
    return (data ?? []) as Usuario[];
  }

  async cadastrar(email: string, nome: string, vinculos: VinculoResumo[]): Promise<void> {
    const { error } = await this.supabase.rpc('cadastrar_usuario', {
      p_email: email,
      p_nome: nome,
      p_vinculos: vinculos as never,
    });
    lancarSeErro(error);
  }

  async salvarVinculos(id: string, vinculos: VinculoResumo[]): Promise<void> {
    const { error } = await this.supabase.rpc('salvar_vinculos', {
      p_perfil_id: id,
      p_vinculos: vinculos as never,
    });
    lancarSeErro(error);
  }

  async desativar(id: string): Promise<ItemAberto[]> {
    const { data, error } = await this.supabase.rpc('desativar_usuario', { p_id: id });
    lancarSeErro(error);
    return (data ?? []) as unknown as ItemAberto[];
  }

  async reativar(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('reativar_usuario', { p_id: id });
    lancarSeErro(error);
  }

  /** O Adm muda o e-mail de notificações de uma pessoa (T-60); cada um também muda o seu, pelo sino. */
  async atualizarPreferenciaEmail(id: string, valor: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('perfis')
      .update({ receber_email_notificacoes: valor })
      .eq('id', id);
    lancarSeErro(error);
  }

  /** Liga/desliga o e-mail de notificações para todas as pessoas ativas de uma vez. */
  async atualizarPreferenciaEmailTodos(valor: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('perfis')
      .update({ receber_email_notificacoes: valor })
      .eq('ativo', true);
    lancarSeErro(error);
  }

  /** Todos os itens abertos de `de` passam para `para`. Devolve quantos. */
  async reatribuir(de: string, para: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('reatribuir_itens', { p_de: de, p_para: para });
    lancarSeErro(error);
    return data ?? 0;
  }
}
