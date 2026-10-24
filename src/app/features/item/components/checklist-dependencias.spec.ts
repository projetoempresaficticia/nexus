import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { item } from '../../../../testing/item';
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
    ],
  });
  await TestBed.inject(ItensStore).carregar();
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
    const campo = el.querySelector('#ck-novo') as HTMLInputElement;
    campo.value = 'Validar';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(adicionarPasso).toHaveBeenCalledWith('t', 'Validar', 1);
    expect(el.querySelector('.passo label')?.textContent).toBe('Validar');
  });

  it('sem permissão não mostra o campo de novo passo', async () => {
    await preparar({ listarChecklist: vi.fn().mockResolvedValue([passo('1', 'A')]) });
    const { el } = await montar(ChecklistItemComponent, false);
    expect(el.querySelector('#ck-novo')).toBeNull();
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
