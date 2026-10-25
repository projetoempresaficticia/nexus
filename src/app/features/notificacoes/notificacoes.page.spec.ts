import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { dadosIniciais } from '../../../testing/dados-iniciais';
import { AcessoService } from '../../core/auth/acesso.service';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { Notificacao, NotificacoesService } from '../../core/notificacoes/notificacoes.service';
import { NotificacoesPage } from './notificacoes.page';

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

async function montar(notificacoes: Notificacao[]) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AcessoService,
        useValue: {
          carregarInicial: vi.fn().mockResolvedValue(dadosIniciais([], [], false)),
          contarSolicitacoesPendentes: vi.fn().mockResolvedValue(0),
          atualizarPreferenciaEmail: vi.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: NotificacoesService,
        useValue: {
          listarTodas: vi.fn().mockResolvedValue(notificacoes),
          marcarLida: vi.fn().mockResolvedValue(undefined),
        },
      },
    ],
  });
  await TestBed.inject(AcessoStore).carregar();
  const fixture = TestBed.createComponent(NotificacoesPage);
  await fixture.whenStable();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('NotificacoesPage (T-63)', () => {
  it('carrega tudo (não só 50) e mostra quantas faltam ler', async () => {
    const { el } = await montar([n('1'), n('2', { lido_em: '2026-10-25T11:00:00Z' })]);
    expect(el.querySelector('app-cabecalho')?.textContent).toContain(
      TEXTOS.notificacoes.naoLidas(1),
    );
    expect(el.querySelectorAll('.item')).toHaveLength(2);
  });

  it('sem nada pendente, mostra a mensagem de tudo em dia', async () => {
    const { el } = await montar([]);
    expect(el.querySelector('app-cabecalho')?.textContent).toContain(
      TEXTOS.notificacoes.semNaoLidas,
    );
    expect(el.textContent).toContain(TEXTOS.notificacoes.nenhuma);
  });

  it('clicar marca como lida e abre o item', async () => {
    const { fixture, el } = await montar([n('1')]);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.querySelector('.item')!.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();
    expect(navegar).toHaveBeenCalledWith('/item/t1');
    expect(el.querySelector('.item')?.classList).toContain('lida');
  });
});
