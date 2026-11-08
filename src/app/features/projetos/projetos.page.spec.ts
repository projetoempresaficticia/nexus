import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { paradosAbaixo, progressoPorFilhos } from '../../shared/utils/progresso';
import { ProjetosPage } from './projetos.page';

const ITENS = [
  item({ id: 'p', nivel: 0, nome: 'Turmas', setor_id: SETORES.sucesso }),
  item({ id: 't1', pai_id: 'p', status: 'concluida' }),
  item({ id: 't2', pai_id: 'p', status: 'em_andamento' }),
  item({ id: 's', pai_id: 't2', nivel: 2, status: 'bloqueada' }),
  item({ id: 'av', nome: 'Avulsa', setor_id: SETORES.sucesso }),
];

describe('progresso', () => {
  it('conta filhos concluídos e parados abaixo', () => {
    expect(progressoPorFilhos(ITENS.filter((i) => i.pai_id === 'p'))).toEqual({
      concluidos: 1,
      total: 2,
      percentual: 50,
    });
    expect(progressoPorFilhos([])).toBeNull();
    expect(paradosAbaixo('p', ITENS)).toBe(1);
  });
});

describe('ProjetosPage', () => {
  it('mostra cartão com progresso, parados e o cartão "Sem projeto"', async () => {
    TestBed.configureTestingModule({
      imports: [ProjetosPage],
      providers: [
        provideRouter([]),
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(
                dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
              ),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS) } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ProjetosPage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const cartoes = el.querySelectorAll('.pcard');
    expect(cartoes.length).toBe(2);
    expect(cartoes[0].textContent).toContain('Turmas');
    expect(cartoes[0].textContent).toContain('1 de 2 tarefas · 50%');
    expect(cartoes[0].textContent).toContain('1 parado(s)');
    expect(cartoes[0].querySelector('.s-lider')?.textContent).toBe('Líder');
    expect(cartoes[1].textContent).toContain('1 tarefa(s) fora de projetos');
    expect(el.querySelector('.btn.primary')?.textContent).toContain('+ Novo projeto');
  });

  it('mostra o status do projeto no cartão e filtra por ele (T-72)', async () => {
    const itens = [
      item({ id: 'p', nivel: 0, nome: 'Turmas', setor_id: SETORES.sucesso, status: 'a_fazer' }),
      item({
        id: 'p2',
        nivel: 0,
        nome: 'Marketing',
        setor_id: SETORES.sucesso,
        status: 'concluida',
      }),
    ];
    TestBed.configureTestingModule({
      imports: [ProjetosPage],
      providers: [
        provideRouter([]),
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(
                dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
              ),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(itens) } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ProjetosPage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    const cartoes = el.querySelectorAll('.pcard');
    expect(cartoes[0].querySelector('app-pill-status')?.textContent?.trim()).toBe('Concluída');
    expect(cartoes[1].querySelector('app-pill-status')?.textContent?.trim()).toBe('A fazer');

    (el.querySelector('.status-filtro button') as HTMLElement).click();
    await fixture.whenStable();
    const concluida = [...el.querySelectorAll('.status-item')].find((l) =>
      l.textContent?.includes('Concluída'),
    )!;
    (concluida.querySelector('input') as HTMLInputElement).click();
    await fixture.whenStable();

    expect([...el.querySelectorAll('.nome')].map((n) => n.textContent)).toEqual(['Turmas']);
  });

  it('filtro por pessoa (líder) só mostra projetos com a pessoa responsável abaixo', async () => {
    const itensComResponsavel = [
      item({ id: 'p', nivel: 0, nome: 'Turmas', setor_id: SETORES.sucesso }),
      item({ id: 't1', pai_id: 'p', status: 'concluida', responsaveis: ['p-ana'] }),
      item({ id: 'p2', nivel: 0, nome: 'Marketing', setor_id: SETORES.sucesso }),
      item({ id: 't2', pai_id: 'p2', responsaveis: ['p-bruno'] }),
    ];
    const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);
    dados.pessoas = [
      {
        id: 'p-ana',
        nome: 'Ana Ribeiro',
        iniciais: 'AR',
        email: 'ana@x',
        vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
      },
      {
        id: 'p-bruno',
        nome: 'Bruno Costa',
        iniciais: 'BC',
        email: 'bruno@x',
        vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
      },
    ];
    TestBed.configureTestingModule({
      imports: [ProjetosPage],
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
          useValue: { listar: vi.fn().mockResolvedValue(itensComResponsavel) },
        },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ProjetosPage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelectorAll('.pcard').length).toBe(2);
    expect([...el.querySelectorAll('.nome')].map((n) => n.textContent)).toEqual([
      'Marketing',
      'Turmas',
    ]);
    const select = el.querySelector('.viewbar select') as HTMLSelectElement;
    select.value = 'p-ana';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const filtrados = el.querySelectorAll('.pcard');
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].textContent).toContain('Turmas');

    // Sair da tela (ex.: abrir um projeto) e voltar não reseta a escolha (T-69).
    fixture.destroy();
    const segunda = TestBed.createComponent(ProjetosPage);
    await segunda.whenStable();
    await new Promise((r) => setTimeout(r));
    await segunda.whenStable();
    const el2 = segunda.nativeElement as HTMLElement;
    expect(el2.querySelectorAll('.pcard').length).toBe(1);
    expect((el2.querySelector('.viewbar select') as HTMLSelectElement).value).toBe('p-ana');
  });

  it('ordenar os cartões por prazo (T-70)', async () => {
    const itens = [
      item({ id: 'p', nivel: 0, nome: 'Turmas', setor_id: SETORES.sucesso, prazo: '2026-11-01' }),
      item({
        id: 'p2',
        nivel: 0,
        nome: 'Marketing',
        setor_id: SETORES.sucesso,
        prazo: '2026-12-01',
      }),
    ];
    TestBed.configureTestingModule({
      imports: [ProjetosPage],
      providers: [
        provideRouter([]),
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(
                dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
              ),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(itens) } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ProjetosPage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect([...el.querySelectorAll('.nome')].map((n) => n.textContent)).toEqual([
      'Marketing',
      'Turmas',
    ]);
    const selects = [...el.querySelectorAll('.viewbar select')] as HTMLSelectElement[];
    const ordenar = selects.find((s) =>
      s.closest('.field-inline')?.textContent?.includes('Ordenar por'),
    )!;
    ordenar.value = 'prazo';
    ordenar.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect([...el.querySelectorAll('.nome')].map((n) => n.textContent)).toEqual([
      'Turmas',
      'Marketing',
    ]);
  });
});
