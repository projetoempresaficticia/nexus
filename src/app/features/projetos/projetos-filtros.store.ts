import { Injectable, signal } from '@angular/core';

/** Filtro por pessoa da aba Projetos, guardado enquanto a sessão dura (T-69, igual ao de Tarefas). */
@Injectable({ providedIn: 'root' })
export class ProjetosFiltrosStore {
  readonly pessoaEscolhida = signal('');

  limpar(): void {
    this.pessoaEscolhida.set('');
  }
}
