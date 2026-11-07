import { Injectable, signal } from '@angular/core';
import { CriterioOrdenacao } from '../../shared/utils/ordenar';

/** Filtros da aba Projetos, guardados enquanto a sessão dura (T-69/T-70, igual ao de Tarefas). */
@Injectable({ providedIn: 'root' })
export class ProjetosFiltrosStore {
  readonly pessoaEscolhida = signal('');
  /** Ordem dos cartões de projeto. */
  readonly ordenarPor = signal<CriterioOrdenacao>('nome');

  limpar(): void {
    this.pessoaEscolhida.set('');
    this.ordenarPor.set('nome');
  }
}
