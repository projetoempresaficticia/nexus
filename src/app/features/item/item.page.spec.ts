import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { dadosIniciais, SETORES } from '../../../testing/dados-iniciais';
import { item } from '../../../testing/item';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensService } from '../../core/itens/itens.service';
import { podeEditarItem } from '../../core/itens/permissoes';
import { Item } from '../../core/models/item.model';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { TituloEditavelComponent } from '../../shared/ui/titulo-editavel.component';
import { ItemPage } from './item.page';

const ITENS: Item[] = [
  item({ id: 'p', nivel: 0, nome: 'Turmas', meu_envolvimento: ['contexto'], criado_por: 'outro' }),
  item({
    id: 't',
    pai_id: 'p',
    nome: 'Calendário',
    responsaveis: ['p-eu'],
    meu_envolvimento: ['responsavel'],
  }),
  item({ id: 's', pai_id: 't', nivel: 2, nome: 'Sala', criado_por: 'outro' }),
];

async function montarPagina(
  id: string,
  servico: Partial<Record<keyof ItensService, unknown>> = {},
) {
  TestBed.configureTestingModule({
    imports: [ItemPage],
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
      {
        provide: ItensService,
        useValue: {
          listar: vi.fn().mockResolvedValue(ITENS),
          obter: vi.fn().mockResolvedValue(null),
          ...servico,
        },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(ItemPage);
  fixture.componentRef.setInput('id', id);
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('podeEditarItem', () => {
  it('responsável, criador ou quem administra o setor', () => {
    expect(podeEditarItem(ITENS[1], 'p-eu', new Set())).toBe(true);
    expect(podeEditarItem(ITENS[0], 'p-eu', new Set())).toBe(false);
    expect(podeEditarItem(ITENS[0], 'p-eu', new Set([ITENS[0].setor_id]))).toBe(true);
    expect(podeEditarItem(ITENS[1], null, new Set())).toBe(false);
  });
});

describe('ItemPage', () => {
  it('mostra o caminho clicável e o título editável para o responsável', async () => {
    const { el } = await montarPagina('t');
    expect([...el.querySelectorAll('.crumbs a')].map((a) => a.textContent?.trim())).toEqual([
      'Turmas',
    ]);
    expect(el.querySelector('app-titulo-editavel .lapis')).toBeTruthy();
    expect(el.querySelector('.notice')).toBeNull();
  });

  it('item só de contexto fica em leitura (US-09)', async () => {
    const { el } = await montarPagina('p');
    expect(el.querySelector('.notice')).toBeTruthy();
    expect(el.querySelector('app-titulo-editavel .lapis')).toBeNull();
    expect((el.querySelector('.st-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('item inexistente mostra a mensagem', async () => {
    const { el } = await montarPagina('nao-existe');
    expect(el.textContent).toContain('Não encontramos este item');
  });

  it('bloquear pede motivo e concluir com filhos abertos pede confirmação', async () => {
    const mudarStatus = vi.fn().mockResolvedValue({ item: ITENS[1], novo_item_recorrente: null });
    const { fixture, el } = await montarPagina('t', { mudarStatus });
    const botao = (txt: string) =>
      [...el.querySelectorAll('.st-btn')].find((b) => b.textContent?.trim() === txt) as HTMLElement;

    botao('Bloqueada').click();
    await fixture.whenStable();
    expect(el.querySelector('[role=dialog]')).toBeTruthy();
    (
      [...el.querySelectorAll('[role=dialog] button')].find(
        (b) => b.textContent?.trim() === 'Bloqueada',
      ) as HTMLElement
    ).click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Conte o motivo do bloqueio');
    expect(mudarStatus).not.toHaveBeenCalled();

    const conf = TestBed.inject(ConfirmacaoService);
    const perguntar = vi.spyOn(conf, 'perguntar').mockResolvedValue(false);
    botao('Concluída').click();
    await fixture.whenStable();
    expect(perguntar).toHaveBeenCalledWith(
      expect.objectContaining({ mensagem: expect.stringContaining('1 subtarefa(s)') }),
    );
    expect(mudarStatus).not.toHaveBeenCalled();
  });
});

@Component({
  imports: [TituloEditavelComponent],
  template: `<app-titulo-editavel
    [texto]="texto()"
    [podeEditar]="true"
    (salvar)="salvos.push($event)"
  />`,
})
class HostTitulo {
  readonly texto = signal('Calendário');
  readonly salvos: string[] = [];
}

describe('TituloEditavelComponent (US-09)', () => {
  it('Enter salva, Esc cancela e vazio não é aceite', async () => {
    const fixture = TestBed.createComponent(HostTitulo);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const abrir = async () => {
      (el.querySelector('.texto') as HTMLElement).click();
      await fixture.whenStable();
      return el.querySelector('input') as HTMLInputElement;
    };
    const tecla = (i: HTMLInputElement, key: string) =>
      i.dispatchEvent(new KeyboardEvent('keydown', { key }));

    let campo = await abrir();
    campo.value = '   ';
    campo.dispatchEvent(new Event('input'));
    tecla(campo, 'Enter');
    await fixture.whenStable();
    expect(el.textContent).toContain('O título não pode ficar vazio.');

    tecla(campo, 'Escape');
    await fixture.whenStable();
    expect(el.querySelector('input')).toBeNull();

    campo = await abrir();
    campo.value = 'Calendário de novembro';
    campo.dispatchEvent(new Event('input'));
    tecla(campo, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.salvos).toEqual(['Calendário de novembro']);
  });
});
