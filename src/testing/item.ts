import { Item } from '../app/core/models/item.model';

/** Item de teste com valores padrão; sobrescreva só o que importa. */
export function item(parcial: Partial<Item> & { id: string }): Item {
  return {
    setor_id: 's-sucesso',
    pai_id: null,
    nivel: 1,
    nome: `Item ${parcial.id}`,
    descricao_html: '',
    status: 'a_fazer',
    prioridade: 'media',
    inicio: null,
    prazo: null,
    motivo_bloqueio_html: null,
    aprovador_id: null,
    parado_desde: null,
    recorrencia: null,
    ordem: 0,
    concluido_em: null,
    criado_por: 'p-eu',
    criado_em: '2026-10-20T10:00:00Z',
    atualizado_em: '2026-10-20T10:00:00Z',
    legacy_id: null,
    responsaveis: [],
    projeto_id: null,
    meu_envolvimento: [],
    atrasado: false,
    dias_parado: null,
    qtd_filhos: 0,
    qtd_comentarios: 0,
    qtd_anexos: 0,
    solicitacoes_pendentes: 0,
    ...parcial,
  };
}
