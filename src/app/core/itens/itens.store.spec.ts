import { TestBed } from '@angular/core/testing';
import { item } from '../../../testing/item';
import { ToastService } from '../../shared/ui/toast.service';
import { ErroApi } from '../services/erro-api';
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
