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

/** Todos os ids abaixo de `raiz` na árvore de itens (filhos, netos...), sem incluir a própria raiz. */
function idsAbaixo(raiz: string, todos: readonly Item[]): Set<string> {
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
  abaixo.delete(raiz);
  return abaixo;
}

/** Quantos itens abaixo estão parados (bloqueados ou aguardando aprovação). */
export function paradosAbaixo(raiz: string, todos: readonly Item[]): number {
  const abaixo = idsAbaixo(raiz, todos);
  return todos.filter(
    (i) => abaixo.has(i.id) && (i.status === 'bloqueada' || i.status === 'aguardando_aprovacao'),
  ).length;
}

/** Se alguém é responsável por algum item abaixo de `raiz` (ex.: projeto → tarefas → subtarefas). */
export function ehResponsavelAbaixo(raiz: string, pessoa: string, todos: readonly Item[]): boolean {
  const abaixo = idsAbaixo(raiz, todos);
  return todos.some((i) => abaixo.has(i.id) && i.responsaveis.includes(pessoa));
}
