import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { item } from '../../../../testing/item';
import { ItensService } from '../../../core/itens/itens.service';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { GanttComponent } from './gantt.component';

// Sábado 24/10/2026 → o período começa na segunda 12/10 e tem 70 dias (até 20/12)
const HOJE = '2026-10-24';
const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Matrículas', inicio: '2026-10-12', prazo: '2026-11-30' }),
  item({
    id: 't1',
    pai_id: 'p',
    projeto_id: 'p',
    nome: 'Contratos assinados',
    inicio: '2026-10-14',
    prazo: '2026-10-28',
    status: 'concluida',
  }),
  item({ id: 't2', pai_id: 'p', projeto_id: 'p', nome: 'Marco', prazo: '2026-11-02' }),
  item({ id: 't3', pai_id: 'p', projeto_id: 'p', nome: 'Sem datas' }),
  item({ id: 'a', nome: 'Avulsa', inicio: '2026-10-20', prazo: '2026-10-22', atrasado: true }),
  item({ id: 'x', nome: 'Muito depois', inicio: '2027-03-01', prazo: '2027-03-05' }),
];

async function montar() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS) } },
    ],
  });
  await TestBed.inject(ItensStore).carregar();
  const fixture = TestBed.createComponent(GanttComponent);
  fixture.componentRef.setInput('itens', ITENS);
  fixture.componentRef.setInput('hoje', HOJE);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const linha = (nome: string) =>
    [...el.querySelectorAll('.g-row:not(.g-head)')].find(
      (r) => r.querySelector('.g-label .t')?.textContent?.trim() === nome,
    ) as HTMLElement;
  return { fixture, el, linha };
}

describe('GanttComponent', () => {
  it('mostra 10 semanas a partir da segunda da semana passada e a linha de hoje', async () => {
    const { el } = await montar();
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('12/10 a 20/12');
    expect(el.querySelectorAll('.g-week')).toHaveLength(10);
    expect(el.querySelector('.g-week.cur')?.textContent?.trim()).toBe('19/10');
    expect((el.querySelector('.g-head .g-today') as HTMLElement).style.left).toBe(
      `${12 * 26 + 13}px`,
    );
  });

  it('barra do início ao prazo; projeto com progresso; marco sem início; atrasado com contorno', async () => {
    const { linha } = await montar();
    const proj = linha('Matrículas').querySelector('.gbar.projbar > span') as HTMLElement;
    expect(proj.style.width).toBe('33%');
    const barra = linha('Contratos assinados').querySelector('.gbar') as HTMLElement;
    expect(barra.style.left).toBe(`${2 * 26}px`);
    expect(barra.style.width).toBe(`${15 * 26}px`);
    expect(barra.classList).toContain('s-done');
    expect(linha('Marco').querySelector('.marco')).toBeTruthy();
    expect(linha('Sem datas').textContent).toContain('Sem datas');
    expect(linha('Avulsa').querySelector('.gbar')?.classList).toContain('late');
    expect(linha('Muito depois').querySelector('.gbar, .marco')).toBeNull();
  });

  it('a ordem segue a árvore e ‹ › andam duas semanas', async () => {
    const { fixture, el } = await montar();
    expect(
      [...el.querySelectorAll('.g-row:not(.g-head) .t')].map((t) => t.textContent?.trim()),
    ).toEqual([
      'Matrículas',
      'Contratos assinados',
      'Marco',
      'Sem datas',
      'Avulsa',
      'Muito depois',
    ]);
    (el.querySelector('[aria-label="Duas semanas depois"]') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('26/10 a 03/01');
  });
});
