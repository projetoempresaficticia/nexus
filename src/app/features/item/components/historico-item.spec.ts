import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { mudanca } from '../../../../testing/tempo-real';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { RealtimeService } from '../../../core/services/realtime.service';
import { Historico, ItemService } from '../item.service';
import { HistoricoItemComponent } from './historico-item.component';

const h = (id: number, d: Partial<Historico>): Historico => ({
  id,
  tabela: 'itens',
  registro_id: 't',
  perfil_id: 'p-eu',
  acao: 'update',
  campo: null,
  valor_antes: null,
  valor_depois: null,
  criado_em: '2026-10-24T09:00:00Z',
  ...d,
});

async function montar(registros: Historico[]) {
  const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);
  dados.pessoas = [
    { id: 'p-eu', nome: 'Ana Ribeiro', iniciais: 'AR', email: 'a@x', vinculos: [] },
    { id: 'p-bruno', nome: 'Bruno Costa', iniciais: 'BC', email: 'b@x', vinculos: [] },
  ];
  const listarHistorico = vi.fn().mockResolvedValue(registros);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItemService, useValue: { listarHistorico } },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(HistoricoItemComponent);
  fixture.componentRef.setInput('item', item({ id: 't' }));
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const linhas = () =>
    [...el.querySelectorAll('.linha')].map(
      (l) =>
        `${l.querySelector('.quem')?.textContent?.trim()} ${l.querySelector('.oque')?.textContent?.trim()}`,
    );
  return { fixture, el, linhas, listarHistorico };
}

describe('HistoricoItemComponent (US-32)', () => {
  it('descreve status, prazo, responsáveis e descrição em português', async () => {
    const { linhas } = await montar([
      h(6, { campo: 'descricao_html', valor_antes: '<p>a</p>', valor_depois: '<p>b</p>' }),
      h(5, { campo: 'responsaveis', valor_antes: 'p-bruno' }),
      h(4, { campo: 'responsaveis', valor_depois: 'p-bruno' }),
      h(3, { campo: 'prazo', valor_depois: '2026-11-30' }),
      h(2, { campo: 'status', valor_antes: 'a_fazer', valor_depois: 'em_andamento' }),
      h(1, { acao: 'insert', perfil_id: null }),
      h(0, { campo: 'ordem', valor_antes: '1', valor_depois: '2' }),
    ]);
    expect(linhas()).toEqual([
      'Ana Ribeiro editou a descrição',
      'Ana Ribeiro tirou Bruno Costa dos responsáveis',
      'Ana Ribeiro pôs Bruno Costa como responsável',
      'Ana Ribeiro definiu o prazo: 30/11',
      'Ana Ribeiro mudou o status de A fazer para Em andamento',
      'Alguém criou o item',
    ]);
  });

  it('mostra 10 e "Ver mais"; recarrega quando o item muda', async () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      h(i, { campo: 'status', valor_antes: 'a_fazer', valor_depois: 'em_andamento' }),
    );
    const { fixture, el, linhas, listarHistorico } = await montar(muitos);
    expect(linhas()).toHaveLength(10);
    (el.querySelector('.mais') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(linhas()).toHaveLength(12);
    TestBed.inject(RealtimeService).entregar('itens', mudanca('UPDATE', { id: 't' }));
    expect(listarHistorico).toHaveBeenCalledTimes(2);
  });
});
