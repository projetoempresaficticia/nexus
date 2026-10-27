import { item } from '../../../testing/item';
import { ehResponsavelAbaixo } from './progresso';

describe('ehResponsavelAbaixo', () => {
  it('acha a pessoa numa subtarefa, dois níveis abaixo do projeto', () => {
    const todos = [
      item({ id: 'projeto', nivel: 0 }),
      item({ id: 'tarefa', nivel: 1, pai_id: 'projeto' }),
      item({ id: 'subtarefa', nivel: 2, pai_id: 'tarefa', responsaveis: ['ana'] }),
    ];
    expect(ehResponsavelAbaixo('projeto', 'ana', todos)).toBe(true);
    expect(ehResponsavelAbaixo('projeto', 'bruno', todos)).toBe(false);
  });

  it('não considera a própria raiz, só quem está abaixo dela', () => {
    const todos = [item({ id: 'projeto', nivel: 0, responsaveis: ['ana'] })];
    expect(ehResponsavelAbaixo('projeto', 'ana', todos)).toBe(false);
  });
});
