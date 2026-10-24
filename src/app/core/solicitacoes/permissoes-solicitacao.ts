import { Tables } from '../models/database.types';

type Sol = Pick<Tables<'solicitacoes'>, 'de_id' | 'para_id' | 'status'>;

/**
 * Espelho de responder_solicitacao / cancelar_solicitacao (SEGURANCA.md §3) para esconder botões.
 * `setorItem` é null quando o item não está carregado — aí só vale ser o destinatário/autor.
 */
export function podeResponder(
  sol: Sol,
  setorItem: string | null,
  eu: string | null,
  administrados: ReadonlySet<string>,
): boolean {
  if (!eu || sol.status !== 'pendente') return false;
  return sol.para_id === eu || (!!setorItem && administrados.has(setorItem));
}

export function podeCancelar(
  sol: Sol,
  setorItem: string | null,
  eu: string | null,
  administrados: ReadonlySet<string>,
): boolean {
  if (!eu || sol.status !== 'pendente') return false;
  return sol.de_id === eu || (!!setorItem && administrados.has(setorItem));
}
