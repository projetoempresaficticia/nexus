import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { dadosIniciais } from '../../../testing/dados-iniciais';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { Notificacao, NotificacoesService } from '../../core/notificacoes/notificacoes.service';
import { NotificacoesStore } from '../../core/notificacoes/notificacoes.store';
import { NotificacoesSinoComponent } from './notificacoes-sino.component';

const n = (id: string, extra: Partial<Notificacao> = {}): Notificacao => ({
  id,
  tipo: 'mencao',
  destinatario_id: 'p-eu',
  autor_id: 'p-autor',
  autor: { nome: 'Bruno' },
  item_id: 't1',
  dados: { nome: 'Tarefa' },
  criado_em: '2026-10-25T10:00:00Z',
  enviado_em: null,
  erro: null,
  tentativas: 0,
  lido_em: null,
  ...extra,
});

async function montar(
  notificacoes: Notificacao[],
  atualizarPreferenciaEmail = vi.fn().mockResolvedValue(undefined),
) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dadosIniciais([], [], false)),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          atualizarPreferenciaEmail,
        },
      },
      {
        provide: NotificacoesService,
        useValue: { listar: vi.fn().mockResolvedValue(notificacoes) },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  // Quem carrega de verdade é o shell (T-59, para a contagem já aparecer certa antes de abrir).
  await TestBed.inject(NotificacoesStore).carregar();
  const fixture = TestBed.createComponent(NotificacoesSinoComponent);
  await fixture.whenStable();
  return fixture;
}

describe('NotificacoesSinoComponent (T-59)', () => {
  it('mostra o número de não lidas no sino', async () => {
    const fixture = await montar([n('1'), n('2', { lido_em: '2026-10-25T11:00:00Z' })]);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.count')?.textContent?.trim(),
    ).toBe('1');
  });

  it('sem notificação nenhuma, não mostra o número', async () => {
    const fixture = await montar([]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.count')).toBeNull();
  });

  it('clicar no sino abre o painel com a lista; clicar fora fecha', async () => {
    const fixture = await montar([n('1')]);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('.sino')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    expect(el.querySelector('.painel')).toBeTruthy();
    expect(el.textContent).toContain('Bruno mencionou você em "Tarefa".');

    document.body.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    expect(el.querySelector('.painel')).toBeNull();
  });

  it('sem notificações, mostra a mensagem de vazio', async () => {
    const fixture = await montar([]);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('.sino')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    expect(el.textContent).toContain(TEXTOS.notificacoes.nenhuma);
  });

  it('clicar numa notificação marca como lida, fecha o painel e abre o item', async () => {
    const fixture = await montar([n('1')]);
    const el = fixture.nativeElement as HTMLElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.querySelector('.sino')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    el.querySelector('.item')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    expect(navegar).toHaveBeenCalledWith('/item/t1');
    expect(el.querySelector('.painel')).toBeNull();
  });

  it('o interruptor de e-mail reflete e muda a preferência da pessoa', async () => {
    const atualizarPreferenciaEmail = vi.fn().mockResolvedValue(undefined);
    const fixture = await montar([], atualizarPreferenciaEmail);
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('.sino')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    const caixa = el.querySelector('.preferencia input') as HTMLInputElement;
    expect(caixa.checked).toBe(true);
    caixa.checked = false;
    caixa.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(atualizarPreferenciaEmail).toHaveBeenCalledWith('p-eu', false);
  });
});
