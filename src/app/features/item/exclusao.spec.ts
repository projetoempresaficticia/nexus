import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { ItensStore } from '../../core/itens/itens.store';
import { podeExcluirItem } from '../../core/itens/permissoes';
import { Papel } from '../../core/models/acesso.model';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ItemPage } from './item.page';
import { AnexosService } from './anexos.service';
import { ItemService } from './item.service';

const ITENS = [
  item({ id: 'p', nivel: 0, nome: 'Turmas', criado_por: 'outro' }),
  item({ id: 't', pai_id: 'p', nome: 'Calendário', criado_por: 'p-eu' }),
  item({ id: 's1', pai_id: 't', nivel: 2 }),
  item({ id: 's2', pai_id: 't', nivel: 2 }),
];

describe('podeExcluirItem (US-13)', () => {
  it('líder sempre; criador só sem filhos', () => {
    expect(podeExcluirItem(ITENS[1], 2, 'p-eu', new Set())).toBe(false);
    expect(podeExcluirItem(ITENS[1], 0, 'p-eu', new Set())).toBe(true);
    expect(podeExcluirItem(ITENS[1], 2, 'p-eu', new Set([ITENS[1].setor_id]))).toBe(true);
  });
});

describe('Excluir na página do item', () => {
  async function montar(papel: Papel, servico: Partial<Record<keyof ItensService, unknown>> = {}) {
    const administrados = papel === 'lider' ? [SETORES.sucesso] : [];
    TestBed.configureTestingModule({
      imports: [ItemPage],
      providers: [
        provideRouter([]),
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi
              .fn()
              .mockResolvedValue(
                dadosIniciais([{ setor_id: SETORES.sucesso, papel }], administrados),
              ),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        {
          provide: ItemService,
          useValue: {
            listarChecklist: vi.fn().mockResolvedValue([]),
            listarDependencias: vi.fn().mockResolvedValue([]),
            listarComentarios: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: AnexosService,
          useValue: { listar: vi.fn().mockResolvedValue([]), limpar: vi.fn() },
        },
        {
          provide: ItensService,
          useValue: { listar: vi.fn().mockResolvedValue(ITENS), ...servico },
        },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    const fixture = TestBed.createComponent(ItemPage);
    fixture.componentRef.setInput('id', 't');
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('membro criador de tarefa com subtarefas não vê Excluir', async () => {
    const { el } = await montar('membro');
    expect(el.querySelector('.btn.danger')).toBeNull();
  });

  it('líder confirma com a contagem, exclui em cascata e volta ao projeto', async () => {
    const excluir = vi.fn().mockResolvedValue({ apagados: 3, caminhos_storage: ['s/t/a.pdf'] });
    const { fixture, el } = await montar('lider', {
      contarDescendentes: vi.fn().mockResolvedValue(2),
      excluir,
    });
    const conf = TestBed.inject(ConfirmacaoService);
    const perguntar = vi.spyOn(conf, 'perguntar').mockResolvedValue(true);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    (el.querySelector('.btn.danger') as HTMLElement).click();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();

    expect(perguntar).toHaveBeenCalledWith(
      expect.objectContaining({
        mensagem: expect.stringContaining('Isto também apaga 2 item(ns) abaixo'),
        perigo: true,
      }),
    );
    expect(excluir).toHaveBeenCalledWith('t');
    const store = TestBed.inject(ItensStore);
    expect(['t', 's1', 's2'].map((id) => store.porId(id))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(store.porId('p')).toBeTruthy();
    expect(navegar).toHaveBeenCalledWith('/item/p');
    expect(TestBed.inject(AnexosService).limpar).toHaveBeenCalledWith(['s/t/a.pdf']);
  });

  it('cancelar não exclui', async () => {
    const excluir = vi.fn();
    const { el } = await montar('lider', {
      contarDescendentes: vi.fn().mockResolvedValue(2),
      excluir,
    });
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(false);
    (el.querySelector('.btn.danger') as HTMLElement).click();
    await new Promise((r) => setTimeout(r));
    expect(excluir).not.toHaveBeenCalled();
  });
});
