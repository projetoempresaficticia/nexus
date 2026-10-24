import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { AvataresComponent } from '../../../shared/ui/avatares.component';
import { NivelComponent } from '../../../shared/ui/nivel.component';
import { PillStatusComponent } from '../../../shared/ui/pill-status.component';
import { dataCurta } from '../../../shared/utils/datas';
import { progressoPorFilhos } from '../../../shared/utils/progresso';

interface Linha {
  item: Item;
  temFilhos: boolean;
  aberto: boolean;
}

interface Ramo {
  id: string;
  /** Raiz falsa "Sem projeto" para as tarefas avulsas (DESIGN.md). */
  semProjeto: boolean;
  linhas: Linha[];
}

/** Árvore projeto › tarefa › subtarefa, com expandir/recolher e progresso (US-23). */
@Component({
  selector: 'app-arvore',
  imports: [RouterLink, AvataresComponent, NivelComponent, PillStatusComponent],
  templateUrl: './arvore.component.html',
  styleUrl: './arvore.component.css',
})
export class ArvoreComponent {
  private readonly store = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;

  /** Itens dos setores do filtro (projetos e contexto incluídos: são os galhos). */
  readonly itens = input.required<Item[]>();
  /** Folhas que interessam; um galho aparece se ele ou alguém abaixo dele interessa. */
  readonly interessa = input<(i: Item) => boolean>(() => true);

  /** Aberto/fechado escolhido pela pessoa; sem escolha, só projetos começam abertos. */
  private readonly escolhas = signal<ReadonlyMap<string, boolean>>(new Map());

  private readonly filhosDe = computed(() => {
    const mapa = new Map<string, Item[]>();
    for (const i of this.itens()) {
      if (!i.pai_id) continue;
      mapa.set(i.pai_id, [...(mapa.get(i.pai_id) ?? []), i]);
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.ordem - b.ordem || ordemPrazo(a, b));
    return mapa;
  });

  /** Itens visíveis na árvore: os que interessam e todos os seus ancestrais. */
  private readonly mostrar = computed(() => {
    const porId = new Map(this.itens().map((i) => [i.id, i]));
    const ok = new Set<string>();
    for (const i of this.itens()) {
      if (!this.interessa()(i)) continue;
      let atual: Item | undefined = i;
      while (atual && !ok.has(atual.id)) {
        ok.add(atual.id);
        atual = atual.pai_id ? porId.get(atual.pai_id) : undefined;
      }
    }
    return ok;
  });

  protected readonly ramos = computed<Ramo[]>(() => {
    const mostrar = this.mostrar();
    const ids = new Set(this.itens().map((i) => i.id));
    // Raiz: sem pai, ou com o pai fora da lista (outro setor)
    const raizes = this.itens()
      .filter((i) => (!i.pai_id || !ids.has(i.pai_id)) && mostrar.has(i.id))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    const projetos = raizes.filter((i) => i.nivel === 0);
    const avulsas = raizes.filter((i) => i.nivel > 0);
    const ramos = projetos.map((p) => ({ id: p.id, semProjeto: false, linhas: this.linhas(p) }));
    if (avulsas.length) {
      ramos.push({
        id: 'sem-projeto',
        semProjeto: true,
        linhas: avulsas.flatMap((a) => this.linhas(a)),
      });
    }
    return ramos;
  });

  protected alternar(item: Item, aberto: boolean): void {
    this.escolhas.update((m) => new Map(m).set(item.id, !aberto));
  }

  protected todos(aberto: boolean): void {
    this.escolhas.set(new Map(this.itens().map((i) => [i.id, aberto])));
  }

  protected progresso(item: Item) {
    return progressoPorFilhos(this.store.filhos(item.id));
  }

  protected responsaveis(item: Item) {
    return item.responsaveis.map((id) => this.acesso.pessoaPorId().get(id)).filter((p) => !!p);
  }

  protected prazo(item: Item): string {
    return item.atrasado ? this.t.comum.atrasada : dataCurta(item.prazo);
  }

  /** O item e, se aberto, os descendentes que aparecem — em ordem de leitura. */
  private linhas(item: Item): Linha[] {
    const filhos = (this.filhosDe().get(item.id) ?? []).filter((f) => this.mostrar().has(f.id));
    const aberto = this.escolhas().get(item.id) ?? item.nivel === 0;
    const linha = { item, temFilhos: filhos.length > 0, aberto };
    return [linha, ...(aberto ? filhos.flatMap((f) => this.linhas(f)) : [])];
  }
}

function ordemPrazo(a: Item, b: Item): number {
  return (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999');
}
