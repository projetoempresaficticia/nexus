/** Utilitários de árvore para setores (e qualquer coisa com id/pai_id). */
export interface NoArvore {
  id: string;
  pai_id: string | null;
  nome: string;
}

/** Ordem de árvore (pai antes dos filhos, irmãos por nome) com a profundidade de cada nó. */
export function ordenarArvore<T extends NoArvore>(nos: readonly T[]): { no: T; nivel: number }[] {
  const ids = new Set(nos.map((n) => n.id));
  const filhos = new Map<string | null, T[]>();
  for (const n of nos) {
    const pai = n.pai_id && ids.has(n.pai_id) ? n.pai_id : null;
    filhos.set(pai, [...(filhos.get(pai) ?? []), n]);
  }
  const saida: { no: T; nivel: number }[] = [];
  const visitar = (pai: string | null, nivel: number) => {
    for (const n of [...(filhos.get(pai) ?? [])].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt'),
    )) {
      saida.push({ no: n, nivel });
      visitar(n.id, nivel + 1);
    }
  };
  visitar(null, 0);
  return saida;
}

/** O próprio id e todos os descendentes. */
export function descendentes(id: string, nos: readonly NoArvore[]): Set<string> {
  const saida = new Set([id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const n of nos) {
      if (n.pai_id && saida.has(n.pai_id) && !saida.has(n.id)) {
        saida.add(n.id);
        mudou = true;
      }
    }
  }
  return saida;
}

/** Ancestrais do id, do pai até a raiz. */
export function ancestrais<T extends NoArvore>(id: string, nos: readonly T[]): T[] {
  const porId = new Map(nos.map((n) => [n.id, n]));
  const saida: T[] = [];
  let atual = porId.get(id);
  while (atual?.pai_id && porId.has(atual.pai_id)) {
    atual = porId.get(atual.pai_id)!;
    saida.push(atual);
  }
  return saida;
}
