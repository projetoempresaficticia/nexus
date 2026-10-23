import { Enums, Tables } from './database.types';

export type Papel = Enums<'papel_setor'>;
export type Perfil = Tables<'perfis'>;

export interface VinculoResumo {
  setor_id: string;
  papel: Papel;
}

/** Setor visível (visivel=true) ou ancestral mostrado só para a linha de decisão. */
export interface SetorResumo {
  id: string;
  nome: string;
  pai_id: string | null;
  ativo: boolean;
  visivel: boolean;
}

export interface Pessoa {
  id: string;
  nome: string;
  iniciais: string;
  email: string;
  vinculos: VinculoResumo[];
}

/** Resposta do RPC carregar_inicial (API.md). */
export interface DadosIniciais {
  perfil: Perfil;
  vinculos: VinculoResumo[];
  setores: SetorResumo[];
  pessoas: Pessoa[];
  setores_administrados: string[];
}
