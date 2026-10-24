import { Item } from '../models/item.model';

/**
 * Espelho de privado.pode_editar_item no navegador: só para esconder botões.
 * Quem decide de verdade é o RPC (CLAUDE.md — o frontend nunca é a única barreira).
 */
export function podeEditarItem(
  item: Item,
  eu: string | null,
  administrados: ReadonlySet<string>,
): boolean {
  if (!eu) return false;
  return (
    administrados.has(item.setor_id) || item.criado_por === eu || item.responsaveis.includes(eu)
  );
}

/** Excluir: quem administra o setor; o criador só se o item não tem filhos (excluir_item, SEGURANCA.md §3). */
export function podeExcluirItem(
  item: Item,
  qtdFilhos: number,
  eu: string | null,
  administrados: ReadonlySet<string>,
): boolean {
  if (!eu) return false;
  return administrados.has(item.setor_id) || (item.criado_por === eu && qtdFilhos === 0);
}

/** Criar filho: ver o pai e ter vínculo/administrar o setor dele (criar_item). Contexto não conta. */
export function podeCriarFilho(pai: Item, setoresVisiveis: ReadonlySet<string>): boolean {
  return (
    pai.nivel < 2 && !pai.meu_envolvimento.includes('contexto') && setoresVisiveis.has(pai.setor_id)
  );
}
