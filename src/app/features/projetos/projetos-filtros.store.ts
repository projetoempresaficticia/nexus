import { Injectable, signal } from '@angular/core';
import { ORDEM_STATUS, StatusItem } from '../../core/models/rotulos';
import { CriterioOrdenacao } from '../../shared/utils/ordenar';

/** Filtros da aba Projetos, guardados enquanto a sessão dura (T-69/T-70, igual ao de Tarefas). */
@Injectable({ providedIn: 'root' })
export class ProjetosFiltrosStore {
  readonly pessoaEscolhida = signal('');
  /** Ordem dos cartões de projeto. */
  readonly ordenarPor = signal<CriterioOrdenacao>('nome');
  /** Filtro por status do projeto (T-72); todos marcados = sem filtro nenhum. */
  readonly status = signal<ReadonlySet<StatusItem>>(new Set(ORDEM_STATUS));

  limpar(): void {
    this.pessoaEscolhida.set('');
    this.ordenarPor.set('nome');
    this.status.set(new Set(ORDEM_STATUS));
  }
}
