import { resumoNotificacao } from './notificacoes-texto';

describe('resumoNotificacao (T-59)', () => {
  it('cada tipo monta uma frase com o autor e o item', () => {
    const autorNome = 'Ana Ribeiro';
    expect(resumoNotificacao({ tipo: 'boas_vindas', dados: {}, autorNome: null })).toBe(
      'Bem-vindo(a) ao Nexus!',
    );
    expect(
      resumoNotificacao({ tipo: 'atribuicao', dados: { nome: 'Renovar contrato' }, autorNome }),
    ).toBe('Ana Ribeiro incluiu você como responsável em "Renovar contrato".');
    expect(resumoNotificacao({ tipo: 'mencao', dados: { nome: 'Site novo' }, autorNome })).toBe(
      'Ana Ribeiro mencionou você em "Site novo".',
    );
    expect(resumoNotificacao({ tipo: 'comentario', dados: { nome: 'Site novo' }, autorNome })).toBe(
      'Ana Ribeiro comentou em "Site novo".',
    );
    expect(
      resumoNotificacao({
        tipo: 'solicitacao_recebida',
        dados: { nome: 'Contrato', tipo: 'aprovacao' },
        autorNome,
      }),
    ).toBe('Ana Ribeiro precisa de você: Aprovação em "Contrato".');
    expect(
      resumoNotificacao({
        tipo: 'solicitacao_respondida',
        dados: { nome: 'Contrato', resultado: 'recusada' },
        autorNome,
      }),
    ).toBe('Sua solicitação em "Contrato" foi recusada.');
    expect(
      resumoNotificacao({ tipo: 'lembrete_prazo', dados: { nome: 'Relatório' }, autorNome: null }),
    ).toBe('"Relatório" vence amanhã.');
  });

  it('sem autor, usa "Alguém"; sem nome do item, usa "um item" (nunca quebra o sino)', () => {
    expect(resumoNotificacao({ tipo: 'comentario', dados: {}, autorNome: null })).toBe(
      'Alguém comentou em um item.',
    );
  });
});
