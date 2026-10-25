import { DadosIniciais, Papel } from '../app/core/models/acesso.model';

/** Árvore: Secretaria > Pedagógico > Sucesso do Aluno ; Financeiro (raiz). */
export const SETORES = {
  secretaria: 's-secretaria',
  pedagogico: 's-pedagogico',
  sucesso: 's-sucesso',
  financeiro: 's-financeiro',
};

export function dadosIniciais(
  vinculos: { setor_id: string; papel: Papel }[],
  administrados: string[] = [],
  isAdmin = false,
): DadosIniciais {
  const visiveis = new Set([...vinculos.map((v) => v.setor_id), ...administrados]);
  const setores = [
    { id: SETORES.secretaria, nome: 'Secretaria', pai_id: null },
    { id: SETORES.pedagogico, nome: 'Pedagógico', pai_id: SETORES.secretaria },
    { id: SETORES.sucesso, nome: 'Sucesso do Aluno', pai_id: SETORES.pedagogico },
    { id: SETORES.financeiro, nome: 'Financeiro', pai_id: null },
  ].map((s) => ({ ...s, ativo: true, visivel: visiveis.has(s.id) }));
  return {
    perfil: {
      id: 'p-eu',
      auth_id: 'u-eu',
      email: 'eu@estudeemportugal.org',
      nome: 'Ana Ribeiro',
      iniciais: 'AR',
      is_admin: isAdmin,
      ativo: true,
      notif_atribuicao: true,
      notif_bloqueios: true,
      notif_aprovacoes: true,
      notif_solicitacoes: true,
      notif_mencoes_comentarios: true,
      notif_resumo_semanal: true,
      conta_teste: false,
      criado_em: '2026-10-01T00:00:00Z',
      desativado_em: null,
      legacy_id: null,
    },
    vinculos,
    setores,
    pessoas: [],
    setores_administrados: administrados,
  };
}
