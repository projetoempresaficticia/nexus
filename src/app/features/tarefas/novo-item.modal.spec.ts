import { TestBed } from '@angular/core/testing';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { ItensStore } from '../../core/itens/itens.store';
import { NovoItemModal } from './novo-item.modal';

describe('NovoItemModal', () => {
  async function montar() {
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
        nome: 'Elisa',
        iniciais: 'ER',
        email: 'e@x',
        vinculos: [{ setor_id: SETORES.financeiro, papel: 'lider' }],
      },
    ];
    const criar = vi.fn().mockResolvedValue(item({ id: 'novo' }));
    TestBed.configureTestingModule({
      imports: [NovoItemModal],
      providers: [
        {
          provide: AcessoService,
          useValue: {
            carregarInicial: vi.fn().mockResolvedValue(dados),
            contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          },
        },
        { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue([]), criar } },
      ],
    });
    await TestBed.inject(AcessoStore).carregar();
    await TestBed.inject(ItensStore).carregar();
    const fixture = TestBed.createComponent(NovoItemModal);
    const fechou = vi.fn();
    fixture.componentInstance.fechar.subscribe(fechou);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, criar, fechou };
  }
  const botao = (el: HTMLElement, texto: string) =>
    [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === texto) as HTMLElement;
  const digitar = (input: HTMLInputElement, valor: string, evento = 'input') => {
    input.value = valor;
    input.dispatchEvent(new Event(evento));
  };

  it('exige nome e não deixa prazo antes do início (US-08)', async () => {
    const { fixture, el, criar } = await montar();
    botao(el, 'Criar').click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Dê um nome à tarefa.');
    const datas = el.querySelectorAll('input[type=date]');
    digitar(datas[0] as HTMLInputElement, '2026-11-10', 'change');
    digitar(datas[1] as HTMLInputElement, '2026-11-01', 'change');
    await fixture.whenStable();
    expect(el.textContent).toContain('O prazo não pode ser antes do início.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('cria tarefa sem projeto com o setor e eu como responsável (US-34, US-35)', async () => {
    const { fixture, el, criar, fechou } = await montar();
    expect(el.querySelector('.chip')?.textContent).toContain('Ana Ribeiro');
    digitar(el.querySelector('input[type=text]') as HTMLInputElement, '  Ligar para a escola  ');
    await fixture.whenStable();
    botao(el, 'Criar').click();
    await new Promise((r) => setTimeout(r));
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        nivel: 1,
        pai_id: null,
        setor_id: SETORES.sucesso,
        nome: 'Ligar para a escola',
        responsaveis: ['p-eu'],
      }),
    );
    expect(fechou).toHaveBeenCalled();
  });

  it('só oferece como responsável quem tem vínculo no setor', async () => {
    const { fixture, el } = await montar();
    (el.querySelector('.chip .x') as HTMLElement).click();
    await fixture.whenStable();
    const busca = el.querySelector('input[type=search]') as HTMLInputElement;
    digitar(busca, 'a');
    await fixture.whenStable();
    const nomes = () => [...el.querySelectorAll('.lista .mi')].map((b) => b.textContent?.trim());
    expect(nomes()).toEqual(['ARAna Ribeiro']);
    digitar(busca, 'elisa');
    await fixture.whenStable();
    expect(nomes()).toEqual([]);
  });
});
