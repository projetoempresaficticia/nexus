import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../../testing/dados-iniciais';
import { item } from '../../../../testing/item';
import { AcessoService } from '../../../core/auth/acesso.service';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensService } from '../../../core/itens/itens.service';
import { ItensStore } from '../../../core/itens/itens.store';
import { ErroApi } from '../../../core/services/erro-api';
import { ToastService } from '../../../shared/ui/toast.service';
import { ItemService } from '../item.service';
import { ChecklistItemComponent } from './checklist-item.component';
import { DependenciasItemComponent } from './dependencias-item.component';

const passo = (id: string, texto: string, feito = false) => ({
  id,
  item_id: 't',
  texto,
  feito,
  ordem: 1,
});
const ITENS = [
  item({ id: 't', nome: 'Publicar' }),
  item({ id: 'a', nome: 'Fechar agenda', status: 'bloqueada' }),
  item({ id: 'b', nome: 'Boas-vindas' }),
];

async function preparar(servico: Partial<Record<keyof ItemService, unknown>>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ItemService, useValue: servico },
      { provide: ItensService, useValue: { listar: vi.fn().mockResolvedValue(ITENS) } },
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue({
            ...dadosIniciais([{ setor_id: SETORES.sucesso, papel: 'membro' }]),
            pessoas: [
              {
                id: '11111111-1111-1111-1111-111111111111',
                nome: 'Bruno Costa',
                iniciais: 'BC',
                email: 'b@x',
                vinculos: [],
              },
            ],
          }),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
        },
      },
    ],
  });
  await TestBed.inject(ItensStore).carregar();
  await TestBed.inject(AcessoStore).carregar();
}

async function montar<T>(tipo: Type<T>, podeEditar = true) {
  const fixture = TestBed.createComponent(tipo);
  fixture.componentRef.setInput('item', ITENS[0]);
  fixture.componentRef.setInput('podeEditar', podeEditar);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ChecklistItemComponent (US-11)', () => {
  it('marca um passo e a barra atualiza; se falhar, desmarca', async () => {
    const marcarPasso = vi.fn().mockResolvedValue(undefined);
    await preparar({
      listarChecklist: vi
        .fn()
        .mockResolvedValue([passo('1', 'Confirmar turmas', true), passo('2', 'Revisar modelo')]),
      marcarPasso,
    });
    const { fixture, el } = await montar(ChecklistItemComponent);
    expect(el.querySelector('.sec-h .row-sub')?.textContent).toContain('1 de 2 · 50%');

    const caixa = el.querySelectorAll('input[type=checkbox]')[1] as HTMLInputElement;
    caixa.checked = true;
    caixa.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(el.querySelector('.sec-h .row-sub')?.textContent).toContain('2 de 2 · 100%');
    expect(marcarPasso).toHaveBeenCalledWith('2', true);

    marcarPasso.mockRejectedValueOnce(new Error('rede'));
    caixa.checked = false;
    caixa.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(el.querySelector('.sec-h .row-sub')?.textContent).toContain('2 de 2 · 100%');
  });

  it('adiciona passo com Enter', async () => {
    const adicionarPasso = vi.fn().mockResolvedValue(passo('3', 'Validar'));
    await preparar({ listarChecklist: vi.fn().mockResolvedValue([]), adicionarPasso });
    const { fixture, el } = await montar(ChecklistItemComponent);
    const campo = el.querySelector('.novo input') as HTMLInputElement;
    campo.value = 'Validar';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(adicionarPasso).toHaveBeenCalledWith('t', 'Validar', 1);
    expect(el.querySelector('.passo .texto')?.textContent).toBe('Validar');
  });

  it('@ abre a lista de pessoas e o passo sai com a menção (US-40)', async () => {
    const adicionarPasso = vi.fn().mockResolvedValue(passo('3', 'x'));
    await preparar({ listarChecklist: vi.fn().mockResolvedValue([]), adicionarPasso });
    const { fixture, el } = await montar(ChecklistItemComponent);
    const campo = el.querySelector('.novo input') as HTMLInputElement;
    campo.value = 'Pedir a @Bru';
    campo.setSelectionRange(campo.value.length, campo.value.length);
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(el.querySelector('#mention-pop')?.textContent).toContain('Bruno Costa');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(campo.value).toBe('Pedir a @Bruno Costa ');
    expect(el.querySelector('#mention-pop')).toBeNull();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise((r) => setTimeout(r));
    expect(adicionarPasso).toHaveBeenCalledWith(
      't',
      'Pedir a <span class="mention" data-uid="11111111-1111-1111-1111-111111111111">@Bruno Costa</span>',
      1,
    );
  });

  it('duplo clique edita o texto; Esc cancela e Enter salva (US-40)', async () => {
    const editarPasso = vi.fn().mockResolvedValue(undefined);
    await preparar({
      listarChecklist: vi.fn().mockResolvedValue([passo('1', 'Confirmar turmas')]),
      editarPasso,
    });
    const { fixture, el } = await montar(ChecklistItemComponent);
    const texto = () => el.querySelector('.passo .texto') as HTMLElement;
    texto().dispatchEvent(new MouseEvent('dblclick'));
    await fixture.whenStable();
    let campo = el.querySelector('.passo input[type=text]') as HTMLInputElement;
    expect(campo.value).toBe('Confirmar turmas');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(texto().textContent).toBe('Confirmar turmas');

    texto().dispatchEvent(new MouseEvent('dblclick'));
    await fixture.whenStable();
    campo = el.querySelector('.passo input[type=text]') as HTMLInputElement;
    campo.value = 'Confirmar turmas & horários';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(editarPasso).toHaveBeenCalledExactlyOnceWith('1', 'Confirmar turmas &amp; horários');
    expect(texto().textContent).toBe('Confirmar turmas & horários');
  });

  it('sem permissão não mostra o campo de novo passo', async () => {
    await preparar({ listarChecklist: vi.fn().mockResolvedValue([passo('1', 'A')]) });
    const { el } = await montar(ChecklistItemComponent, false);
    expect(el.querySelector('.novo')).toBeNull();
    expect((el.querySelector('input[type=checkbox]') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('DependenciasItemComponent (US-12)', () => {
  it('lista o que espera e o que bloqueia; ciclo mostra erro', async () => {
    const definirDependencia = vi.fn().mockRejectedValue(new ErroApi('ciclo_dependencia'));
    await preparar({
      listarDependencias: vi.fn().mockResolvedValue([
        { item_id: 't', depende_de_id: 'a' },
        { item_id: 'b', depende_de_id: 't' },
      ]),
      definirDependencia,
    });
    const { el } = await montar(DependenciasItemComponent);
    const links = [...el.querySelectorAll('.dep a')].map((a) => a.textContent);
    expect(links).toEqual(['Fechar agenda', 'Boas-vindas']);

    const select = el.querySelector('select') as HTMLSelectElement;
    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    await new Promise((r) => setTimeout(r));
    expect(definirDependencia).toHaveBeenCalledWith('t', 'b', true);
    expect(TestBed.inject(ToastService).atual()?.texto).toBe('Essa dependência criaria um ciclo.');
  });
});
