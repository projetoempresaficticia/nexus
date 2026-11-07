import { TestBed } from '@angular/core/testing';
import { ORDEM_STATUS } from '../../core/models/rotulos';
import { TarefasFiltrosStore } from './tarefas-filtros.store';

describe('TarefasFiltrosStore', () => {
  it('começa com todos os status marcados (sem filtro nenhum)', () => {
    const store = TestBed.inject(TarefasFiltrosStore);
    expect(store.status().size).toBe(ORDEM_STATUS.length);
  });

  it('limpar() volta tudo ao padrão (logout, T-69)', () => {
    const store = TestBed.inject(TarefasFiltrosStore);
    store.abaAtual.set('concluidas');
    store.visao.set('kanban');
    store.soMeus.set(true);
    store.quem.set('minhas');
    store.pessoaEscolhida.set('p-bruno');
    store.status.set(new Set(['a_fazer']));
    store.ordenarPor.set('nome');

    store.limpar();

    expect(store.abaAtual()).toBe('todas');
    expect(store.visao()).toBe('lista');
    expect(store.soMeus()).toBe(false);
    expect(store.quem()).toBe('todos');
    expect(store.pessoaEscolhida()).toBe('');
    expect(store.status().size).toBe(ORDEM_STATUS.length);
    expect(store.ordenarPor()).toBe('prazo');
  });
});
