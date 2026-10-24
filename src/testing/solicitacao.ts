import { Solicitacao } from '../app/core/solicitacoes/solicitacoes.service';

/** Solicitação de teste: pendente, de "p-eu" para "p-bruno", sem mensagens. */
export function solicitacao(dados: Partial<Solicitacao> = {}): Solicitacao {
  return {
    id: 'sol-1',
    item_id: 't',
    de_id: 'p-eu',
    para_id: 'p-bruno',
    tipo: 'informacao',
    status: 'pendente',
    texto_html: '<p>Qual o prazo?</p>',
    criado_em: '2026-10-23T10:00:00Z',
    respondido_em: null,
    legacy_id: null,
    solicitacao_mensagens: [],
    ...dados,
  };
}
