import { Enums } from './database.types';

// Rótulos PT-BR dos valores do banco (GLOSSARIO_UI.md §Rótulos de domínio) e a classe de cor de cada um.

export type StatusItem = Enums<'status_item'>;
export type Prioridade = Enums<'prioridade'>;
export type Recorrencia = Enums<'recorrencia'>;
export type TipoSolicitacao = Enums<'tipo_solicitacao'>;
export type StatusSolicitacao = Enums<'status_solicitacao'>;

export const STATUS_ITEM: Record<StatusItem, { texto: string; classe: string }> = {
  a_fazer: { texto: 'A fazer', classe: 's-afazer' },
  em_andamento: { texto: 'Em andamento', classe: 's-andamento' },
  bloqueada: { texto: 'Bloqueada', classe: 's-bloq' },
  aguardando_aprovacao: { texto: 'Aguardando aprovação', classe: 's-aprov' },
  concluida: { texto: 'Concluída', classe: 's-done' },
};
export const ORDEM_STATUS: StatusItem[] = [
  'a_fazer',
  'em_andamento',
  'bloqueada',
  'aguardando_aprovacao',
  'concluida',
];

/** Cor da bolinha de prioridade (DESIGN.md): Alta danger, Média bloq-fg, Baixa muted. */
export const PRIORIDADE: Record<Prioridade, { texto: string; cor: string }> = {
  alta: { texto: 'Alta', cor: 'var(--danger)' },
  media: { texto: 'Média', cor: 'var(--bloq-fg)' },
  baixa: { texto: 'Baixa', cor: 'var(--muted)' },
};

export const RECORRENCIA: Record<Recorrencia, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  anual: 'Anual',
};
export const SEM_RECORRENCIA = 'Não repete';

export const NIVEL = ['Projeto', 'Tarefa', 'Subtarefa'] as const;

export const TIPO_SOLICITACAO: Record<TipoSolicitacao, { texto: string; classe: string }> = {
  informacao: { texto: 'Informação', classe: 's-info' },
  acao: { texto: 'Ação', classe: 's-bloq' },
  aprovacao: { texto: 'Aprovação', classe: 's-aprov' },
};

export const STATUS_SOLICITACAO: Record<StatusSolicitacao, { texto: string; classe: string }> = {
  pendente: { texto: 'Pendente', classe: 's-pend' },
  resolvida: { texto: 'Resolvida', classe: 's-info' },
  aprovada: { texto: 'Aprovada', classe: 's-done' },
  recusada: { texto: 'Recusada', classe: 's-recus' },
};
