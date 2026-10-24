import { Prioridade, Recorrencia, StatusItem } from './rotulos';

export type Envolvimento =
  'responsavel' | 'criador' | 'aprovador' | 'solicitacao' | 'mencao' | 'contexto';

/** Linha de vw_itens (SCHEMA.md §Views). Nas views o gerador marca tudo como nulo; aqui fica o real. */
export interface Item {
  id: string;
  setor_id: string;
  pai_id: string | null;
  nivel: 0 | 1 | 2;
  nome: string;
  descricao_html: string;
  status: StatusItem;
  prioridade: Prioridade;
  inicio: string | null;
  prazo: string | null;
  motivo_bloqueio_html: string | null;
  aprovador_id: string | null;
  parado_desde: string | null;
  recorrencia: Recorrencia | null;
  ordem: number;
  concluido_em: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
  legacy_id: string | null;
  responsaveis: string[];
  projeto_id: string | null;
  meu_envolvimento: Envolvimento[];
  atrasado: boolean;
  dias_parado: number | null;
  qtd_filhos: number;
  qtd_comentarios: number;
  qtd_anexos: number;
  solicitacoes_pendentes: number;
}

/** Entrada do RPC criar_item (API.md). Tarefa avulsa: nivel 1, sem pai_id, com setor_id. */
export interface NovoItem {
  setor_id?: string;
  pai_id?: string | null;
  nivel: 0 | 1 | 2;
  nome: string;
  descricao_html?: string;
  responsaveis?: string[];
  inicio?: string | null;
  prazo?: string | null;
  prioridade?: Prioridade;
  recorrencia?: Recorrencia | null;
}

export type CamposEditaveis = Partial<
  Pick<
    Item,
    | 'nome'
    | 'descricao_html'
    | 'inicio'
    | 'prazo'
    | 'prioridade'
    | 'recorrencia'
    | 'ordem'
    | 'pai_id'
  >
>;
