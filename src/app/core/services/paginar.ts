import { PostgrestError } from '@supabase/supabase-js';
import { lancarSeErro } from './erro-api';

/** O PostgREST do Supabase devolve no máximo 1000 linhas por pedido (config.toml: max_rows). */
export const TAMANHO_PAGINA = 1000;

type Pagina<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

/**
 * Busca todas as linhas, de 1000 em 1000, até vir uma página incompleta (T-37).
 * A consulta precisa de ordem estável (termine em `.order('id')`) para nenhuma linha repetir ou faltar.
 */
export async function buscarTodas<T>(
  pagina: (de: number, ate: number) => Pagina<T>,
  tamanho = TAMANHO_PAGINA,
): Promise<T[]> {
  const saida: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await pagina(de, de + tamanho - 1);
    lancarSeErro(error);
    saida.push(...(data ?? []));
    if (!data || data.length < tamanho) return saida;
  }
}
