import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ErroApi } from '../../core/services/erro-api';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ToastService } from '../../shared/ui/toast.service';
import { Usuario, UsuariosService } from './usuarios.service';
import { UsuariosPage } from './usuarios.page';

const USUARIOS: Usuario[] = [
  {
    id: 'p-eu',
    nome: 'Ana Ribeiro',
    email: 'ana@estudeemportugal.org',
    iniciais: 'AR',
    ativo: true,
    is_admin: true,
    desativado_em: null,
    conta_teste: false,
    vinculos: [],
  },
  {
    id: 'p-bruno',
    nome: 'Bruno Costa',
    email: 'bruno@estudeemportugal.org',
    iniciais: 'BC',
    ativo: true,
    is_admin: false,
    desativado_em: null,
    conta_teste: false,
    vinculos: [{ setor_id: SETORES.sucesso, papel: 'lider' }],
  },
  {
    id: 'p-velho',
    nome: 'Zé Antigo',
    email: 'ze@estudeemportugal.org',
    iniciais: 'ZA',
    ativo: false,
    is_admin: false,
    desativado_em: '2026-09-01T00:00:00Z',
    conta_teste: false,
    vinculos: [],
  },
];

async function montar(servico: Partial<Record<keyof UsuariosService, unknown>> = {}) {
  const dados = dadosIniciais([], [], true);
  dados.setores = dados.setores.map((s) => ({ ...s, visivel: true }));
  dados.pessoas = [
    { id: 'p-eu', nome: 'Ana Ribeiro', iniciais: 'AR', email: 'a@x', vinculos: [] },
    { id: 'p-bruno', nome: 'Bruno Costa', iniciais: 'BC', email: 'b@x', vinculos: [] },
    { id: 'p-carla', nome: 'Carla Dias', iniciais: 'CD', email: 'c@x', vinculos: [] },
  ];
  const listar = vi.fn().mockResolvedValue(USUARIOS);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dados),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          pessoasInativas: vi
            .fn()
            .mockResolvedValue([{ id: 'p-velho', nome: 'Zé Antigo', iniciais: 'ZA' }]),
        },
      },
      { provide: UsuariosService, useValue: { listar, ...servico } },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(UsuariosPage);
  const el = fixture.nativeElement as HTMLElement;
  const estabilizar = async () => {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
  };
  await estabilizar();
  const botao = (txt: string, raiz: ParentNode = el) =>
    [...raiz.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === txt,
    ) as HTMLButtonElement;
  const nomes = () => [...el.querySelectorAll('.usuario strong')].map((s) => s.textContent?.trim());
  return { fixture, el, estabilizar, botao, nomes, listar };
}

describe('UsuariosPage (US-03, US-04)', () => {
  it('lista ativos com vínculos; inativos só ao marcar; busca por nome ou e-mail', async () => {
    const { el, estabilizar, nomes } = await montar();
    expect(el.querySelector('app-cabecalho')?.textContent).toContain('2 ativo(s) · 1 inativo(s)');
    expect(nomes()).toEqual(['Ana Ribeiro', 'Bruno Costa']);
    expect(el.textContent).toContain('Sucesso do Aluno · Líder');
    expect(el.textContent).toContain('Adm do sistema');
    const marca = el.querySelector('.marca input') as HTMLInputElement;
    marca.checked = true;
    marca.dispatchEvent(new Event('change'));
    await estabilizar();
    expect(nomes()).toContain('Zé Antigo');
    const busca = el.querySelector('.busca') as HTMLInputElement;
    busca.value = 'bruno@';
    busca.dispatchEvent(new Event('input'));
    await estabilizar();
    expect(nomes()).toEqual(['Bruno Costa']);
  });

  it('não mostra Desativar para a própria conta', async () => {
    const { el } = await montar();
    const linhas = [...el.querySelectorAll('.usuario')];
    expect(linhas[0].textContent).not.toContain('Desativar');
    expect(linhas[1].textContent).toContain('Desativar');
  });

  it('cadastrar mostra o erro do banco no formulário e recarrega ao dar certo', async () => {
    const cadastrar = vi
      .fn()
      .mockRejectedValueOnce(new ErroApi('email_ja_cadastrado'))
      .mockResolvedValueOnce(undefined);
    const { el, estabilizar, botao, listar } = await montar({ cadastrar });
    botao('+ Novo usuário').click();
    await estabilizar();
    const modal = document.querySelector('[role=dialog]')!;
    const [nome, email] = [...modal.querySelectorAll('input')] as HTMLInputElement[];
    nome.value = 'Carla Dias';
    nome.dispatchEvent(new Event('input'));
    email.value = 'carla@estudeemportugal.org';
    email.dispatchEvent(new Event('input'));
    botao('Cadastrar', modal).click();
    await estabilizar();
    expect(modal.querySelector('.erro')?.textContent).toContain('já está cadastrado');
    botao('Cadastrar', modal).click();
    await estabilizar();
    expect(cadastrar).toHaveBeenLastCalledWith('carla@estudeemportugal.org', 'Carla Dias', []);
    expect(listar).toHaveBeenCalledTimes(2);
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('desativar com itens abertos abre a reatribuição', async () => {
    const desativar = vi.fn().mockResolvedValue([
      {
        id: 'i1',
        nome: 'Contrato',
        nivel: 1,
        setor_id: SETORES.sucesso,
        prazo: null,
        status: 'a_fazer',
      },
    ]);
    const reatribuir = vi.fn().mockResolvedValue(1);
    const { estabilizar, botao } = await montar({ desativar, reatribuir });
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(true);
    botao('Desativar').click();
    await estabilizar();
    expect(desativar).toHaveBeenCalledWith('p-bruno');
    const modal = document.querySelector('[role=dialog]')!;
    expect(modal.textContent).toContain('Contrato');
    const select = modal.querySelector('select') as HTMLSelectElement;
    select.value = 'p-carla';
    select.dispatchEvent(new Event('change'));
    await estabilizar();
    botao('Reatribuir', modal).click();
    await estabilizar();
    expect(reatribuir).toHaveBeenCalledWith('p-bruno', 'p-carla');
    expect(sucesso).toHaveBeenLastCalledWith('1 item(ns) agora são de Carla Dias.');
  });

  it('vínculos: adiciona setor, troca papel e salva tudo de uma vez', async () => {
    const salvarVinculos = vi.fn().mockResolvedValue(undefined);
    const { estabilizar, botao } = await montar({ salvarVinculos });
    [...document.querySelectorAll('.usuario')][1].querySelector('button')!.click();
    await estabilizar();
    const modal = document.querySelector('[role=dialog]')!;
    const papel = modal.querySelector('.vinculo select') as HTMLSelectElement;
    papel.value = 'membro';
    papel.dispatchEvent(new Event('change'));
    const novo = modal.querySelector('.fld select') as HTMLSelectElement;
    novo.value = SETORES.financeiro;
    novo.dispatchEvent(new Event('change'));
    await estabilizar();
    botao('Salvar', modal).click();
    await estabilizar();
    expect(salvarVinculos).toHaveBeenCalledWith('p-bruno', [
      { setor_id: SETORES.sucesso, papel: 'membro' },
      { setor_id: SETORES.financeiro, papel: 'membro' },
    ]);
  });

  it('o nome de quem saiu continua disponível para comentários e histórico', async () => {
    await montar();
    await new Promise((r) => setTimeout(r));
    expect(TestBed.inject(AcessoStore).pessoaPorId().get('p-velho')?.nome).toBe('Zé Antigo');
    expect(
      TestBed.inject(AcessoStore)
        .pessoas()
        .some((p) => p.id === 'p-velho'),
    ).toBe(false);
  });

  describe('conta de teste e e-mails em massa (T-65)', () => {
    it('marcar conta de teste muda na hora; volta se o servidor recusar', async () => {
      const atualizarContaTeste = vi.fn().mockRejectedValue(new ErroApi('rede'));
      const { el, estabilizar } = await montar({ atualizarContaTeste });
      const erro = vi.spyOn(TestBed.inject(ToastService), 'erro');
      const caixa = el.querySelector('.conta-teste-pessoa input') as HTMLInputElement;
      expect(caixa.checked).toBe(false);
      caixa.checked = true;
      caixa.dispatchEvent(new Event('change'));
      await estabilizar();
      expect(atualizarContaTeste).toHaveBeenCalledWith('p-eu', true);
      expect(erro).toHaveBeenCalled();
    });

    it('ligar/desligar e-mail para todos pede confirmação', async () => {
      const atualizarPreferenciaEmailTodos = vi.fn().mockResolvedValue(undefined);
      const { estabilizar, botao } = await montar({ atualizarPreferenciaEmailTodos });
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(true);
      botao('Desligar e-mail para todos').click();
      await estabilizar();
      expect(atualizarPreferenciaEmailTodos).toHaveBeenCalledWith(false);
    });
  });
});
