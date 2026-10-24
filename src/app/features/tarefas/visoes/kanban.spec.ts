import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensService } from '../../../core/itens/itens.service';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { ToastService } from '../../../shared/ui/toast.service';
import { KanbanComponent } from './kanban.component';

const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Matrículas 2027' }),
  item({ id: 'a', pai_id: 'p', projeto_id: 'p', nome: 'Rever contrato', prioridade: 'alta' }),
  item({ id: 'b', nome: 'Ligar ao aluno', status: 'em_andamento', criado_por: 'p-outro' }),
  item({ id: 'c', nome: 'Feito', status: 'concluida' }),
];

async function montar(servico: Partial<Record<keyof ItensService, unknown>> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi
            .fn()
            .mockResolvedValue(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }])),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS), ...servico } },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const store = TestBed.inject(ItensStore);
  await store.carregar();
  const fixture = TestBed.createComponent(KanbanComponent);
  fixture.componentRef.setInput(
    'itens',
    store.todos().filter((i) => i.nivel > 0),
  );
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const estabilizar = async () => {
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  const botao = (txt: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === txt);
  const colunas = () =>
    [...el.querySelectorAll('.kcol')].map((c) => ({
      nome: c.querySelector('.kcol-h .nome')?.textContent?.trim(),
      n: c.querySelector('.kcol-h .n')?.textContent?.trim(),
      cartoes: [...c.querySelectorAll('.kcard strong')].map((s) => s.textContent?.trim()),
    }));
  return { fixture, el, store, estabilizar, botao, colunas };
}

describe('KanbanComponent', () => {
  it('por status mostra as 5 colunas com contagem, inclusive Concluída', async () => {
    const { colunas, el } = await montar();
    expect(colunas().map((c) => `${c.nome} ${c.n}`)).toEqual([
      'A fazer 1',
      'Em andamento 1',
      'Bloqueada 0',
      'Aguardando aprovação 0',
      'Concluída 1',
    ]);
    expect(el.querySelector('.kcard .caminho')?.textContent).toContain('Matrículas 2027');
    expect(el.querySelector('.kempty')?.textContent).toContain('Arraste um item para cá');
  });

  it('só quem pode editar tem o menu "Mover para…"', async () => {
    const { el } = await montar();
    const menus = [...el.querySelectorAll('.kcard .mover')].map((b) =>
      b.getAttribute('aria-label'),
    );
    expect(menus).toContain('Mover "Rever contrato" para…');
    expect(menus).not.toContain('Mover "Ligar ao aluno" para…');
  });

  it('mover para Bloqueada pede o motivo; cancelar deixa o cartão onde estava', async () => {
    const mudarStatus = vi.fn();
    const { el, botao, estabilizar, colunas } = await montar({ mudarStatus });
    (el.querySelector('.kcard .mover') as HTMLButtonElement).click();
    await estabilizar();
    expect(el.querySelector('[role=menu]')?.textContent).not.toContain('A fazer');
    (
      [...el.querySelectorAll('[role=menuitem]')].find((b) =>
        b.textContent?.includes('Bloqueada'),
      ) as HTMLButtonElement
    ).click();
    await estabilizar();
    expect(document.body.textContent).toContain('Motivo');
    botao('Cancelar')!.click();
    await estabilizar();
    expect(mudarStatus).not.toHaveBeenCalled();
    expect(colunas()[0].cartoes).toEqual(['Rever contrato']);
  });

  it('por prioridade esconde concluídas e mover muda a prioridade', async () => {
    const atualizar = vi
      .fn()
      .mockResolvedValue(item({ id: 'a', pai_id: 'p', projeto_id: 'p', prioridade: 'baixa' }));
    const { el, botao, estabilizar, colunas } = await montar({ atualizar });
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    botao('Prioridade')!.click();
    await estabilizar();
    expect(colunas().map((c) => c.nome)).toEqual(['Alta', 'Média', 'Baixa']);
    expect(colunas().flatMap((c) => c.cartoes)).not.toContain('Feito');
    (el.querySelector('.kcard .mover') as HTMLButtonElement).click();
    await estabilizar();
    (
      [...el.querySelectorAll('[role=menuitem]')].find((b) =>
        b.textContent?.includes('Baixa'),
      ) as HTMLButtonElement
    ).click();
    await estabilizar();
    expect(atualizar).toHaveBeenCalledWith('a', { prioridade: 'baixa' });
    expect(sucesso).toHaveBeenCalledWith('Prioridade de "Rever contrato": Baixa.');
  });

  it('por projeto agrupa com "Sem projeto" no fim e não deixa arrastar', async () => {
    const { el, botao, estabilizar, colunas } = await montar();
    botao('Projeto')!.click();
    await estabilizar();
    expect(colunas().map((c) => c.nome)).toEqual(['Matrículas 2027', 'Sem projeto']);
    expect(el.querySelector('.kcard .mover')).toBeNull();
    expect(el.querySelector('.kempty')).toBeNull();
  });
});
