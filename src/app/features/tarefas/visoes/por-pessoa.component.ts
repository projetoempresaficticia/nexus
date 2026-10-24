import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { podeEditarItem } from '../../../core/itens/permissoes';
import { Pessoa } from '../../../core/models/acesso.model';
import { Item } from '../../../core/models/item.model';
import { PRIORIDADE } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { ErroApi } from '../../../core/services/erro-api';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { NivelComponent } from '../../../shared/ui/nivel.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { dataCurta, hojeIso } from '../../../shared/utils/datas';
import { estaAtrasado, estaParado, setoresDaPessoa } from './equipe';

/** Quadro com uma coluna por pessoa; arrastar troca o responsável (US-26). */
@Component({
  selector: 'app-por-pessoa',
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, AvatarComponent, NivelComponent],
  template: `
    <div class="bar-tools">
      <span class="hint">{{ t.tarefas.pessoaVisao.dica }}</span>
    </div>
    @if (colunas().length) {
      <div class="kanban-wrap">
        <div
          class="kanban"
          cdkDropListGroup
          [style.grid-template-columns]="'repeat(' + colunas().length + ', minmax(250px, 1fr))'"
          [style.min-width.px]="colunas().length * 264"
        >
          @for (c of colunas(); track c.pessoa.id) {
            <section
              class="kcol"
              style="--c: var(--accent)"
              [class.over]="sobre() === c.pessoa.id"
              [attr.aria-label]="c.pessoa.nome"
              cdkDropList
              [cdkDropListData]="c.pessoa.id"
              [cdkDropListSortingDisabled]="true"
              (cdkDropListEntered)="sobre.set(c.pessoa.id)"
              (cdkDropListExited)="sobre.set(null)"
              (cdkDropListDropped)="soltou($event)"
            >
              <div class="kcol-h">
                <app-avatar [pessoa]="c.pessoa" />
                <span class="quem">
                  <span class="nome">{{ c.pessoa.nome }}</span>
                  <span class="row-sub">{{ c.setores }}</span>
                </span>
                <span class="n">{{ c.itens.length }}</span>
              </div>
              <div class="selos">
                @if (c.atrasados) {
                  <span class="pill s-recus">{{
                    t.tarefas.pessoaVisao.atrasados(c.atrasados)
                  }}</span>
                }
                @if (c.parados) {
                  <span class="pill s-bloq">{{ t.tarefas.pessoaVisao.parados(c.parados) }}</span>
                }
              </div>
              @for (i of c.itens; track i.id) {
                <div
                  class="kcard"
                  role="button"
                  tabindex="0"
                  cdkDrag
                  [cdkDragData]="{ item: i, de: c.pessoa.id }"
                  [cdkDragDisabled]="!podeMexer(i)"
                  (cdkDragStarted)="arrastou = true"
                  (click)="abrir(i)"
                  (keydown.enter)="abrir(i)"
                >
                  <span class="topo">
                    <app-nivel [nivel]="i.nivel" />
                    <span class="dot" [style.background]="prioridade[i.prioridade].cor"></span>
                  </span>
                  <strong>{{ i.nome }}</strong>
                  <span class="kmeta">
                    <span class="row-sub">{{ acesso.nomeSetor(i.setor_id) }}</span>
                    <span class="prazo" [class.late]="i.atrasado">{{ prazo(i) }}</span>
                  </span>
                </div>
              } @empty {
                <div class="kempty">{{ t.tarefas.pessoaVisao.semItens }}</div>
              }
            </section>
          }
        </div>
      </div>
    } @else {
      <div class="empty">{{ t.tarefas.pessoaVisao.vazio }}</div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .quem {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .quem .nome {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .quem .row-sub {
      font-weight: 500;
    }
    .selos {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      padding: 0 4px;
    }
    .selos:empty {
      display: none;
    }
    .topo {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .topo .dot {
      margin-left: auto;
    }
    .kmeta .prazo {
      margin-left: auto;
      width: auto;
    }
  `,
})
export class PorPessoaComponent {
  private readonly store = inject(ItensStore);
  protected readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly prioridade = PRIORIDADE;

  /** Itens abertos dos setores que administro (já filtrados pela página). */
  readonly itens = input.required<Item[]>();
  readonly pessoas = input.required<Pessoa[]>();
  readonly hoje = input(hojeIso());

  protected readonly sobre = signal<string | null>(null);
  protected arrastou = false;

  protected readonly colunas = computed(() => {
    const adm = this.acesso.administrados();
    return this.pessoas().map((p) => {
      const itens = this.itens().filter((i) => i.responsaveis.includes(p.id));
      return {
        pessoa: p,
        setores: setoresDaPessoa(
          p,
          adm,
          (id) => this.acesso.nomeSetor(id),
          this.t.tarefas.pessoaVisao.admHierarquia,
        ),
        itens,
        atrasados: itens.filter((i) => estaAtrasado(i, this.hoje())).length,
        parados: itens.filter(estaParado).length,
      };
    });
  });

  protected podeMexer(item: Item): boolean {
    return podeEditarItem(item, this.acesso.perfil()?.id ?? null, this.acesso.administrados());
  }

  protected prazo(item: Item): string {
    return item.atrasado ? this.t.comum.atrasada : dataCurta(item.prazo);
  }

  protected abrir(item: Item): void {
    if (this.arrastou) return;
    void this.router.navigate(['/item', item.id]);
  }

  /** Troca quem estava nesta coluna pela pessoa da coluna de destino; os outros responsáveis ficam. */
  protected async soltou(
    e: CdkDragDrop<string, string, { item: Item; de: string }>,
  ): Promise<void> {
    setTimeout(() => (this.arrastou = false));
    this.sobre.set(null);
    const { item, de } = e.item.data;
    const para = e.container.data;
    if (e.previousContainer === e.container || item.responsaveis.includes(para)) return;
    if (!this.acesso.pessoasDoSetor(item.setor_id).some((p) => p.id === para)) {
      this.toast.erro(new ErroApi('responsavel_fora_do_setor'));
      return;
    }
    const novos = [...item.responsaveis.filter((r) => r !== de), para];
    if (await this.store.definirResponsaveis(item.id, novos)) {
      const nome = this.pessoas().find((p) => p.id === para)?.nome ?? '';
      this.toast.sucesso(this.t.tarefas.pessoaVisao.trocou(item.nome, nome));
    }
  }
}
