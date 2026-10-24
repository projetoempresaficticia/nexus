import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { PRIORIDADE, STATUS_ITEM } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import {
  dataCurta,
  diferencaDias,
  hojeIso,
  segundaDaSemana,
  somarDias,
} from '../../../shared/utils/datas';
import { progressoPorFilhos } from '../../../shared/utils/progresso';

const DIAS = 70;
const LARGURA_DIA = 26;

interface Barra {
  esquerda: number;
  largura: number;
  classe: string;
  /** Só prazo, sem início: marco (losango) no dia do prazo. */
  marco: boolean;
  dica: string;
  percentual: number | null;
}

interface Linha {
  item: Item;
  barra: Barra | null;
  semDatas: boolean;
}

/** Linha do tempo (Gantt) de 10 semanas: barra do início ao prazo; sem início = marco (US-25). */
@Component({
  selector: 'app-gantt',
  imports: [RouterLink],
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.css',
})
export class GanttComponent {
  private readonly store = inject(ItensStore);
  protected readonly t = TEXTOS;
  protected readonly prioridade = PRIORIDADE;
  protected readonly dias = DIAS;
  protected readonly larguraDia = LARGURA_DIA;

  /** Itens dos setores do filtro, inclusive projetos (como na Árvore). */
  readonly itens = input.required<Item[]>();
  readonly interessa = input<(i: Item) => boolean>(() => true);
  readonly hoje = input(hojeIso());
  /** Dias a partir da segunda-feira da semana passada (‹ › andam duas semanas; Hoje volta a 0). */
  private readonly deslocamento = signal(0);

  protected readonly inicio = computed(() =>
    somarDias(segundaDaSemana(this.hoje()), -7 + this.deslocamento()),
  );
  protected readonly fim = computed(() => somarDias(this.inicio(), DIAS - 1));

  protected readonly titulo = computed(() =>
    this.t.tarefas.gantt.periodo(dataCurta(this.inicio()), dataCurta(this.fim())),
  );

  protected readonly semanas = computed(() => {
    const atual = segundaDaSemana(this.hoje());
    return Array.from({ length: DIAS / 7 }, (_, w) => {
      const d = somarDias(this.inicio(), w * 7);
      return { iso: d, texto: dataCurta(d), atual: d === atual, esquerda: w * 7 * LARGURA_DIA };
    });
  });

  /** Posição da linha vermelha de hoje, ou null fora do período. */
  protected readonly linhaHoje = computed(() => {
    const x = diferencaDias(this.inicio(), this.hoje()) * LARGURA_DIA;
    return x >= 0 && x <= DIAS * LARGURA_DIA ? x + LARGURA_DIA / 2 : null;
  });

  /** Projeto › tarefa › subtarefa na ordem da Árvore; avulsas no fim. */
  protected readonly linhas = computed<Linha[]>(() => {
    const itens = this.itens();
    const ids = new Set(itens.map((i) => i.id));
    const filhos = new Map<string, Item[]>();
    for (const i of itens) {
      if (i.pai_id && ids.has(i.pai_id)) filhos.set(i.pai_id, [...(filhos.get(i.pai_id) ?? []), i]);
    }
    const mostrar = this.visiveis(itens, filhos);
    const ordenar = (l: Item[]) =>
      [...l].sort((a, b) => (a.inicio ?? a.prazo ?? '9').localeCompare(b.inicio ?? b.prazo ?? '9'));
    const raizes = itens.filter((i) => (!i.pai_id || !ids.has(i.pai_id)) && mostrar.has(i.id));
    const saida: Linha[] = [];
    const descer = (i: Item) => {
      saida.push(this.linha(i));
      for (const f of ordenar((filhos.get(i.id) ?? []).filter((x) => mostrar.has(x.id)))) descer(f);
    };
    const porNome = (a: Item, b: Item) => a.nome.localeCompare(b.nome, 'pt');
    raizes
      .filter((i) => i.nivel === 0)
      .sort(porNome)
      .forEach(descer);
    ordenar(raizes.filter((i) => i.nivel > 0)).forEach(descer);
    return saida;
  });

  protected mover(dias: number): void {
    this.deslocamento.update((d) => (dias === 0 ? 0 : d + dias));
  }

  private linha(item: Item): Linha {
    const fim = item.prazo;
    const ini = item.inicio ?? item.prazo;
    if (!ini || !fim) return { item, barra: null, semDatas: true };
    if (fim < this.inicio() || ini > this.fim()) return { item, barra: null, semDatas: false };
    const px = (iso: string) => diferencaDias(this.inicio(), iso) * LARGURA_DIA;
    const esquerda = Math.max(0, px(ini));
    const direita = Math.min(DIAS * LARGURA_DIA, px(fim) + LARGURA_DIA);
    const projeto = item.nivel === 0;
    const marco = !projeto && !item.inicio;
    const status = STATUS_ITEM[item.status];
    return {
      item,
      semDatas: false,
      barra: {
        esquerda,
        largura: Math.max(10, direita - esquerda),
        marco,
        classe: projeto ? 'projbar' : status.classe + (item.atrasado ? ' late' : ''),
        dica: this.t.tarefas.gantt.dica(item.nome, dataCurta(ini), dataCurta(fim), status.texto),
        percentual: projeto
          ? (progressoPorFilhos(this.store.filhos(item.id))?.percentual ?? 0)
          : null,
      },
    };
  }

  /** O que interessa e os ancestrais (o caminho até lá). */
  private visiveis(itens: Item[], filhos: Map<string, Item[]>): Set<string> {
    const pai = new Map<string, string>();
    for (const [p, fs] of filhos) for (const f of fs) pai.set(f.id, p);
    const ok = new Set<string>();
    for (const i of itens) {
      if (!this.interessa()(i)) continue;
      let id: string | undefined = i.id;
      while (id && !ok.has(id)) {
        ok.add(id);
        id = pai.get(id);
      }
    }
    return ok;
  }
}
