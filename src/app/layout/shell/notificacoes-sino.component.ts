import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TEXTOS } from '../../core/models/textos';
import { Notificacao } from '../../core/notificacoes/notificacoes.service';
import { NotificacoesStore } from '../../core/notificacoes/notificacoes.store';
import { dataHora } from '../../shared/utils/datas';
import { resumoNotificacao } from '../../shared/utils/notificacoes-texto';

/**
 * O sino da barra lateral (T-59, US-30): lista as últimas notificações, deixa marcar como lidas e
 * tem o interruptor "também por e-mail" — o aviso sempre fica aqui dentro, o e-mail é opcional.
 */
@Component({
  selector: 'app-notificacoes-sino',
  imports: [RouterLink],
  host: { '(document:keydown.escape)': 'aberto.set(false)' },
  template: `
    <div class="sino-wrap">
      <button
        type="button"
        class="btn sm ghost sino"
        [attr.aria-label]="t.notificacoes.abrir"
        [attr.aria-expanded]="aberto()"
        (click)="alternar()"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        @if (naoLidas() > 0) {
          <span class="count">{{ naoLidas() }}</span>
        }
      </button>

      @if (aberto()) {
        <div class="painel pop" role="dialog" [attr.aria-label]="t.notificacoes.titulo">
          <div class="topo">
            <h3>{{ t.notificacoes.titulo }}</h3>
            @if (naoLidas() > 0) {
              <button type="button" class="btn sm ghost" (click)="notificacoes.marcarTodasLidas()">
                {{ t.notificacoes.marcarTodasLidas }}
              </button>
            }
          </div>

          <div class="lista">
            @for (n of notificacoes.lista(); track n.id) {
              <button type="button" class="item" [class.lida]="!!n.lido_em" (click)="abrir(n)">
                @if (!n.lido_em) {
                  <span class="bolinha" aria-hidden="true"></span>
                }
                <span class="corpo">
                  <span class="texto">{{ resumo(n) }}</span>
                  <span class="quando">{{ dataHora(n.criado_em) }}</span>
                </span>
              </button>
            } @empty {
              <p class="vazio">{{ t.notificacoes.nenhuma }}</p>
            }
          </div>

          <a class="preferencia" routerLink="/notificacoes" (click)="aberto.set(false)">
            {{ t.notificacoes.verTudo }}
          </a>
        </div>
      }
    </div>
  `,
  styles: `
    .sino-wrap {
      position: relative;
    }
    .sino {
      position: relative;
    }
    .count {
      position: absolute;
      top: -4px;
      right: -4px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 999px;
      background: var(--danger);
      color: #fff;
    }
    .painel {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      width: 340px;
      max-width: calc(100vw - 32px);
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      color: var(--text);
      border-radius: 12px;
      box-shadow: var(--shadow);
      overflow: hidden;
      z-index: 20;
    }
    .topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
    }
    .topo h3 {
      margin: 0;
      font-size: 15px;
    }
    .lista {
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }
    .item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      border: 0;
      border-bottom: 1px solid var(--line);
      background: transparent;
      color: inherit;
      text-align: left;
      cursor: pointer;
      font: inherit;
    }
    .item:hover {
      background: var(--surface-2);
    }
    .item.lida {
      opacity: 0.65;
    }
    .bolinha {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--accent);
      margin-top: 6px;
    }
    .item.lida .bolinha {
      visibility: hidden;
    }
    .corpo {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .texto {
      font-size: 13px;
    }
    .quando {
      font-size: 11px;
      color: var(--muted);
    }
    .vazio {
      padding: 20px 14px;
      margin: 0;
      font-size: 13px;
      color: var(--muted);
      text-align: center;
    }
    .preferencia {
      display: block;
      padding: 10px 14px;
      border-top: 1px solid var(--line);
      font-size: 13px;
      font-weight: 600;
      color: var(--accent);
      text-align: center;
      text-decoration: none;
    }
    .preferencia:hover {
      background: var(--surface-2);
    }
  `,
})
export class NotificacoesSinoComponent {
  protected readonly notificacoes = inject(NotificacoesStore);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly dataHora = dataHora;

  protected readonly aberto = signal(false);
  protected readonly naoLidas = this.notificacoes.naoLidas;

  constructor() {
    // A busca inicial é do shell (precisa da contagem antes de alguém abrir o painel).
    // Fecha ao clicar fora: só quando o clique não veio de dentro do botão nem do painel.
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const fechar = (evento: MouseEvent) => {
      if (!host.contains(evento.target as Node)) this.aberto.set(false);
    };
    document.addEventListener('click', fechar);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('click', fechar));
  }

  protected resumo(n: Notificacao): string {
    return resumoNotificacao({
      tipo: n.tipo,
      dados: n.dados as Record<string, unknown>,
      autorNome: n.autor?.nome ?? null,
    });
  }

  protected alternar(): void {
    this.aberto.update((v) => !v);
  }

  protected async abrir(n: Notificacao): Promise<void> {
    this.aberto.set(false);
    void this.notificacoes.marcarLida(n.id);
    const destino = (n.dados as Record<string, unknown>)['solicitacao_id']
      ? `/solicitacoes`
      : n.item_id
        ? `/item/${n.item_id}`
        : null;
    if (destino) await this.router.navigateByUrl(destino);
  }
}
