import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../shared/ui/toast.service';
import { ErroApi } from '../services/erro-api';
import { Evento } from '../services/realtime.service';
import { Notificacao, NotificacoesService } from './notificacoes.service';
import { NotificacoesStore } from './notificacoes.store';

const n = (id: string, extra: Partial<Notificacao> = {}): Notificacao => ({
  id,
  tipo: 'mencao',
  destinatario_id: 'p-eu',
  autor_id: 'p-autor',
  autor: { nome: 'Bruno' },
  item_id: 't1',
  dados: { nome: 'Tarefa' },
  criado_em: '2026-10-25T10:00:00Z',
  enviado_em: null,
  erro: null,
  tentativas: 0,
  lido_em: null,
  ...extra,
});

describe('NotificacoesStore (T-59)', () => {
  function criar(servico: Partial<Record<keyof NotificacoesService, unknown>>) {
    TestBed.configureTestingModule({
      providers: [{ provide: NotificacoesService, useValue: servico }],
    });
    return { store: TestBed.inject(NotificacoesStore), toast: TestBed.inject(ToastService) };
  }

  it('carrega e conta quantas não foram lidas', async () => {
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([n('1'), n('2', { lido_em: '2026-10-25T11:00:00Z' })]),
    });
    await store.carregar();
    expect(store.lista().map((x) => x.id)).toEqual(['1', '2']);
    expect(store.naoLidas()).toBe(1);
  });

  it('marcar como lida é otimista e some do contador na hora', async () => {
    let resolver!: () => void;
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([n('1')]),
      marcarLida: vi.fn(() => new Promise<void>((r) => (resolver = r))),
    });
    await store.carregar();
    const p = store.marcarLida('1');
    expect(store.naoLidas()).toBe(0);
    resolver();
    await p;
    expect(store.naoLidas()).toBe(0);
  });

  it('se o servidor recusar, volta a não lida e avisa', async () => {
    const { store, toast } = criar({
      listar: vi.fn().mockResolvedValue([n('1')]),
      marcarLida: vi.fn().mockRejectedValue(new ErroApi('rede')),
    });
    const erro = vi.spyOn(toast, 'erro');
    await store.carregar();
    await store.marcarLida('1');
    expect(store.naoLidas()).toBe(1);
    expect(erro).toHaveBeenCalled();
  });

  it('marcar todas lidas só manda as que ainda não tinham sido lidas', async () => {
    const marcarTodasLidas = vi.fn().mockResolvedValue(undefined);
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([n('1'), n('2', { lido_em: '2026-10-25T11:00:00Z' })]),
      marcarTodasLidas,
    });
    await store.carregar();
    await store.marcarTodasLidas();
    expect(marcarTodasLidas).toHaveBeenCalledWith(['1']);
    expect(store.naoLidas()).toBe(0);
  });

  it('evento de tempo real busca a notificação de novo (com o nome do autor) e põe no topo', async () => {
    const { store } = criar({
      listar: vi.fn().mockResolvedValue([n('1')]),
      obter: vi.fn().mockResolvedValue(n('2', { criado_em: '2026-10-25T12:00:00Z' })),
    });
    await store.carregar();
    const evento: Evento = {
      tabela: 'notificacoes',
      tipo: 'INSERT',
      novo: { id: '2' },
      antigo: null,
    };
    await store.sincronizar(evento);
    expect(store.lista().map((x) => x.id)).toEqual(['2', '1']);
  });

  it('reconexão (evento null) recarrega tudo', async () => {
    const listar = vi.fn().mockResolvedValue([n('1')]);
    const { store } = criar({ listar });
    await store.carregar();
    await store.sincronizar(null);
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
