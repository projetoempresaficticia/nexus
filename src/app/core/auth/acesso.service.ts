import { Injectable, inject } from '@angular/core';
import { DadosIniciais } from '../models/acesso.model';
import { lancarSeErro } from '../services/erro-api';
import { SUPABASE } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class AcessoService {
  private readonly supabase = inject(SUPABASE);

  async carregarInicial(): Promise<DadosIniciais> {
    const { data, error } = await this.supabase.rpc('carregar_inicial');
    lancarSeErro(error);
    return data as unknown as DadosIniciais;
  }

  async contarSolicitacoesPendentes(perfilId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('solicitacoes')
      .select('id', { count: 'exact', head: true })
      .eq('para_id', perfilId)
      .eq('status', 'pendente');
    lancarSeErro(error);
    return count ?? 0;
  }
}
