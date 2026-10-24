import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { solicitacao } from '../../../testing/solicitacao';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { DadosIniciais } from '../../core/models/acesso.model';
import { Item } from '../../core/models/item.model';
import { SolicitacoesService } from '../../core/solicitacoes/solicitacoes.service';
import { SUPABASE } from '../../core/supabase.client';
import { hojeIso, somarDias } from '../../shared/utils/datas';
import { PainelPage } from './painel.page';

const HOJE = hojeIso();
const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Matrículas', responsaveis: ['p-bruno'] }),
  item({ id: 't1', pai_id: 'p', projeto_id: 'p', nome: 'Aberta' }),
  item({ id: 't2', pai_id: 'p', projeto_id: 'p', nome: 'Atrasada', prazo: somarDias(HOJE, -3) }),
  item({
    id: 't3',
    pai_id: 'p',
    projeto_id: 'p',
    nome: 'Parada há tempo',
    status: 'bloqueada',
    motivo_bloqueio_html: '<p>Falta a fatura</p>',
    dias_parado: 7,
  }),
  item({
    id: 't4',
    nome: 'Aguardando',
    status: 'aguardando_aprovacao',
    dias_parado: 1,
    aprovador_id: 'p-fin',
  }),
  item({
    id: 't5',
    nome: 'Feita agora',
    status: 'concluida',
    concluido_em: new Date().toISOString(),
  }),
  item({ id: 'o', nome: 'Outro setor', setor_id: SETORES.financeiro, status: 'bloqueada' }),
];

async function montar(dados: DadosIniciais) {
  dados.pessoas = [
    {
      id: 'p-bruno',
      nome: 'Bruno Costa',
      iniciais: 'BC',
      email: 'b@x',
      vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
    },
    {
      id: 'p-fin',
      nome: 'Duarte Faria',
      iniciais: 'DF',
      email: 'd@x',
      vinculos: [{ setor_id: SETORES.financeiro, papel: 'membro' }],
    },
  ];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SUPABASE, useValue: supabaseFalso() },
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS) } },
      {
        provide: SolicitacoesService,
        useValue: {
          listar: vi
            .fn()
            .mockResolvedValue([
              solicitacao({ item_id: 't3', para_id: 'p-fin', texto_html: '<p>Mandar fatura</p>' }),
            ]),
        },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(PainelPage);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const lider = () =>
  dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);

describe('PainelPage (US-28)', () => {
  it('os 5 KPIs contam só tarefas e subtarefas dos setores que administro', async () => {
    const { el } = await montar(lider());
    const kpis = [...el.querySelectorAll('.kpi')].map((k) => [
      k.querySelector('.kpi-l')?.textContent?.trim(),
      k.querySelector('.kpi-v')?.textContent?.trim(),
    ]);
    expect(kpis).toEqual([
      ['Abertas', '4'],
      ['Atrasadas', '1'],
      ['Bloqueadas', '1'],
      ['Aguardando aprovação', '1'],
      ['Concluídas', '1'],
    ]);
  });

  it('KPI leva a Tarefas com a aba certa', async () => {
    const { el } = await montar(lider());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (el.querySelectorAll('.kpi')[2] as HTMLButtonElement).click();
    expect(navegar).toHaveBeenCalledWith(['/tarefas'], { queryParams: { aba: 'paradas' } });
  });

  it('parados por dias (desc), com motivo e "outro setor" de quem se espera', async () => {
    const { el } = await montar(lider());
    const linhas = [...el.querySelectorAll('tbody tr')];
    expect(linhas.map((l) => l.querySelector('.nome')?.textContent?.trim())).toEqual([
      'Parada há tempo',
      'Aguardando',
    ]);
    expect(linhas[0].textContent).toContain('Falta a fatura');
    expect(linhas[0].textContent).toContain('Duarte Faria');
    expect(linhas[0].textContent).toContain('Financeiro · outro setor');
    expect(linhas[0].querySelector('.dias')?.textContent?.trim()).toBe('7 dias');
    expect(linhas[0].querySelector('.dias')?.classList).toContain('muito');
  });

  it('andamento dos projetos com progresso', async () => {
    const { el } = await montar(lider());
    const proj = el.querySelector('.projeto')!;
    expect(proj.textContent).toContain('Matrículas');
    expect(proj.textContent).toContain('0 de 3 tarefas · 0%');
  });

  it('filtro num setor que não administro mostra o aviso', async () => {
    const dados = dadosIniciais(
      [
        { setor_id: SETORES.sucesso, papel: 'lider' },
        { setor_id: SETORES.financeiro, papel: 'membro' },
      ],
      [SETORES.sucesso],
    );
    const { fixture, el } = await montar(dados);
    TestBed.inject(AcessoStore).setorFiltro.set(SETORES.financeiro);
    await fixture.whenStable();
    expect(el.querySelector('.notice')?.textContent).toContain('não administrador');
    expect(el.querySelector('.kpi')).toBeNull();
  });
});
