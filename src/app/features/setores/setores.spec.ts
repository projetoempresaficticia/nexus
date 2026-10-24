import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { DadosIniciais } from '../../core/models/acesso.model';
import { ErroApi } from '../../core/services/erro-api';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ToastService } from '../../shared/ui/toast.service';
import { NovoSetorModal } from './novo-setor.modal';
import { SetoresPage } from './setores.page';
import { SetoresService } from './setores.service';

async function preparar(
  dados: DadosIniciais,
  servico: Partial<Record<keyof SetoresService, unknown>>,
) {
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
      { provide: SetoresService, useValue: servico },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
}

const adm = () => {
  const d = dadosIniciais(
    [],
    [SETORES.secretaria, SETORES.pedagogico, SETORES.sucesso, SETORES.financeiro],
    true,
  );
  d.setores = d.setores.map((s) => ({ ...s, visivel: true }));
  return d;
};

async function estabilizar(f: { whenStable(): Promise<unknown> }) {
  await f.whenStable();
  await new Promise((r) => setTimeout(r));
  await f.whenStable();
}

describe('SetoresPage (US-05)', () => {
  it('árvore com recuo; mover não oferece o próprio setor nem os de baixo', async () => {
    await preparar(adm(), {});
    const fixture = TestBed.createComponent(SetoresPage);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const linhas = [...el.querySelectorAll('.tree-row')];
    expect(linhas.map((l) => l.querySelector('.nome strong')?.textContent?.trim())).toEqual([
      'Financeiro',
      'Secretaria',
      'Pedagógico',
      'Sucesso do Aluno',
    ]);
    const opcoes = [...linhas[2].querySelectorAll('select option')].map((o) =>
      o.textContent?.trim(),
    );
    expect(opcoes).toContain('Secretaria');
    expect(opcoes).not.toContain('Pedagógico');
    expect(opcoes).not.toContain('Sucesso do Aluno');
  });

  it('mover recusado pelo banco (ciclo) avisa e volta a escolha', async () => {
    const alterar = vi.fn().mockRejectedValue(new ErroApi('ciclo_setor'));
    await preparar(adm(), { alterar });
    const fixture = TestBed.createComponent(SetoresPage);
    await estabilizar(fixture);
    const erro = vi.spyOn(TestBed.inject(ToastService), 'erro');
    const linha = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.tree-row')][2];
    const select = linha.querySelector('select') as HTMLSelectElement;
    select.value = SETORES.financeiro;
    select.dispatchEvent(new Event('change'));
    await estabilizar(fixture);
    expect(alterar).toHaveBeenCalledWith(SETORES.pedagogico, { pai_id: SETORES.financeiro });
    expect(erro).toHaveBeenCalled();
    expect(select.value).toBe(SETORES.secretaria);
  });

  it('renomear com Enter e desativar com confirmação', async () => {
    const alterar = vi.fn().mockResolvedValue(undefined);
    await preparar(adm(), { alterar });
    const fixture = TestBed.createComponent(SetoresPage);
    await estabilizar(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const linha = () => [...el.querySelectorAll('.tree-row')][0];
    const botao = (txt: string) =>
      [...linha().querySelectorAll('button')].find((b) => b.textContent?.trim() === txt)!;
    botao('Renomear').click();
    await estabilizar(fixture);
    const input = linha().querySelector('input') as HTMLInputElement;
    input.value = 'Financeiro e Contas';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await estabilizar(fixture);
    expect(alterar).toHaveBeenCalledWith(SETORES.financeiro, { nome: 'Financeiro e Contas' });
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(true);
    botao('Desativar').click();
    await estabilizar(fixture);
    expect(alterar).toHaveBeenLastCalledWith(SETORES.financeiro, { ativo: false });
  });
});

describe('SetoresPage — excluir e arrastar (T-51)', () => {
  async function montar(servico: Partial<Record<keyof SetoresService, unknown>>) {
    await preparar(adm(), servico);
    const fixture = TestBed.createComponent(SetoresPage);
    await estabilizar(fixture);
    return { fixture, comp: fixture.componentInstance as unknown as Record<string, unknown> };
  }

  it('excluir pede confirmação e mostra o motivo quando o banco recusa', async () => {
    const excluir = vi.fn().mockRejectedValue(new ErroApi('setor_com_pessoas'));
    const { fixture } = await montar({ excluir });
    const erro = vi.spyOn(TestBed.inject(ToastService), 'erro');
    vi.spyOn(TestBed.inject(ConfirmacaoService), 'perguntar').mockResolvedValue(true);
    const linha = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.tree-row')][0];
    [...linha.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Excluir')!.click();
    await estabilizar(fixture);
    expect(excluir).toHaveBeenCalledWith(SETORES.financeiro);
    expect((erro.mock.calls[0][0] as ErroApi).codigo).toBe('setor_com_pessoas');
  });

  it('arrastar não aceita soltar no próprio setor nem nos de baixo', async () => {
    const { comp } = await montar({});
    const pode = comp['podeSoltar'] as (a: { data: string }, b: { data: string }) => boolean;
    expect(pode({ data: SETORES.pedagogico }, { data: SETORES.sucesso })).toBe(false);
    expect(pode({ data: SETORES.pedagogico }, { data: SETORES.pedagogico })).toBe(false);
    expect(pode({ data: SETORES.pedagogico }, { data: SETORES.financeiro })).toBe(true);
    // faixa "setor principal": só para quem ainda tem setor de cima
    expect(pode({ data: SETORES.pedagogico }, { data: '' })).toBe(true);
    expect(pode({ data: SETORES.financeiro }, { data: '' })).toBe(false);
  });

  it('soltar noutro setor muda o setor de cima', async () => {
    const alterar = vi.fn().mockResolvedValue(undefined);
    const { comp } = await montar({ alterar });
    const sucesso = vi.spyOn(TestBed.inject(ToastService), 'sucesso');
    await (comp['soltou'] as (e: unknown) => Promise<void>)({
      item: { data: SETORES.sucesso },
      container: { data: SETORES.financeiro },
      previousContainer: { data: SETORES.sucesso },
    });
    expect(alterar).toHaveBeenCalledWith(SETORES.sucesso, { pai_id: SETORES.financeiro });
    expect(sucesso).toHaveBeenCalledWith('"Sucesso do Aluno" agora fica dentro de Financeiro.');
  });
});

describe('SetoresPage — líder (T-51b)', () => {
  async function montarLider() {
    const lider = dadosIniciais(
      [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
      [SETORES.pedagogico, SETORES.sucesso],
    );
    await preparar(lider, {});
    const fixture = TestBed.createComponent(SetoresPage);
    await estabilizar(fixture);
    return { fixture, comp: fixture.componentInstance as unknown as Record<string, unknown> };
  }

  it('vê só o que lidera; ações só nos subsetores abaixo dele', async () => {
    const { fixture } = await montarLider();
    const el = fixture.nativeElement as HTMLElement;
    const linhas = [...el.querySelectorAll('.tree-row')];
    expect(linhas.map((l) => l.querySelector('.nome strong')?.textContent?.trim())).toEqual([
      'Pedagógico',
      'Sucesso do Aluno',
    ]);
    const textos = (l: Element) =>
      [...l.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(textos(linhas[0])).not.toContain('Excluir');
    expect(linhas[0].querySelector('select')).toBeNull();
    expect(textos(linhas[1])).toContain('Excluir');
    expect(el.querySelector('.principal')).toBeNull();
    expect(textos(el).includes('+ Novo setor')).toBe(false);
  });

  it('arrastar só para dentro do que administra, nunca para setor principal', async () => {
    const { comp } = await montarLider();
    const pode = comp['podeSoltar'] as (a: { data: string }, b: { data: string }) => boolean;
    expect(pode({ data: SETORES.sucesso }, { data: SETORES.pedagogico })).toBe(true);
    expect(pode({ data: SETORES.sucesso }, { data: SETORES.financeiro })).toBe(false);
    expect(pode({ data: SETORES.sucesso }, { data: '' })).toBe(false);
  });
});

describe('NovoSetorModal', () => {
  it('líder só cria dentro do que administra (sem "setor principal")', async () => {
    const criar = vi.fn().mockResolvedValue(undefined);
    const lider = dadosIniciais(
      [{ setor_id: SETORES.pedagogico, papel: 'lider' }],
      [SETORES.pedagogico, SETORES.sucesso],
    );
    await preparar(lider, { criar });
    const fixture = TestBed.createComponent(NovoSetorModal);
    fixture.componentRef.setInput('pai', SETORES.pedagogico);
    await estabilizar(fixture);
    const modal = document.querySelector('[role=dialog]')!;
    const opcoes = [...modal.querySelectorAll('select option')].map((o) => o.textContent?.trim());
    expect(opcoes).not.toContain('Nenhum (setor principal)');
    expect(opcoes.some((o) => o?.includes('Secretaria'))).toBe(false);
    const nome = modal.querySelector('input') as HTMLInputElement;
    nome.value = 'Plataforma';
    nome.dispatchEvent(new Event('input'));
    [...modal.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Criar')!.click();
    await estabilizar(fixture);
    expect(criar).toHaveBeenCalledWith('Plataforma', SETORES.pedagogico, 'p-eu');
  });
});
