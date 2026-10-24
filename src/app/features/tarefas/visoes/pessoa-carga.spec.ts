import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensService } from '../../../core/itens/itens.service';
import { ItensStore } from '../../../core/itens/itens.store';
import { Pessoa } from '../../../core/models/acesso.model';
import { Item } from '../../../core/models/item.model';
import { ToastService } from '../../../shared/ui/toast.service';
import { CargaComponent } from './carga.component';
import { PorPessoaComponent } from './por-pessoa.component';

const HOJE = '2026-10-24';
const PESSOAS: Pessoa[] = [
  {
    id: 'p-bruno',
    nome: 'Bruno Costa',
    iniciais: 'BC',
    email: 'b@x',
    vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
  },
  {
    id: 'p-carla',
    nome: 'Carla Dias',
    iniciais: 'CD',
    email: 'c@x',
    vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
  },
];
const ITENS: Item[] = [
  item({
    id: 'a',
    nome: 'Atrasada',
    responsaveis: ['p-bruno'],
    prazo: '2026-10-20',
    atrasado: true,
  }),
  item({
    id: 'b',
    nome: 'Bloqueada',
    responsaveis: ['p-bruno'],
    status: 'bloqueada',
    prazo: '2026-10-28',
  }),
  item({ id: 'c', nome: 'Da Carla', responsaveis: ['p-carla'], prazo: '2026-11-06' }),
];

async function preparar(servico: Partial<Record<keyof ItensService, unknown>> = {}) {
  const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'lider' }], [SETORES.sucesso]);
  dados.pessoas = PESSOAS;
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
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS), ...servico } },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  await TestBed.inject(ItensStore).carregar();
}

describe('PorPessoaComponent', () => {
  async function montar(servico = {}) {
    await preparar(servico);
    const fixture = TestBed.createComponent(PorPessoaComponent);
    fixture.componentRef.setInput('itens', ITENS);
    fixture.componentRef.setInput('pessoas', PESSOAS);
    fixture.componentRef.setInput('hoje', HOJE);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('uma coluna por pessoa com contagem, atrasados e parados', async () => {
    const { el } = await montar();
    const colunas = [...el.querySelectorAll('.kcol')];
    expect(colunas.map((c) => c.querySelector('.nome')?.textContent?.trim())).toEqual([
      'Bruno Costa',
      'Carla Dias',
    ]);
    expect(colunas[0].querySelector('.n')?.textContent?.trim()).toBe('2');
    expect(colunas[0].textContent).toContain('1 atrasado(s)');
    expect(colunas[0].textContent).toContain('1 parado(s)');
    expect(colunas[0].querySelector('.row-sub')?.textContent).toContain('Sucesso do Aluno');
  });

  it('soltar noutra pessoa troca o responsável e avisa', async () => {
    const definirResponsaveis = vi.fn().mockResolvedValue(['p-carla']);
    const { fixture } = await montar({ definirResponsaveis });
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    const comp = fixture.componentInstance as unknown as { soltou(e: unknown): Promise<void> };
    await comp.soltou({
      item: { data: { item: ITENS[0], de: 'p-bruno' } },
      container: { data: 'p-carla' },
      previousContainer: { data: 'p-bruno' },
    });
    expect(definirResponsaveis).toHaveBeenCalledWith('a', ['p-carla']);
    expect(sucesso).toHaveBeenCalledWith('"Atrasada" agora é de Carla Dias.');
  });
});

describe('CargaComponent', () => {
  it('barras por status, total e mapa de prazos das 4 semanas', async () => {
    await preparar();
    const fixture = TestBed.createComponent(CargaComponent);
    fixture.componentRef.setInput('itens', ITENS);
    fixture.componentRef.setInput('pessoas', PESSOAS);
    fixture.componentRef.setInput('hoje', HOJE);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const bruno = el.querySelector('.load-row')!;
    expect(bruno.textContent).toContain('Bruno Costa');
    expect(bruno.querySelector('.total')?.textContent).toContain('2 abertos');
    expect(bruno.querySelector('.total')?.textContent).toContain('1 atrasado(s)');
    expect((bruno.querySelector('.stack .bloq') as HTMLElement).style.width).toBe('50%');
    expect([...el.querySelectorAll('.heat th')].map((t) => t.textContent?.trim())).toEqual([
      'Pessoa',
      'Esta semana',
      '26/10 a 01/11',
      '02/11 a 08/11',
      '09/11 a 15/11',
    ]);
    const linhaCarla = [...el.querySelectorAll('.heat tbody tr')][1];
    expect([...linhaCarla.querySelectorAll('td.cell')].map((t) => t.textContent?.trim())).toEqual([
      '·',
      '·',
      '1',
      '·',
    ]);
  });
});
