import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { SUPABASE } from '../../core/supabase.client';
import { EquipePage } from './equipe.page';

async function montar() {
  // Eu: membro de Sucesso do Aluno (Secretaria > Pedagógico > Sucesso). Secretaria e Pedagógico só como caminho.
  const dados = dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]);
  dados.setores = dados.setores.filter((s) => s.id !== SETORES.financeiro);
  dados.pessoas = [
    {
      id: 'p-eu',
      nome: 'Ana Ribeiro',
      iniciais: 'AR',
      email: 'a@x',
      vinculos: [{ setor_id: SETORES.sucesso, papel: 'membro' }],
    },
    {
      id: 'p-bruno',
      nome: 'Bruno Costa',
      iniciais: 'BC',
      email: 'b@x',
      vinculos: [{ setor_id: SETORES.sucesso, papel: 'lider' }],
    },
    {
      id: 'p-carla',
      nome: 'Carla Dias',
      iniciais: 'CD',
      email: 'c@x',
      vinculos: [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
    },
  ];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: SUPABASE, useValue: supabaseFalso() },
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
      {
        provide: ItensService,
        useValue: {
          listar: vi
            .fn()
            .mockResolvedValue([
              item({ id: 'p', nivel: 0, nome: 'Matrículas', responsaveis: ['p-bruno'] }),
              item({ id: 't', pai_id: 'p', projeto_id: 'p', nome: 'T', status: 'concluida' }),
              item({ id: 't2', nome: 'Aberta' }),
            ]),
        },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(EquipePage);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('EquipePage (US-06)', () => {
  it('minha linha de decisão: eu → líder do setor → líder de cima', async () => {
    const { el } = await montar();
    const linha = el.querySelector('.sec .linha')!;
    expect(linha.textContent).toContain(
      'Secretaria › Pedagógico › Sucesso do Aluno · você é membro',
    );
    expect([...linha.querySelectorAll('.step strong')].map((s) => s.textContent?.trim())).toEqual([
      'Você',
      'Bruno Costa',
      'Carla Dias',
    ]);
  });

  it('organograma com setores de cima esmaecidos, líder, pessoas, projetos e abertos', async () => {
    const { el } = await montar();
    const nomes = [...el.querySelectorAll('.org-head .nm')].map((n) =>
      n.firstChild?.textContent?.trim(),
    );
    expect(nomes).toEqual(['Secretaria', 'Pedagógico', 'Sucesso do Aluno']);
    const nos = [...el.querySelectorAll('.org-node')];
    expect(nos[0].classList).toContain('ghost');
    expect(nos[0].textContent).toContain('Sem líder definido');
    const meu = nos[2];
    expect(meu.classList).toContain('mine');
    expect(meu.querySelector('.org-head')?.textContent).toContain(
      '2 pessoa(s) · 1 projeto(s) · 1 itens abertos',
    );
    expect(meu.querySelector('.org-body')?.textContent).toContain('Matrículas');
    expect(meu.querySelector('.proj-line .pct')?.textContent?.trim()).toBe('100%');
  });

  it('detalhes de um setor de cima avisam que os projetos não são visíveis', async () => {
    const { fixture, el } = await montar();
    const ped = el.querySelectorAll('.org-node')[1];
    expect(ped.querySelector('.org-body')).toBeNull();
    (
      [...ped.querySelectorAll('.org-head button')].find(
        (b) => b.textContent?.trim() === 'Detalhes',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(ped.querySelector('.org-body')?.textContent).toContain(
      'Os projetos ficam visíveis para quem participa deste setor.',
    );
  });
});
