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
import { DetalhesItemComponent } from './detalhes-item.component';
import { FilhosItemComponent } from './filhos-item.component';

const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Turmas', setor_id: SETORES.sucesso }),
  item({ id: 'p2', nivel: 0, nome: 'Outro projeto', setor_id: SETORES.sucesso }),
  item({
    id: 't',
    pai_id: 'p',
    nome: 'Calendário',
    setor_id: SETORES.sucesso,
    inicio: '2026-11-10',
  }),
  item({ id: 's1', pai_id: 't', nivel: 2, nome: 'Sala', status: 'concluida' }),
  item({ id: 's2', pai_id: 't', nivel: 2, nome: 'Feriados' }),
];

async function preparar(servico: Partial<Record<keyof ItensService, unknown>> = {}) {
  TestBed.configureTestingModule({
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
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS), ...servico } },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  await TestBed.inject(ItensStore).carregar();
}

describe('DetalhesItemComponent', () => {
  async function montar(id: string, podeEditar: boolean, servico = {}) {
    await preparar(servico);
    const fixture = TestBed.createComponent(DetalhesItemComponent);
    fixture.componentRef.setInput('item', TestBed.inject(ItensStore).porId(id));
    fixture.componentRef.setInput('podeEditar', podeEditar);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('não deixa prazo antes do início', async () => {
    const atualizar = vi.fn();
    const { el } = await montar('t', true, { atualizar });
    const prazo = el.querySelector('#d-prazo') as HTMLInputElement;
    prazo.value = '2026-11-01';
    prazo.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r));
    expect(atualizar).not.toHaveBeenCalled();
    expect(TestBed.inject(ToastService).atual()?.texto).toBe(
      'O prazo não pode ser antes do início.',
    );
  });

  it('move a tarefa para outro projeto e tira do projeto (US-34)', async () => {
    const atualizar = vi.fn().mockResolvedValue(item({ id: 't', pai_id: 'p2' }));
    const { el } = await montar('t', true, { atualizar });
    const projeto = el.querySelector('#d-proj') as HTMLSelectElement;
    expect([...projeto.options].map((o) => o.text.trim())).toEqual([
      'Sem projeto',
      'Outro projeto',
      'Turmas',
    ]);
    projeto.value = 'p2';
    projeto.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r));
    expect(atualizar).toHaveBeenCalledWith('t', { pai_id: 'p2' });
    projeto.value = '';
    projeto.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r));
    expect(atualizar).toHaveBeenLastCalledWith('t', { pai_id: null });
  });

  it('sem permissão mostra responsáveis só para ver e campos desligados', async () => {
    const { el } = await montar('t', false);
    expect(el.querySelector('app-seletor-pessoas')).toBeNull();
    expect(el.querySelector('app-avatares')?.textContent).toContain('Sem responsável');
    expect((el.querySelector('#d-prio') as HTMLSelectElement).disabled).toBe(true);
  });
});

describe('FilhosItemComponent', () => {
  async function montar(id: string) {
    await preparar();
    const fixture = TestBed.createComponent(FilhosItemComponent);
    fixture.componentRef.setInput('item', TestBed.inject(ItensStore).porId(id));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lista as subtarefas com progresso e "+ Subtarefa"', async () => {
    const el = await montar('t');
    expect(el.querySelector('h3')?.textContent).toBe('Subtarefas');
    expect([...el.querySelectorAll('.child strong')].map((s) => s.textContent)).toEqual([
      'Sala',
      'Feriados',
    ]);
    expect(el.textContent).toContain('1 de 2 concluídas');
    expect(el.querySelector('.btn.primary')?.textContent?.trim()).toBe('+ Subtarefa');
  });

  it('sem filhos explica de onde vem o progresso', async () => {
    const el = await montar('p2');
    expect(el.textContent).toContain(
      'Nenhuma tarefa ainda. O progresso deste projeto é calculado a partir delas.',
    );
  });
});
