import { Injectable, inject } from '@angular/core';
import { buscarTodas } from '../../core/services/paginar';
import { SUPABASE } from '../../core/supabase.client';
import { somarDias } from '../../shared/utils/datas';
import { Entrega } from './produtividade.calculos';

const DIA_LISBOA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Entregas (vw_produtividade: item concluído × responsável) dos setores pedidos, a partir de uma data. */
@Injectable({ providedIn: 'root' })
export class ProdutividadeService {
  private readonly supabase = inject(SUPABASE);

  async listar(setores: string[], desde: string): Promise<Entrega[]> {
    if (!setores.length) return [];
    const data = await buscarTodas((de, ate) =>
      this.supabase
        .from('vw_produtividade')
        .select('*')
        .in('setor_id', setores)
        // um dia de folga por causa do fuso; o corte exato é feito em Lisboa abaixo
        .gte('concluido_em', `${somarDias(desde, -1)}T00:00:00Z`)
        .order('item_id')
        .order('perfil_id')
        .range(de, ate),
    );
    return data
      .filter((r) => r.item_id && r.perfil_id && r.setor_id && r.concluido_em)
      .map((r) => ({
        item_id: r.item_id!,
        perfil_id: r.perfil_id!,
        setor_id: r.setor_id!,
        nome: r.nome ?? '',
        prazo: r.prazo,
        concluido: DIA_LISBOA.format(new Date(r.concluido_em!)),
        dias_ciclo: r.dias_ciclo,
        no_prazo: r.no_prazo ?? true,
        dias_parado_total: Number(r.dias_parado_total ?? 0),
      }))
      .filter((e) => e.concluido >= desde);
  }
}
