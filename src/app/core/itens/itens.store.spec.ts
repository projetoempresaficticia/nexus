import { TestBed } from '@angular/core/testing';
import { item } from '../../../testing/item';
import { ToastService } from '../../shared/ui/toast.service';
import { cacheFalso } from '../../../testing/cache-falso';
import { CacheLocalService } from '../services/cache-local.service';
import { ErroApi } from '../services/erro-api';
import { Evento } from '../services/realtime.service';
import { ItensService } from './itens.service';
import { ItensStore } from './itens.store';

describe('ItensStore', () => {
  function criar(servico: Partial<Record<keyof ItensService, unknown>>) {
    TestBed.configureTestingModule({ providers: [{ provide: ItensService, useValue: servico }] });
    return { store: TestBed.inject(ItensStore), toast: TestBed.inject(ToastService) };
  }

  it('carrega e monta o caminho do item', async () => {
    const { store } = criar({
      listar: vi
        .fn()
        .mockResolvedValue([
          item({ id: 'p', nivel: 0 }),
          item({ id: 't', pai_id: 'p' }),
          item({ id: 's', pai_id: 't', nivel: 2 }),
        ]),
    });
    await store.carregar();
    expect(store.caminho(store.porId('s')!).map((i) => i.id)).toEqual(['p', 't']);
    expect(store.filhos('p').map((i) => i.id)).toEqual(['t']);
  });

  it('mudança de status aparece na hora e fica com a versão do servidor', async () => {
    let resolver!: (v: unknown) => void;
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([item({ id: 't' })]),
      mudarStatus: vi.fn(() => new Promise((r) => (resolver = r))),
    });
    await store.carregar();
    const promessa = store.mudarStatus('t', 'em_andamento');
    expect(store.porId('t')!.status).toBe('em_andamento');
    resolver({
      item: item({ id: 't', status: 'em_andamento', atualizado_em: '2026-10-24T00:00:00Z' }),
      novo_item_recorrente: null,
    });
    await promessa;
    expect(store.porId('t')!.atualizado_em).toBe('2026-10-24T00:00:00Z');
  });

  it('se o servidor recusar, desfaz e mostra o erro (US-10)', async () => {
    const { store, toast } = criar({
      listar: vi.fn().mockResolvedValue([item({ id: 't', status: 'em_andamento' })]),
      mudarStatus: vi.fn().mockRejectedValue(new ErroApi('motivo_obrigatorio')),
    });
    await store.carregar();
    expect(await store.mudarStatus('t', 'bloqueada')).toBeNull();
    expect(store.porId('t')!.status).toBe('em_andamento');
    expect(toast.atual()?.erro).toBe(true);
  });

  it('concluir recorrente acrescenta a próxima ocorrência', async () => {
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([item({ id: 't', recorrencia: 'semanal' })]),
      mudarStatus: vi.fn().mockResolvedValue({
        item: item({ id: 't', status: 'concluida' }),
        novo_item_recorrente: item({ id: 't2', recorrencia: 'semanal' }),
      }),
    });
    await store.carregar();
    await store.mudarStatus('t', 'concluida');
    expect(store.porId('t2')).toBeTruthy();
  });

  it('merge ignora versão mais velha', async () => {
    const { store } = criar({
      listar: vi
        .fn()
        .mockResolvedValue([
          item({ id: 't', nome: 'novo', atualizado_em: '2026-10-24T00:00:00Z' }),
        ]),
    });
    await store.carregar();
    store.aplicar(item({ id: 't', nome: 'velho', atualizado_em: '2026-10-23T00:00:00Z' }));
    expect(store.porId('t')!.nome).toBe('novo');
  });
});

describe('ItensStore — tempo real', () => {
  const ev = (
    tabela: Evento['tabela'],
    tipo: Evento['tipo'],
    novo: Record<string, unknown> | null,
    antigo: Record<string, unknown> | null = null,
  ): Evento => ({ tabela, tipo, novo, antigo });

  async function criar(obter: ReturnType<typeof vi.fn>, listar = vi.fn()) {
    listar.mockResolvedValue([item({ id: 't', atualizado_em: '2026-10-24T10:00:00Z' })]);
    TestBed.configureTestingModule({
      providers: [{ provide: ItensService, useValue: { listar, obter } }],
    });
    const store = TestBed.inject(ItensStore);
    await store.carregar();
    return { store, listar };
  }

  it('ignora o evento da versão que já tem (ação otimista própria não pisca)', async () => {
    const obter = vi.fn();
    const { store } = await criar(obter);
    await store.sincronizar(
      ev('itens', 'UPDATE', { id: 't', atualizado_em: '2026-10-24 10:00:00+00' }),
    );
    expect(obter).not.toHaveBeenCalled();
  });

  it('versão mais nova de um colega: busca na vw_itens, aplica e realça por 1,5 s', async () => {
    vi.useFakeTimers();
    const obter = vi
      .fn()
      .mockResolvedValue(
        item({ id: 't', status: 'concluida', atualizado_em: '2026-10-24T11:00:00Z' }),
      );
    const { store } = await criar(obter);
    await store.sincronizar(
      ev('itens', 'UPDATE', { id: 't', atualizado_em: '2026-10-24T11:00:00.123456+00:00' }),
    );
    expect(store.porId('t')!.status).toBe('concluida');
    expect(store.realcados().has('t')).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(store.realcados().has('t')).toBe(false);
    vi.useRealTimers();
  });

  it('item novo visível entra; deixar de ser responsável tira da lista', async () => {
    const obter = vi
      .fn()
      .mockResolvedValueOnce(item({ id: 'novo' }))
      .mockResolvedValueOnce(null);
    const { store } = await criar(obter);
    await store.sincronizar(ev('itens', 'INSERT', { id: 'novo', atualizado_em: 'x' }));
    expect(store.porId('novo')).toBeDefined();
    await store.sincronizar(
      ev('item_responsaveis', 'DELETE', null, { item_id: 't', perfil_id: 'p-eu' }),
    );
    expect(obter).toHaveBeenLastCalledWith('t');
    expect(store.porId('t')).toBeUndefined();
  });

  it('DELETE de item que não conheço é ignorado; DELETE de item conhecido remove', async () => {
    const obter = vi.fn();
    const { store } = await criar(obter);
    await store.sincronizar(ev('item_responsaveis', 'DELETE', null, { item_id: 'outro' }));
    expect(obter).not.toHaveBeenCalled();
    await store.sincronizar(ev('itens', 'DELETE', null, { id: 't' }));
    expect(store.porId('t')).toBeUndefined();
  });

  it('reconexão recarrega tudo sem "Carregando…"', async () => {
    const { store, listar } = await criar(vi.fn());
    listar.mockResolvedValue([]);
    const p = store.sincronizar(null);
    expect(store.carregando()).toBe(false);
    await p;
    expect(store.todos()).toEqual([]);
  });
});

describe('ItensStore — abertura instantânea (T-44)', () => {
  it('mostra o retrato na hora e troca pela lista do servidor', async () => {
    let responder!: (l: unknown[]) => void;
    const cache = cacheFalso({ itens: [item({ id: 'velho' })] });
    TestBed.configureTestingModule({
      providers: [
        { provide: CacheLocalService, useValue: cache },
        {
          provide: ItensService,
          useValue: { listar: vi.fn(() => new Promise((r) => (responder = r))) },
        },
      ],
    });
    const store = TestBed.inject(ItensStore);
    await store.carregar();
    expect(store.carregado()).toBe(true);
    expect(store.carregando()).toBe(false);
    expect(store.porId('velho')).toBeDefined();
    responder([item({ id: 'novo' })]);
    await new Promise((r) => setTimeout(r));
    expect(store.porId('velho')).toBeUndefined();
    expect(store.porId('novo')).toBeDefined();
    TestBed.tick();
    expect(cache.agendar).toHaveBeenLastCalledWith('itens', [
      expect.objectContaining({ id: 'novo' }),
    ]);
  });

  it('limpar (logout) esvazia a memória', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ItensService,
          useValue: { listar: vi.fn().mockResolvedValue([item({ id: 't' })]) },
        },
      ],
    });
    const store = TestBed.inject(ItensStore);
    await store.carregar();
    store.limpar();
    expect(store.todos()).toEqual([]);
    expect(store.carregado()).toBe(false);
  });
});
