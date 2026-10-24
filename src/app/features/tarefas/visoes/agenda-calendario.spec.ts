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
import { ocorrencias, somarMeses } from '../../../shared/utils/datas';
import { AgendaComponent } from './agenda.component';
import { CalendarioComponent } from './calendario.component';

// Sábado, 24/10/2026
const HOJE = '2026-10-24';
const ITENS: Item[] = [
  item({ id: 'a', nome: 'Atrasada', prazo: '2026-10-20', atrasado: true }),
  item({ id: 'h', nome: 'Hoje', prazo: HOJE }),
  item({ id: 'am', nome: 'Amanhã', prazo: '2026-10-25' }),
  item({ id: 'd', nome: 'Duas semanas', prazo: '2026-11-03' }),
  item({ id: 'l', nome: 'Longe', prazo: '2026-12-20' }),
  item({ id: 's', nome: 'Sem prazo' }),
  item({ id: 'c', nome: 'Concluída', prazo: HOJE, status: 'concluida' }),
  item({ id: 'r', nome: 'Reunião', prazo: '2026-10-05', recorrencia: 'semanal' }),
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
            .mockResolvedValue(dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }])),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS), ...servico } },
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

describe('datas: recorrência prevista', () => {
  it('mês soma como o Postgres e as ocorrências param na data final', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    expect(ocorrencias('2026-10-05', 'semanal', '2026-10-26')).toEqual([
      '2026-10-12',
      '2026-10-19',
      '2026-10-26',
    ]);
    expect(ocorrencias('2026-10-31', 'mensal', '2027-01-31')).toEqual([
      '2026-11-30',
      '2026-12-31',
      '2027-01-31',
    ]);
  });
});

describe('AgendaComponent', () => {
  it('agrupa os abertos pelo prazo, de Atrasados a Sem prazo', async () => {
    await preparar();
    const fixture = TestBed.createComponent(AgendaComponent);
    fixture.componentRef.setInput('itens', ITENS);
    fixture.componentRef.setInput('hoje', HOJE);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const grupos = [...el.querySelectorAll('.panel')].map((p) => ({
      nome: p.querySelector('h2')?.textContent?.trim(),
      itens: [...p.querySelectorAll('app-linha-item strong')].map((s) => s.textContent?.trim()),
    }));
    expect(grupos).toEqual([
      { nome: 'Atrasados', itens: ['Reunião', 'Atrasada'] },
      { nome: 'Hoje', itens: ['Hoje'] },
      { nome: 'Amanhã', itens: ['Amanhã'] },
      { nome: 'Próximas duas semanas', itens: ['Duas semanas'] },
      { nome: 'Mais adiante', itens: ['Longe'] },
      { nome: 'Sem prazo', itens: ['Sem prazo'] },
    ]);
  });
});

describe('CalendarioComponent', () => {
  async function montar(modo: 'mes' | 'semana', servico = {}) {
    await preparar(servico);
    const fixture = TestBed.createComponent(CalendarioComponent);
    fixture.componentRef.setInput('itens', ITENS);
    fixture.componentRef.setInput('modo', modo);
    fixture.componentRef.setInput('hoje', HOJE);
    fixture.componentRef.setInput('referencia', HOJE);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const dia = (n: number) =>
      [...el.querySelectorAll('.cal-day:not(.out)')].find(
        (d) => d.querySelector('.cal-n')?.textContent?.trim() === String(n),
      )!;
    return { fixture, el, dia };
  }

  it('mês mostra a grade, hoje marcado, recorrência prevista tracejada e Sem prazo', async () => {
    const { el, dia } = await montar('mes');
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('Outubro de 2026');
    expect(el.querySelectorAll('.cal-day')).toHaveLength(35);
    expect(dia(24).classList).toContain('today');
    expect(dia(24).textContent).toContain('Hoje');
    expect(dia(12).querySelector('.chip.ghost')?.textContent).toContain('Reunião');
    expect(el.querySelector('.sec')?.textContent).toContain('Sem prazo');
  });

  it('semana mostra 7 dias e navega para a seguinte', async () => {
    const { fixture, el } = await montar('semana');
    expect(el.querySelectorAll('.cal-day')).toHaveLength(7);
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('19 out – 25 out 2026');
    (el.querySelector('[aria-label="Próximo"]') as HTMLButtonElement).click();
    await estabilizar(fixture);
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('26 out – 1 nov 2026');
  });

  it('soltar num dia muda o prazo e avisa', async () => {
    const atualizar = vi
      .fn()
      .mockResolvedValue(item({ id: 'h', nome: 'Hoje', prazo: '2026-10-27' }));
    const { fixture } = await montar('mes', { atualizar });
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    const comp = fixture.componentInstance as unknown as {
      soltou(e: unknown): Promise<void>;
    };
    await comp.soltou({
      item: { data: ITENS[1] },
      container: { data: '2026-10-27' },
      previousContainer: { data: HOJE },
    });
    expect(atualizar).toHaveBeenCalledWith('h', { prazo: '2026-10-27' });
    expect(sucesso).toHaveBeenCalledWith('Prazo de "Hoje" mudou para 27/10.');
  });
});
