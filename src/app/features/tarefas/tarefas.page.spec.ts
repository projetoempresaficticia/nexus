import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { DadosIniciais } from '../../core/models/acesso.model';
import { Item } from '../../core/models/item.model';
import { SUPABASE } from '../../core/supabase.client';
import { TarefasPage } from './tarefas.page';

const ITENS: Item[] = [
  item({
    id: 'p',
    nivel: 0,
    nome: 'Turmas',
    setor_id: SETORES.sucesso,
    meu_envolvimento: ['contexto'],
  }),
  item({
    id: 't1',
    pai_id: 'p',
    projeto_id: 'p',
    nome: 'Calendário',
    setor_id: SETORES.sucesso,
    responsaveis: ['p-eu'],
    meu_envolvimento: ['responsavel'],
  }),
  item({
    id: 't2',
    pai_id: 'p',
    projeto_id: 'p',
    nome: 'Boas-vindas',
    setor_id: SETORES.sucesso,
    status: 'bloqueada',
  }),
  item({
    id: 'a',
    nome: 'Caixa partilhada',
    setor_id: SETORES.sucesso,
    status: 'concluida',
    meu_envolvimento: ['criador'],
  }),
  item({ id: 'a2', nome: 'Responder dúvidas', setor_id: SETORES.sucesso }),
];

describe('TarefasPage', () => {
  async function montar(dados: DadosIniciais, itens: Item[] = ITENS) {
    TestBed.configureTestingModule({
      imports: [TarefasPage],
      providers: [
        provideRouter([]),
        { provide: SUPABASE, useValue: supabaseFalso() },
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi.fn().mockResolvedValue(dados),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(1),
          },
        },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(itens) } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(TarefasPage);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  const textos = (el: HTMLElement, sel: string) =>
    [...el.querySelectorAll(sel)].map((e) => e.textContent?.trim());

  it('agrupa por projeto e deixa "Sem projeto" por último', async () => {
    const { el } = await montar(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]));
    expect(textos(el, '.grupo .nav-label')).toEqual(['Turmas', 'Sem projeto']);
    expect(textos(el, 'app-linha-item strong')).toEqual([
      'Calendário',
      'Boas-vindas',
      'Responder dúvidas',
    ]);
    expect(el.querySelector('.grupo.contexto')).toBeTruthy();
  });

  it('abas mostram as contagens e filtram', async () => {
    const { fixture, el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
    );
    expect(textos(el, '.tab')).toEqual([
      'Todas · 3',
      'Minhas · 1',
      'Em andamento · 2',
      'Paradas · 1',
      'Concluídas · 1',
    ]);
    (el.querySelectorAll('.tab')[4] as HTMLElement).click();
    await fixture.whenStable();
    expect(textos(el, 'app-linha-item strong')).toEqual(['Caixa partilhada']);
  });

  it('membro vê "Minhas tarefas" e o aviso de solicitações', async () => {
    const { el } = await montar(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]));
    expect(el.querySelector('h1')?.textContent).toBe('Minhas tarefas');
    expect(el.querySelector('.banner')?.textContent).toContain(
      'Há 1 solicitação esperando a sua resposta',
    );
  });

  it('líder com "Só os meus" vê só o que o envolve diretamente', async () => {
    const { fixture, el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]),
    );
    const botao = [...el.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Só os meus'),
    ) as HTMLElement;
    botao.click();
    await fixture.whenStable();
    expect(textos(el, 'app-linha-item strong')).toEqual(['Calendário']);
  });

  it('sem nada atribuído, o membro vê a mensagem do glossário', async () => {
    const { el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
      [],
    );
    expect(el.querySelector('app-vazio')?.textContent).toContain(
      'Você ainda não tem nada atribuído',
    );
  });

  it('Kanban usa os dados já carregados e "Só as minhas" filtra (US-21, US-22)', async () => {
    const { fixture, el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
    );
    const listar = TestBed.inject(ItensService).listar as ReturnType<typeof vi.fn>;
    const clicar = async (txt: string) => {
      [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === txt)!.click();
      await fixture.whenStable();
    };
    await clicar('Kanban');
    expect(listar).toHaveBeenCalledTimes(1);
    expect(el.querySelectorAll('.kcard')).toHaveLength(4);
    await clicar('Só as minhas');
    expect(textos(el, '.kcard strong')).toEqual(['Calendário']);
  });

  it('líder filtra por pessoa dos setores que administra; membro não vê o filtro (US-39)', async () => {
    const lider = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);
    lider.pessoas = [
      {
        id: 'p-eu',
        nome: 'Ana Ribeiro',
        iniciais: 'AR',
        email: 'a@x',
        vinculos: [{ setor_id: SETORES.sucesso, papel: 'lider' }],
      },
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
    const itens = [
      ...ITENS,
      item({ id: 'b1', nome: 'Do Bruno', setor_id: SETORES.sucesso, responsaveis: ['p-bruno'] }),
    ];
    const { fixture, el } = await montar(lider, itens);
    const select = el.querySelector('.viewbar select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Todas as pessoas',
      'Ana Ribeiro',
      'Bruno Costa',
    ]);
    select.value = 'p-bruno';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(textos(el, 'app-linha-item strong')).toEqual(['Do Bruno']);
  });

  it('membro não tem filtro por pessoa', async () => {
    const { el } = await montar(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]));
    expect(el.querySelector('.viewbar select')).toBeNull();
  });

  it('?aba=concluidas (vindo do Painel) abre a Lista nessa aba', async () => {
    const { fixture, el } = await montar(
      dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
    );
    fixture.componentRef.setInput('aba', 'concluidas');
    await fixture.whenStable();
    expect(el.querySelector('.tab.on')?.textContent).toContain('Concluídas');
    expect(textos(el, 'app-linha-item strong')).toEqual(['Caixa partilhada']);
  });
});
