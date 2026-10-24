import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import {
  PRIORIDADE,
  Prioridade,
  RECORRENCIA,
  Recorrencia,
  SEM_RECORRENCIA,
  STATUS_ITEM,
  StatusItem,
} from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { RealtimeService, afetaItem } from '../../../core/services/realtime.service';
import { dataCurta, dataHora } from '../../../shared/utils/datas';
import { Historico, ItemService } from '../item.service';

type Campo = keyof typeof TEXTOS.historico.campos;
const MOSTRAR = 10;

/** Histórico do item: quem, quando e o que mudou, de → para (US-32). */
@Component({
  selector: 'app-historico-item',
  template: `
    <section class="sec">
      <h3>{{ t.historico.titulo }}</h3>
      @for (l of visiveis(); track l.id) {
        <div class="linha">
          <span class="quem">{{ l.quem }}</span>
          <span class="oque">{{ l.texto }}</span>
          <span class="row-sub quando">{{ l.quando }}</span>
        </div>
      } @empty {
        <p class="hint">{{ t.historico.vazio }}</p>
      }
      @if (linhas().length > visiveis().length) {
        <button type="button" class="btn sm ghost mais" (click)="todos.set(true)">
          {{ t.historico.verMais(linhas().length - visiveis().length) }}
        </button>
      }
    </section>
  `,
  styles: `
    .linha {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 6px;
      font-size: 14px;
      align-items: baseline;
    }
    .quem {
      font-weight: 600;
    }
    .quando {
      margin-left: auto;
      font-size: 12px;
    }
    .hint {
      margin: 0;
    }
    .mais {
      align-self: flex-start;
    }
  `,
})
export class HistoricoItemComponent {
  private readonly service = inject(ItemService);
  private readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;

  readonly item = input.required<Item>();
  private readonly registros = signal<Historico[]>([]);
  protected readonly todos = signal(false);

  protected readonly linhas = computed(() =>
    this.registros()
      .filter(
        (h) =>
          h.acao !== 'update' ||
          h.campo === 'responsaveis' ||
          (h.campo ?? '') in this.t.historico.campos,
      )
      .map((h) => ({
        id: h.id,
        quem: h.perfil_id ? this.nome(h.perfil_id) : this.t.historico.alguem,
        texto: this.descrever(h),
        quando: dataHora(h.criado_em),
      })),
  );
  protected readonly visiveis = computed(() =>
    this.todos() ? this.linhas() : this.linhas().slice(0, MOSTRAR),
  );

  constructor() {
    effect(() => this.carregar(this.item().id));
    // Mudou o item ou os responsáveis: o banco já gravou o histórico, busca de novo
    inject(RealtimeService).ouvirAqui(['itens', 'item_responsaveis'], (e) => {
      const id = this.item().id;
      if (afetaItem(e, id, [id])) this.carregar(id);
    });
  }

  private carregar(id: string): void {
    this.service.listarHistorico(id).then(
      (l) => this.registros.set(l),
      () => undefined, // histórico é secundário: sem aviso de erro
    );
  }

  private descrever(h: Historico): string {
    const th = this.t.historico;
    if (h.acao === 'insert') return th.criou;
    if (h.acao === 'delete') return th.apagou;
    if (h.campo === 'responsaveis') {
      return h.valor_depois
        ? th.entrou(this.nome(h.valor_depois))
        : th.saiu(this.nome(h.valor_antes!));
    }
    const campo = h.campo as Campo;
    const nomeCampo = th.campos[campo];
    if (campo === 'descricao_html' || campo === 'motivo_bloqueio_html') return th.editou(nomeCampo);
    const de = this.valor(campo, h.valor_antes);
    const para = this.valor(campo, h.valor_depois);
    if (!de) return th.definiu(nomeCampo, para);
    if (!para) return th.limpou(nomeCampo, de);
    return th.mudou(nomeCampo, de, para);
  }

  /** Valor gravado como texto → como aparece na tela. */
  private valor(campo: Campo, v: string | null): string {
    if (v === null || v === '') return '';
    switch (campo) {
      case 'status':
        return STATUS_ITEM[v as StatusItem]?.texto ?? v;
      case 'prioridade':
        return PRIORIDADE[v as Prioridade]?.texto ?? v;
      case 'recorrencia':
        return RECORRENCIA[v as Recorrencia] ?? SEM_RECORRENCIA;
      case 'prazo':
      case 'inicio':
        return dataCurta(v);
      case 'setor_id':
        return this.acesso.nomeSetor(v);
      case 'pai_id':
        return this.itens.porId(v)?.nome ?? '—';
      case 'aprovador_id':
        return this.nome(v);
      default:
        return v;
    }
  }

  private nome(perfilId: string): string {
    return this.acesso.pessoaPorId().get(perfilId)?.nome ?? this.t.comentarios.pessoaRemovida;
  }
}
