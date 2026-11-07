import { Item } from '../../core/models/item.model';
import { ORDEM_PRIORIDADE } from '../../core/models/rotulos';

export type CriterioOrdenacao = 'prazo' | 'prioridade' | 'nome' | 'recente';

const PESO_PRIORIDADE = Object.fromEntries(ORDEM_PRIORIDADE.map((p, i) => [p, i]));

/** Ordena uma lista de itens pelo critério escolhido (T-70); não muda a lista original. */
export function ordenarItens(itens: readonly Item[], criterio: CriterioOrdenacao): Item[] {
  const copia = [...itens];
  switch (criterio) {
    case 'prazo':
      return copia.sort((a, b) => (a.prazo ?? '9999-99-99').localeCompare(b.prazo ?? '9999-99-99'));
    case 'prioridade':
      return copia.sort((a, b) => PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade]);
    case 'nome':
      return copia.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    case 'recente':
      return copia.sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  }
}
