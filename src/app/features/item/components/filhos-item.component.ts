import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { podeCriarFilho } from '../../../core/itens/permissoes';
import { Item } from '../../../core/models/item.model';
import { NIVEL, PRIORIDADE } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { BarraComponent } from '../../../shared/ui/barra.component';
import { PillStatusComponent } from '../../../shared/ui/pill-status.component';
import { dataCurta } from '../../../shared/utils/datas';
import { progressoPorFilhos } from '../../../shared/utils/progresso';
import { NovoItemModal } from '../../tarefas/novo-item.modal';

/** Tarefas do projeto / subtarefas da tarefa, com progresso e "+ Subtarefa" (US-08, US-09). */
@Component({
  selector: 'app-filhos-item',
  imports: [RouterLink, BarraComponent, PillStatusComponent, NovoItemModal],
  template: `
    <section class="sec">
      <div class="sec-h">
        <h3>{{ titulo() }}</h3>
        @if (progresso(); as p) {
          <span class="row-sub num">{{ t.item.concluidos(p.concluidos, p.total) }}</span>
        }
        @if (podeCriar()) {
          <button type="button" class="btn sm primary" (click)="novo.set(true)">
            {{ textoNovo() }}
          </button>
        }
      </div>
      @if (progresso(); as p) {
        <app-barra [percentual]="p.percentual" />
      }
      @for (f of filhos(); track f.id) {
        <a class="child" [routerLink]="['/item', f.id]">
          <span class="dot" [style.background]="prioridade[f.prioridade].cor"></span>
          <span class="row-main">
            <strong>{{ f.nome }}</strong>
            <span class="row-sub">{{ quem(f) }}</span>
          </span>
          <app-pill-status [status]="f.status" />
          <span class="prazo" [class.late]="f.atrasado">{{
            f.atrasado ? t.comum.atrasada : prazo(f)
          }}</span>
        </a>
      } @empty {
        <p class="muted vazio">
          {{
            t.item.semFilhos(
              nivel[item().nivel + 1].toLowerCase(),
              nivel[item().nivel].toLowerCase()
            )
          }}
        </p>
      }
    </section>
    @if (novo()) {
      <app-novo-item-modal [nivel]="filhoNivel()" [paiId]="item().id" (fechar)="novo.set(false)" />
    }
  `,
  styles: `
    .sec-h h3 {
      margin-right: auto;
    }
    .child {
      text-decoration: none;
      color: inherit;
    }
    .child strong {
      font-size: 14px;
    }
    .vazio {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class FilhosItemComponent {
  private readonly itens = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;
  protected readonly prioridade = PRIORIDADE;
  readonly item = input.required<Item>();
  protected readonly novo = signal(false);

  protected readonly filhos = computed(() => this.itens.filhos(this.item().id));
  protected readonly progresso = computed(() => progressoPorFilhos(this.filhos()));
  private readonly nivelPai = computed(() => this.item().nivel as 0 | 1);
  protected readonly titulo = computed(() => this.t.item.filhos[this.nivelPai()]);
  protected readonly textoNovo = computed(() => this.t.item.novoFilho[this.nivelPai()]);
  protected readonly filhoNivel = computed(() => (this.item().nivel + 1) as 1 | 2);
  protected readonly podeCriar = computed(() =>
    podeCriarFilho(
      this.item(),
      new Set(
        this.acesso
          .setores()
          .filter((s) => s.visivel)
          .map((s) => s.id),
      ),
    ),
  );

  protected quem(f: Item): string {
    const nomes = f.responsaveis
      .map((id) => this.acesso.pessoaPorId().get(id)?.nome)
      .filter((n) => !!n);
    return nomes.length ? nomes.join(', ') : this.t.comum.semResponsavel;
  }

  protected prazo(f: Item): string {
    return dataCurta(f.prazo);
  }
}
