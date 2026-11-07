import { Injectable, signal } from '@angular/core';
import { ORDEM_STATUS, StatusItem } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { hojeIso } from '../../shared/utils/datas';
import { CriterioOrdenacao } from '../../shared/utils/ordenar';

export type Aba = keyof typeof TEXTOS.tarefas.abas;
export type Visao = keyof typeof TEXTOS.tarefas.visoes;

/**
 * Filtros da tela Tarefas (aba, visão, pessoa, status…), guardados enquanto a sessão dura (T-69):
 * voltar de uma tarefa pro painel, ou trocar de tela e voltar, não reseta o que a pessoa escolheu.
 * Limpo no logout (ShellComponent), senão a próxima pessoa a entrar veria os filtros de quem saiu.
 */
@Injectable({ providedIn: 'root' })
export class TarefasFiltrosStore {
  readonly abaAtual = signal<Aba>('todas');
  readonly visao = signal<Visao>('lista');
  readonly soMeus = signal(false);
  /** Visões além da Lista: "Todos" ou "Só as minhas" (sou responsável). */
  readonly quem = signal<'todos' | 'minhas'>('todos');
  /** Filtro por pessoa (US-39); '' = todas. */
  readonly pessoaEscolhida = signal('');
  /** Mês/semana mostrados no calendário. */
  readonly refCalendario = signal(hojeIso());
  /** Quais status aparecem; todos marcados = sem filtro nenhum. */
  readonly status = signal<ReadonlySet<StatusItem>>(new Set(ORDEM_STATUS));
  /** Ordem da Lista e dos cartões dentro de cada coluna do Kanban (T-70). */
  readonly ordenarPor = signal<CriterioOrdenacao>('prazo');

  limpar(): void {
    this.abaAtual.set('todas');
    this.visao.set('lista');
    this.soMeus.set(false);
    this.quem.set('todos');
    this.pessoaEscolhida.set('');
    this.refCalendario.set(hojeIso());
    this.status.set(new Set(ORDEM_STATUS));
    this.ordenarPor.set('prazo');
  }
}
