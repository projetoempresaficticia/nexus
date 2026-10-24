import { Item } from '../../core/models/item.model';

export interface Progresso {
  concluidos: number;
  total: number;
  percentual: number;
}

/** Progresso pelos filhos diretos concluídos (projeto → tarefas; tarefa → subtarefas). Null se não tem filhos. */
export function progressoPorFilhos(filhos: readonly Item[]): Progresso | null {
  if (!filhos.length) return null;
  const concluidos = filhos.filter((f) => f.status === 'concluida').length;
  return {
    concluidos,
    total: filhos.length,
    percentual: Math.round((concluidos / filhos.length) * 100),
  };
}

/** Quantos itens abaixo estão parados (bloqueados ou aguardando aprovação). */
export function paradosAbaixo(raiz: string, todos: readonly Item[]): number {
  const abaixo = new Set([raiz]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const i of todos) {
      if (i.pai_id && abaixo.has(i.pai_id) && !abaixo.has(i.id)) {
        abaixo.add(i.id);
        mudou = true;
      }
    }
  }
  return todos.filter(
    (i) =>
      i.id !== raiz &&
      abaixo.has(i.id) &&
      (i.status === 'bloqueada' || i.status === 'aguardando_aprovacao'),
  ).length;
}
