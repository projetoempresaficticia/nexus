import { DadosEmail, dataBr, montarEmail, trechoDe } from './modelos-email';

const base: DadosEmail = {
  tipo: 'atribuicao',
  destinatario: 'Bruno Costa',
  autor: 'Ana Ribeiro',
  item: 'Renovar contrato',
  prazo: '2026-11-30',
  status: 'em_andamento',
  trecho: null,
  outros: [],
  setores: [],
  tipoSolicitacao: null,
  resultado: null,
  link: 'https://nexus.exemplo/item/1',
};

describe('modelos de e-mail (GLOSSARIO_UI §E-mails)', () => {
  it('atribuição com outros responsáveis e prazo', () => {
    const e = montarEmail({ ...base, outros: ['Carla Dias'] });
    expect(e.assunto).toBe('Nova tarefa para você: Renovar contrato');
    expect(e.texto).toContain(
      'Ana Ribeiro incluiu você como responsável em "Renovar contrato" (com Carla Dias). Prazo: 30/11/2026.',
    );
    expect(e.texto).toContain('Você recebeu este e-mail porque participa do Nexus.');
  });

  it('menção e comentário citam o trecho sem HTML', () => {
    const trecho = '<p>Olá <span class="mention" data-uid="x">@Bruno</span>, &amp; veja</p>';
    expect(montarEmail({ ...base, tipo: 'mencao', trecho }).assunto).toBe(
      'Ana Ribeiro mencionou você em "Renovar contrato"',
    );
    expect(montarEmail({ ...base, tipo: 'comentario', trecho }).texto).toContain(
      'Ana Ribeiro comentou: "Olá @Bruno, & veja"',
    );
  });

  it('solicitações: tipo e resultado em português', () => {
    expect(
      montarEmail({ ...base, tipo: 'solicitacao_recebida', tipoSolicitacao: 'aprovacao' }).assunto,
    ).toBe('Ana Ribeiro precisa de você: Aprovação em "Renovar contrato"');
    expect(
      montarEmail({ ...base, tipo: 'solicitacao_respondida', resultado: 'recusada' }).assunto,
    ).toBe('Sua solicitação foi recusada: "Renovar contrato"');
  });

  it('lembrete e boas-vindas', () => {
    expect(montarEmail({ ...base, tipo: 'lembrete_prazo', autor: null }).texto).toContain(
      '"Renovar contrato" vence em 30/11/2026. Status atual: Em andamento.',
    );
    const bv = montarEmail({ ...base, tipo: 'boas_vindas', setores: ['Pedagógico'] });
    expect(bv.assunto).toBe('Bem-vindo(a) ao Nexus');
    expect(bv.texto).toContain('Olá, Bruno Costa! Você foi cadastrado(a) no Nexus');
    expect(bv.texto).toContain('nos setores Pedagógico');
  });

  it('o HTML escapa o texto e torna o link clicável', () => {
    const e = montarEmail({ ...base, item: '<script>x</script>' });
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('<a href="https://nexus.exemplo/item/1">');
  });

  it('trecho longo é cortado e datas viram dd/mm/aaaa', () => {
    expect(trechoDe('a'.repeat(300))).toHaveLength(200);
    expect(dataBr(null)).toBe('sem prazo');
  });
});
