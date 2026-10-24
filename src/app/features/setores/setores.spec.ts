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
