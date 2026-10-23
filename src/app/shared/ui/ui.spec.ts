import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ErroApi } from '../../core/services/erro-api';
import { TEXTOS } from '../../core/models/textos';
import { AvataresComponent } from './avatares.component';
import { BarraComponent } from './barra.component';
import { ConfirmacaoService } from './confirmacao.service';
import { ModalComponent } from './modal.component';
import { PillStatusComponent } from './pill-status.component';
import { ToastService } from './toast.service';

const pessoa = (n: number) => ({ nome: `Pessoa ${n}`, iniciais: `P${n}` });

describe('AvataresComponent', () => {
  async function render(pessoas: { nome: string; iniciais: string }[]) {
    const fixture = TestBed.createComponent(AvataresComponent);
    fixture.componentRef.setInput('pessoas', pessoas);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra até 3 e "+N" com os nomes no título', async () => {
    const el = await render([1, 2, 3, 4, 5].map(pessoa));
    expect(el.querySelectorAll('app-avatar').length).toBe(3);
    expect(el.querySelector('.mais')?.textContent?.trim()).toBe('+2');
    expect(el.querySelector('.avs')?.getAttribute('title')).toContain('Pessoa 5');
  });

  it('sem pessoas mostra "Sem responsável"', async () => {
    const el = await render([]);
    expect(el.textContent).toContain(TEXTOS.comum.semResponsavel);
  });
});

describe('PillStatusComponent', () => {
  it('traduz status de item e de solicitação', async () => {
    const fixture = TestBed.createComponent(PillStatusComponent);
    fixture.componentRef.setInput('status', 'aguardando_aprovacao');
    await fixture.whenStable();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.textContent).toBe('Aguardando aprovação');
    expect(span.classList).toContain('s-aprov');

    fixture.componentRef.setInput('tipo', 'solicitacao');
    fixture.componentRef.setInput('status', 'recusada');
    await fixture.whenStable();
    expect(span.textContent).toBe('Recusada');
  });
});

describe('BarraComponent', () => {
  it('limita o percentual entre 0 e 100', async () => {
    const fixture = TestBed.createComponent(BarraComponent);
    fixture.componentRef.setInput('percentual', 140);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),
    ).toBe('100');
  });
});

@Component({
  imports: [ModalComponent],
  template: `@if (aberto()) {
    <app-modal titulo="Teste" (fechar)="aberto.set(false)"><p>corpo</p></app-modal>
  }`,
})
class HostModal {
  readonly aberto = signal(true);
}

describe('ModalComponent', () => {
  it('fecha com Esc e clicando fora, não clicando dentro', async () => {
    const fixture = TestBed.createComponent(HostModal);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role=dialog]')?.getAttribute('aria-modal')).toBe('true');

    (el.querySelector('.modal p') as HTMLElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.aberto()).toBe(true);

    (el.querySelector('.overlay') as HTMLElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.aberto()).toBe(false);

    fixture.componentInstance.aberto.set(true);
    await fixture.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.aberto()).toBe(false);
  });
});

describe('ToastService', () => {
  it('traduz ErroApi e usa a mensagem de rede para outros erros', () => {
    const toast = TestBed.inject(ToastService);
    toast.erro(new ErroApi('ciclo_dependencia'));
    expect(toast.atual()).toEqual({ texto: TEXTOS.erros.ciclo_dependencia, erro: true });
    toast.erro(new Error('falhou'));
    expect(toast.atual()?.texto).toBe(TEXTOS.erros.rede);
    toast.sucesso('Tarefa criada.');
    expect(toast.atual()).toEqual({ texto: 'Tarefa criada.', erro: false });
  });
});

describe('ConfirmacaoService', () => {
  it('devolve a resposta da pessoa', async () => {
    const conf = TestBed.inject(ConfirmacaoService);
    const resposta = conf.perguntar({
      titulo: 'Excluir',
      mensagem: 'Certeza?',
      confirmar: 'Excluir',
      perigo: true,
    });
    expect(conf.pedido()?.titulo).toBe('Excluir');
    conf.responder(true);
    expect(await resposta).toBe(true);
    expect(conf.pedido()).toBeNull();
  });
});
