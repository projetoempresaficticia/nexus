import { ancestrais, descendentes, ordenarArvore } from './arvore';

const nos = [
  { id: 'b', nome: 'Beta', pai_id: null },
  { id: 'a', nome: 'Alfa', pai_id: null },
  { id: 'a2', nome: 'Zeta', pai_id: 'a' },
  { id: 'a1', nome: 'Gama', pai_id: 'a' },
  { id: 'a1x', nome: 'Delta', pai_id: 'a1' },
];

describe('arvore', () => {
  it('ordena pai antes dos filhos, irmãos por nome, com nível', () => {
    expect(ordenarArvore(nos).map(({ no, nivel }) => `${nivel}:${no.id}`)).toEqual([
      '0:a',
      '1:a1',
      '2:a1x',
      '1:a2',
      '0:b',
    ]);
  });

  it('nó cujo pai não está na lista vira raiz', () => {
    expect(ordenarArvore([nos[3]]).map(({ nivel }) => nivel)).toEqual([0]);
  });

  it('descendentes inclui o próprio', () => {
    expect([...descendentes('a', nos)].sort()).toEqual(['a', 'a1', 'a1x', 'a2']);
  });

  it('ancestrais vão do pai até a raiz', () => {
    expect(ancestrais('a1x', nos).map((n) => n.id)).toEqual(['a1', 'a']);
  });
});
