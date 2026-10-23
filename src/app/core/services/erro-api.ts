import { PostgrestError } from '@supabase/supabase-js';
import { textoErro } from '../models/textos';

/** Erro de regra devolvido por RPC (errcode P0001, mensagem = código da API.md) ou de rede. */
export class ErroApi extends Error {
  constructor(readonly codigo: string) {
    super(textoErro(codigo));
  }
}

/** Lança ErroApi quando o Supabase devolve erro; o código é a mensagem nos erros P0001. */
export function lancarSeErro(error: PostgrestError | null): void {
  if (!error) return;
  throw new ErroApi(error.code === 'P0001' ? error.message : 'rede');
}
