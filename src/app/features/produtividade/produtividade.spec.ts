import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { hojeIso, somarDias } from '../../shared/utils/datas';
import {
  Entrega,
  cicloMedio,
  periodo,
  porItem,
  pontualidade,
  semanasDo,
  variacao,
} from './produtividade.calculos';
import { ProdutividadePage } from './produtividade.page';
import { ProdutividadeService } from './produtividade.service';

const entrega = (d: Partial<Entrega> & { item_id: string; concluido: string }): Entrega => ({
  perfil_id: 'p-bruno',
  setor_id: SETORES.sucesso,
  nome: d.item_id,
  prazo: null,
  dias_ciclo: 4,
  no_prazo: true,
  dias_parado_total: 0,
  ...d,
});

describe('produtividade.calculos (US-29)', () => {
  it('períodos e o anterior de mesmo tamanho', () => {
    expect(periodo('4s', '2026-10-24')).toEqual({
      de: '2026-09-27',
      ate: '2026-10-24',
      deAnt: '2026-08-30',
      ateAnt: '2026-09-26',
    });
    expect(periodo('mesant', '2026-10-24')).toEqual({
      de: '2026-09-01',
      ate: '2026-09-30',
      deAnt: '2026-08-02',
      ateAnt: '2026-08-31',
    });
  });

  it('pontualidade = no prazo ÷ concluídos; ciclo = média; equipe conta item uma vez', () => {
    const l = [
      entrega({ item_id: 'a', concluido: '2026-10-01', dias_ciclo: 2 }),
      entrega({ item_id: 'b', concluido: '2026-10-02', dias_ciclo: 6, no_prazo: false }),
      entrega({
        item_id: 'b',
        concluido: '2026-10-02',
        perfil_id: 'p-carla',
        dias_ciclo: 6,
        no_prazo: false,
      }),
    ];
    expect(porItem(l)).toHaveLength(2);
    expect(pontualidade(porItem(l))).toBe(50);
    expect(cicloMedio(porItem(l))).toBe(4);
  });

  it('variação: subir é bom ou ruim conforme o indicador', () => {
    expect(variacao(12, 10, true)).toMatchObject({ classe: 'good', texto: '▲ 20%' });
    expect(variacao(12, 10, false)).toMatchObject({ classe: 'bad' });
    expect(variacao(3, 0, true)).toMatchObject({ texto: 'semBase', comparavel: false });
  });

  it('pelo menos 4 semanas, segunda a domingo', () => {
    const s = semanasDo(periodo('mes', '2026-10-24'));
    expect(s[0]).toEqual({ de: '2026-09-28', ate: '2026-10-04' });
    expect(s.at(-1)).toEqual({ de: '2026-10-19', ate: '2026-10-24' });
  });
});

describe('ProdutividadePage', () => {
  const HOJE = hojeIso();
  async function montar(entregas: Entrega[]) {
    const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);
    dados.pessoas = [
      {
        id: 'p-bruno',
        nome: 'Bruno Costa',
        iniciais: 'BC',
        email: 'b@x',
        vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
      },
      {
        id: 'p-carla',
        nome: 'Carla Dias',
        iniciais: 'CD',
        email: 'c@x',
        vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
      },
    ];
    const listar = vi.fn().mockResolvedValue(entregas);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi.fn().mockResolvedValue(dados),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        {
          provide: ItensService,
          useValue: {
            listar: vi
              .fn()
              .mockResolvedValue([
                item({ id: 'x', responsaveis: ['p-carla'], status: 'bloqueada', dias_parado: 6 }),
              ]),
          },
        },
        { provide: ProdutividadeService, useValue: { listar } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ProdutividadePage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, listar };
  }
  const kpi = (el: HTMLElement, i: number) => {
    const k = el.querySelectorAll('.kpi')[i];
    return {
      valor: k.querySelector('.kpi-v')?.textContent?.replace(/\s+/g, ''),
      delta: k.querySelector('.kpi-delta')?.textContent?.replace(/\s+/g, ' ').trim(),
    };
  };

  it('indicadores do período, com comparação ao anterior', async () => {
    const { el, listar } = await montar([
      entrega({ item_id: 'a', concluido: somarDias(HOJE, -2) }),
      entrega({ item_id: 'b', concluido: somarDias(HOJE, -5), no_prazo: false, dias_ciclo: 6 }),
      entrega({ item_id: 'c', concluido: somarDias(HOJE, -100) }),
    ]);
    expect(listar).toHaveBeenCalledWith([SETORES.sucesso], periodo('12s', HOJE).deAnt);
    expect(kpi(el, 0)).toEqual({ valor: '2', delta: '▲ 100% vs período anterior' });
    expect(kpi(el, 1).valor).toBe('50%');
    expect(kpi(el, 2).valor).toBe('5,0dias');
    expect(kpi(el, 4)).toEqual({ valor: '1', delta: '1 há 5 dias ou mais' });
  });

  it('clicar numa pessoa filtra os números; clicar de novo volta à equipe', async () => {
    const { fixture, el } = await montar([
      entrega({ item_id: 'a', concluido: somarDias(HOJE, -2) }),
      entrega({ item_id: 'b', concluido: somarDias(HOJE, -3), perfil_id: 'p-carla' }),
    ]);
    expect(kpi(el, 0).valor).toBe('2');
    const linhaCarla = [...el.querySelectorAll('tbody tr')].find((r) =>
      r.textContent?.includes('Carla Dias'),
    ) as HTMLElement;
    expect(linhaCarla.textContent).toContain('1');
    linhaCarla.click();
    await fixture.whenStable();
    expect(kpi(el, 0).valor).toBe('1');
    expect(linhaCarla.classList).toContain('sel');
    linhaCarla.click();
    await fixture.whenStable();
    expect(kpi(el, 0).valor).toBe('2');
  });
});
