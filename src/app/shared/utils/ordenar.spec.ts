import { item } from '../../../testing/item';
import { ordenarItens } from './ordenar';

describe('ordenarItens', () => {
  const itens = [
    item({
      id: 'b',
      nome: 'Beta',
      prazo: '2026-12-01',
      prioridade: 'media',
      criado_em: '2026-01-02T00:00:00Z',
    }),
    item({
      id: 'a',
      nome: 'Alfa',
      prazo: '2026-11-01',
      prioridade: 'alta',
      criado_em: '2026-01-03T00:00:00Z',
    }),
    item({
      id: 'c',
      nome: 'Gama',
      prazo: null,
      prioridade: 'baixa',
      criado_em: '2026-01-01T00:00:00Z',
    }),
  ];

  it('por prazo: mais próximo primeiro, sem prazo por último', () => {
    expect(ordenarItens(itens, 'prazo').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('por prioridade: alta, média, baixa', () => {
    expect(ordenarItens(itens, 'prioridade').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('por nome: A-Z', () => {
    expect(ordenarItens(itens, 'nome').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('por criação: mais recente primeiro', () => {
    expect(ordenarItens(itens, 'recente').map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('não muda a lista original', () => {
    const original = [...itens];
    ordenarItens(itens, 'nome');
    expect(itens).toEqual(original);
  });
});
