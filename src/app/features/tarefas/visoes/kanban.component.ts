import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { podeEditarItem } from '../../../core/itens/permissoes';
import { Item } from '../../../core/models/item.model';
import {
  ORDEM_STATUS,
  PRIORIDADE,
  Prioridade,
  RECORRENCIA,
  STATUS_ITEM,
  StatusItem,
} from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { ErroApi } from '../../../core/services/erro-api';
import { AvataresComponent } from '../../../shared/ui/avatares.component';
import { BarraComponent } from '../../../shared/ui/barra.component';
import { MudarStatusComponent } from '../../../shared/ui/mudar-status.component';
import { NivelComponent } from '../../../shared/ui/nivel.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { dataCurta } from '../../../shared/utils/datas';
import { progressoPorFilhos } from '../../../shared/utils/progresso';

export type GrupoKanban = keyof typeof TEXTOS.tarefas.kanban.grupos;

interface Coluna {
  id: string;
  nome: string;
  sub?: string;
  cor: string;
  /** Aceita cartões (status e prioridade); por projeto é só leitura. */
  aceita: boolean;
  itens: Item[];
}

const COR_STATUS: Record<StatusItem, string> = {
  a_fazer: 'var(--todo-fg)',
  em_andamento: 'var(--prog-fg)',
  bloqueada: 'var(--bloq-fg)',
  aguardando_aprovacao: 'var(--aprov-fg)',
  concluida: 'var(--done-fg)',
};
const ORDEM_PRIORIDADE: Prioridade[] = ['alta', 'media', 'baixa'];

/** Kanban por status, prioridade ou projeto; arrastar (CDK) ou "Mover para…" pelo teclado (US-22). */
@Component({
  selector: 'app-kanban',
  imports: [
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    AvataresComponent,
    BarraComponent,
    NivelComponent,
    MudarStatusComponent,
  ],
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.css',
})
export class KanbanComponent {
  private readonly store = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly recorrencia = RECORRENCIA;
  protected readonly prioridade = PRIORIDADE;
  private readonly mudarStatus = viewChild.required(MudarStatusComponent);

  readonly itens = input.required<Item[]>();
  protected readonly grupo = signal<GrupoKanban>('status');
  protected readonly grupos = Object.entries(this.t.tarefas.kanban.grupos) as [
    GrupoKanban,
    string,
  ][];
  /** Cartão com o menu "Mover para…" aberto. */
  protected readonly menuDe = signal<string | null>(null);
  /** Coluna sob o cartão arrastado (contorno tracejado do protótipo). */
  protected readonly sobre = signal<string | null>(null);
  private arrastou = false;

  protected readonly colunas = computed<Coluna[]>(() => {
    const itens = this.itens();
    const grupo = this.grupo();
    if (grupo === 'status') {
      return ORDEM_STATUS.map((s) => ({
        id: s,
        nome: STATUS_ITEM[s].texto,
        cor: COR_STATUS[s],
        aceita: true,
        itens: itens.filter((i) => i.status === s),
      }));
    }
    const abertos = itens.filter((i) => i.status !== 'concluida');
    if (grupo === 'prioridade') {
      return ORDEM_PRIORIDADE.map((p) => ({
        id: p,
        nome: PRIORIDADE[p].texto,
        cor: PRIORIDADE[p].cor,
        aceita: true,
        itens: abertos.filter((i) => i.prioridade === p),
      }));
    }
    const porProjeto = new Map<string, Item[]>();
    for (const i of abertos) {
      const chave = i.projeto_id ?? '';
      porProjeto.set(chave, [...(porProjeto.get(chave) ?? []), i]);
    }
    return [...porProjeto.entries()]
      .map(([id, lista]) => {
        const projeto = id ? this.store.porId(id) : undefined;
        return {
          id: id || 'sem-projeto',
          nome: projeto?.nome ?? this.t.tarefas.semProjeto,
          sub: projeto ? this.acesso.nomeSetor(projeto.setor_id) : undefined,
          cor: 'var(--accent)',
          aceita: false,
          itens: lista,
        };
      })
      .sort((a, b) =>
        a.id === 'sem-projeto'
          ? 1
          : b.id === 'sem-projeto'
            ? -1
            : a.nome.localeCompare(b.nome, 'pt'),
      );
  });

  protected podeMexer(item: Item): boolean {
    return podeEditarItem(item, this.acesso.perfil()?.id ?? null, this.acesso.administrados());
  }

  protected caminho(item: Item): string {
    const nomes = this.store.caminho(item).map((i) => i.nome);
    return nomes.length ? nomes.join(' › ') : this.acesso.nomeSetor(item.setor_id);
  }

  protected responsaveis(item: Item) {
    return item.responsaveis.map((id) => this.acesso.pessoaPorId().get(id)).filter((p) => !!p);
  }

  protected progresso(item: Item) {
    return progressoPorFilhos(this.store.filhos(item.id));
  }

  protected prazo(item: Item): string {
    return item.atrasado ? this.t.comum.atrasada : dataCurta(item.prazo);
  }

  protected abrir(item: Item, evento: Event): void {
    // Cliques e Enter nos botões do cartão (menu "Mover para…") não abrem o item
    if (this.arrastou || (evento.target as HTMLElement).closest('button')) return;
    void this.router.navigate(['/item', item.id]);
  }

  protected comecouArrastar(): void {
    this.arrastou = true;
    this.menuDe.set(null);
  }

  protected soltou(evento: CdkDragDrop<string, string, Item>): void {
    // O clique que segue o soltar não deve abrir o item
    setTimeout(() => (this.arrastou = false));
    this.sobre.set(null);
    if (evento.previousContainer === evento.container) return;
    void this.mover(evento.item.data, evento.container.data);
  }

  /** Destinos do menu "Mover para…": as outras colunas que aceitam cartões. */
  protected destinos(item: Item): Coluna[] {
    return this.colunas().filter((c) => c.aceita && !c.itens.includes(item));
  }

  protected alternarMenu(item: Item): void {
    this.menuDe.update((id) => (id === item.id ? null : item.id));
  }

  /** Status volta para a coluna de origem se o pedido (motivo, aprovador) for cancelado. */
  protected async mover(item: Item, destino: string): Promise<void> {
    this.menuDe.set(null);
    if (!this.podeMexer(item)) {
      this.toast.erro(new ErroApi('sem_permissao'));
      return;
    }
    if (this.grupo() === 'status') {
      await this.mudarStatus().mudar(item, destino as StatusItem);
      return;
    }
    const prioridade = destino as Prioridade;
    if (item.prioridade === prioridade) return;
    const ok = await this.store.atualizar(item.id, { prioridade });
    if (ok) {
      this.toast.sucesso(
        this.t.tarefas.kanban.prioridadeMudou(item.nome, PRIORIDADE[prioridade].texto),
      );
    }
  }
}
