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
});
