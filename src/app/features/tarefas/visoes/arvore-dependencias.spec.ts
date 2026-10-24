import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { solicitacao } from '../../../../testing/solicitacao';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensService } from '../../../core/itens/itens.service';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { Solicitacao, SolicitacoesService } from '../../../core/solicitacoes/solicitacoes.service';
import { ArvoreComponent } from './arvore.component';
import { DependenciasComponent } from './dependencias.component';

const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Matrículas' }),
  item({ id: 't1', pai_id: 'p', projeto_id: 'p', nome: 'Contratos', prazo: '2026-11-01' }),
  item({ id: 's1', pai_id: 't1', projeto_id: 'p', nivel: 2, nome: 'Assinar' }),
  item({ id: 't2', pai_id: 'p', projeto_id: 'p', nome: 'Boas-vindas', prazo: '2026-11-05' }),
  item({ id: 'a', nome: 'Caixa partilhada' }),
];

async function preparar(solicitacoes: Solicitacao[] = []) {
  const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]);
  dados.pessoas = [
    {
      id: 'p-eu',
      nome: 'Ana Ribeiro',
      iniciais: 'AR',
      email: 'a@x',
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
        useValue: { listar: vi.fn().mockResolvedValue(solicitacoes) },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  await TestBed.inject(ItensStore).carregar();
}

async function estabilizar(f: { whenStable(): Promise<unknown> }) {
  await f.whenStable();
  await new Promise((r) => setTimeout(r));
  await f.whenStable();
}

describe('ArvoreComponent', () => {
  async function montar(interessa?: (i: Item) => boolean) {
    await preparar();
    const fixture = TestBed.createComponent(ArvoreComponent);
    fixture.componentRef.setInput('itens', ITENS);
    if (interessa) fixture.componentRef.setInput('interessa', interessa);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const linhas = () =>
      [...el.querySelectorAll('.tree-name .t')].map((e) => e.textContent?.trim());
    return { fixture, el, linhas };
  }

  it('projeto aberto, tarefas fechadas e "Sem projeto" no fim', async () => {
    const { el, linhas } = await montar();
    expect(linhas()).toEqual(['Matrículas', 'Contratos', 'Boas-vindas', 'Caixa partilhada']);
    expect(el.querySelectorAll('section.panel')[1].textContent).toContain('Sem projeto');
    expect(el.querySelector('.mini-bar')).toBeTruthy();
  });

  it('expandir mostra as subtarefas; recolher tudo deixa só os projetos', async () => {
    const { fixture, el, linhas } = await montar();
    (el.querySelector('[aria-label="Expandir Contratos"]') as HTMLButtonElement).click();
    await estabilizar(fixture);
    expect(linhas()).toContain('Assinar');
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Recolher tudo')!
      .click();
    await estabilizar(fixture);
    expect(linhas()).toEqual(['Matrículas', 'Caixa partilhada']);
  });

  it('filtro mostra só o que interessa e o caminho até lá', async () => {
    const { fixture, el, linhas } = await montar((i) => i.id === 's1');
    [...el.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Expandir tudo')!
      .click();
    await estabilizar(fixture);
    expect(linhas()).toEqual(['Matrículas', 'Contratos', 'Assinar']);
  });
});

describe('DependenciasComponent', () => {
  it('agrupa as pendentes entre setores e mostra quem espera quem', async () => {
    await preparar([
      solicitacao({ id: 'x1', item_id: 't1', para_id: 'p-fin', texto_html: '<p>Fatura</p>' }),
      solicitacao({ id: 'x2', item_id: 't2', para_id: 'p-fin', tipo: 'acao' }),
      solicitacao({ id: 'x3', item_id: 't2', para_id: 'p-fin', status: 'resolvida' }),
      solicitacao({ id: 'x4', item_id: 't2', para_id: 'p-eu' }),
    ]);
    const fixture = TestBed.createComponent(DependenciasComponent);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const cartao = el.querySelector('.dep-cards .sec')!;
    expect(cartao.querySelector('h3')?.textContent).toBe('Sucesso do Aluno → Financeiro');
    expect(cartao.querySelector('.pill')?.textContent).toContain('2 aberta(s)');
    expect(cartao.textContent).toContain('Ana Ribeiro espera Duarte Faria: Fatura');
    expect(cartao.querySelector('a')?.getAttribute('href')).toBe('/solicitacoes?id=x1');
    expect(el.querySelectorAll('svg rect')).toHaveLength(2);
    expect(el.querySelector('svg circle + text')?.textContent?.trim()).toBe('2');
  });

  it('sem esperas entre setores mostra o aviso', async () => {
    await preparar([]);
    const fixture = TestBed.createComponent(DependenciasComponent);
    await estabilizar(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Nenhuma dependência aberta entre setores.',
    );
  });
});
