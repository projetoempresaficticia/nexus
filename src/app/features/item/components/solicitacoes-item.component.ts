import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Item } from '../../../core/models/item.model';
import { STATUS_SOLICITACAO, TIPO_SOLICITACAO } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { SolicitacoesStore } from '../../../core/solicitacoes/solicitacoes.store';
import { textoPuro } from '../../../shared/utils/html-seguro';
import { NovaSolicitacaoModal } from '../../solicitacoes/nova-solicitacao.modal';

/** Solicitações do item, com atalho para a conversa e para abrir uma nova (US-15, US-16). */
@Component({
  selector: 'app-solicitacoes-item',
  imports: [RouterLink, NovaSolicitacaoModal],
  template: `
    <section class="sec">
      <div class="sec-h">
        <h3>{{ t.solicitacoes.titulo }}</h3>
        @if (podeEditar()) {
          <button type="button" class="btn sm" (click)="novaAberta.set(true)">
            {{ t.solicitacoes.nova }}
          </button>
        }
      </div>
      @for (s of cartoes(); track s.id) {
        <a class="solic-card" routerLink="/solicitacoes" [queryParams]="{ id: s.id }">
          <span class="selos">
            <span class="pill" [class]="s.tipo.classe">{{ s.tipo.texto }}</span>
            @if (s.outroSetor; as setor) {
              <span class="pill s-info">{{ t.solicitacoes.outroSetor(setor) }}</span>
            }
            <span class="pill fim" [class]="s.status.classe">{{ s.status.texto }}</span>
          </span>
          <strong>{{ s.texto }}</strong>
          <span class="row-sub">
            {{ t.solicitacoes.para(s.para) }} · {{ t.solicitacoes.mensagens(s.mensagens) }}
          </span>
        </a>
      } @empty {
        <p class="hint">{{ t.solicitacoes.semNoItem }}</p>
      }
    </section>
    @if (novaAberta()) {
      <app-nova-solicitacao-modal [item]="item()" (fechar)="novaAberta.set(false)" />
    }
  `,
  styles: `
    .solic-card {
      color: inherit;
      text-decoration: none;
    }
    .selos {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      width: 100%;
    }
    .fim {
      margin-left: auto;
    }
    strong {
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class SolicitacoesItemComponent {
  private readonly store = inject(SolicitacoesStore);
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;

  readonly item = input.required<Item>();
  readonly podeEditar = input(false);
  protected readonly novaAberta = signal(false);

  protected readonly cartoes = computed(() => {
    const item = this.item();
    return this.store.doItem(item.id).map((s) => {
      const para = this.acesso.pessoaPorId().get(s.para_id);
      const deFora = para && !para.vinculos.some((v) => v.setor_id === item.setor_id);
      return {
        id: s.id,
        tipo: TIPO_SOLICITACAO[s.tipo],
        status: STATUS_SOLICITACAO[s.status],
        texto: textoPuro(s.texto_html),
        para: para?.nome ?? this.t.comentarios.pessoaRemovida,
        outroSetor:
          deFora && para.vinculos[0] ? this.acesso.nomeSetor(para.vinculos[0].setor_id) : null,
        mensagens: s.solicitacao_mensagens.length,
      };
    });
  });

  constructor() {
    void this.store.carregar();
  }
}
