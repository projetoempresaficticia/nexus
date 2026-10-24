import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { solicitacao } from '../../../testing/solicitacao';
import { AcessoService } from '../auth/acesso.service';
import { AcessoStore } from '../auth/acesso.store';
import { ItensService } from '../itens/itens.service';
import { ItensStore } from '../itens/itens.store';
import { Evento } from '../services/realtime.service';
import { SolicitacoesService } from './solicitacoes.service';
import { SolicitacoesStore } from './solicitacoes.store';

describe('SolicitacoesStore', () => {
  async function criar(
    servico: Partial<Record<keyof SolicitacoesService, unknown>>,
    pendentes = 0,
  ) {
    TestBed.configureTestingModule({
      providers: [
        { provide: SolicitacoesService, useValue: servico },
        {
          provide: ItensService,
          useValue: { listar: vi.fn().mockResolvedValue([item({ id: 't' })]) },
        },
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }])),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(pendentes),
          },
        },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    await TestBed.inject(ItensStore).carregar();
    return {
      store: TestBed.inject(SolicitacoesStore),
      itens: TestBed.inject(ItensStore),
      acesso: TestBed.inject(AcessoStore),
    };
  }

  it('ordena pendentes primeiro e depois as mais recentes', async () => {
    const { store } = await criar({
      listar: vi
        .fn()
        .mockResolvedValue([
          solicitacao({ id: 'a', status: 'resolvida', criado_em: '2026-10-23T12:00:00Z' }),
          solicitacao({ id: 'b', criado_em: '2026-10-22T12:00:00Z' }),
          solicitacao({ id: 'c', criado_em: '2026-10-23T09:00:00Z' }),
        ]),
    });
    await store.carregar();
    expect(store.ordenadas().map((s) => s.id)).toEqual(['c', 'b', 'a']);
  });

  it('abrir acrescenta a solicitação e aplica o novo status do item', async () => {
    const { store, itens } = await criar({
      listar: vi.fn().mockResolvedValue([]),
      abrir: vi.fn().mockResolvedValue({
        solicitacao: solicitacao({ id: 'nova' }),
        item: item({ id: 't', status: 'bloqueada', atualizado_em: '2026-10-24T00:00:00Z' }),
      }),
    });
    await store.carregar();
    expect(await store.abrir('t', 'p-bruno', 'informacao', '<p>x</p>')).toBe(true);
    expect(store.doItem('t').map((s) => s.id)).toEqual(['nova']);
    expect(itens.porId('t')!.status).toBe('bloqueada');
  });

  it('responder uma solicitação para mim baixa o contador do menu', async () => {
    const respondida = solicitacao({ para_id: 'p-eu', status: 'resolvida' });
    const { store, acesso } = await criar(
      {
        listar: vi.fn().mockResolvedValue([solicitacao({ para_id: 'p-eu' })]),
        responder: vi.fn().mockResolvedValue({ solicitacao: respondida, item: item({ id: 't' }) }),
        obter: vi.fn().mockResolvedValue(respondida),
      },
      2,
    );
    await store.carregar();
    await store.responder('sol-1', 'resolvida');
    expect(store.porId('sol-1')!.status).toBe('resolvida');
    expect(acesso.pendentes()).toBe(1);
  });

  it('cancelar tira da lista; erro do servidor mantém e avisa', async () => {
    const cancelar = vi
      .fn()
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValueOnce({ item: item({ id: 't' }) });
    const { store } = await criar({ listar: vi.fn().mockResolvedValue([solicitacao()]), cancelar });
    await store.carregar();
    expect(await store.cancelar('sol-1')).toBe(false);
    expect(store.porId('sol-1')).toBeDefined();
    expect(await store.cancelar('sol-1')).toBe(true);
    expect(store.porId('sol-1')).toBeUndefined();
  });
});

describe('SolicitacoesStore — tempo real', () => {
  const mensagem = {
    id: 'm1',
    solicitacao_id: 'sol-1',
    autor_id: 'p-bruno',
    texto_html: '<p>oi</p>',
    criado_em: '2026-10-24T10:00:00Z',
  };

  function criar(servico: Partial<Record<keyof SolicitacoesService, unknown>>) {
    TestBed.configureTestingModule({
      providers: [
        { provide: SolicitacoesService, useValue: servico },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue([]) } },
      ],
    });
    return TestBed.inject(SolicitacoesStore);
  }

  it('mensagem nova entra uma vez só, mesmo chegando pelo evento e pelo envio', async () => {
    const store = criar({
      listar: vi.fn().mockResolvedValue([solicitacao()]),
      enviarMensagem: vi.fn().mockResolvedValue(mensagem),
    });
    await store.carregar();
    const ev: Evento = {
      tabela: 'solicitacao_mensagens',
      tipo: 'INSERT',
      novo: mensagem,
      antigo: null,
    };
    await store.sincronizar(ev);
    await store.sincronizar(ev);
    expect(store.porId('sol-1')!.solicitacao_mensagens).toHaveLength(1);
  });

  it('solicitação nova é buscada; cancelada (DELETE) sai da lista', async () => {
    const obter = vi.fn().mockResolvedValue(solicitacao({ id: 'nova' }));
    const store = criar({ listar: vi.fn().mockResolvedValue([solicitacao()]), obter });
    await store.carregar();
    await store.sincronizar({
      tabela: 'solicitacoes',
      tipo: 'INSERT',
      novo: { id: 'nova' },
      antigo: null,
    });
    expect(store.porId('nova')).toBeDefined();
    await store.sincronizar({
      tabela: 'solicitacoes',
      tipo: 'DELETE',
      novo: null,
      antigo: { id: 'sol-1' },
    });
    expect(store.porId('sol-1')).toBeUndefined();
  });
});
