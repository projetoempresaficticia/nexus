import { Perfil } from '../models/acesso.model';

/**
 * Categorias de e-mail (T-65, "Notificações e rotinas"): cada uma liga/desliga um pedaço do que
 * `enviar-notificacoes` manda. boas_vindas e lembrete_prazo não têm categoria própria — vão sempre.
 */
export const CATEGORIAS_NOTIFICACAO = [
  'notif_atribuicao',
  'notif_bloqueios',
  'notif_aprovacoes',
  'notif_solicitacoes',
  'notif_mencoes_comentarios',
  'notif_resumo_semanal',
] as const;

export type CategoriaNotificacao = (typeof CATEGORIAS_NOTIFICACAO)[number];
export type PreferenciasEmail = Pick<Perfil, CategoriaNotificacao>;
