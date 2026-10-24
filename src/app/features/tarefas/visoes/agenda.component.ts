import { Component, computed, input } from '@angular/core';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { LinhaItemComponent } from '../../../shared/ui/linha-item.component';
import { hojeIso, segundaDaSemana, somarDias } from '../../../shared/utils/datas';

type Grupo = keyof typeof TEXTOS.tarefas.agenda.grupos;

const COR: Record<Grupo, string> = {
  atrasados: 'var(--danger)',
  hoje: 'var(--accent)',
  amanha: 'var(--prog-fg)',
  semana: 'var(--prog-fg)',
  duasSemanas: 'var(--muted)',
  adiante: 'var(--muted)',
  semPrazo: 'var(--muted)',
};

/** Agenda: itens abertos agrupados pelo prazo, de Atrasados a Sem prazo (US-24). */
@Component({
  selector: 'app-agenda',
  imports: [LinhaItemComponent],
  template: `
    <div class="bar-tools">
      <ng-content />
      <span class="hint">{{ t.tarefas.agenda.dica }}</span>
    </div>
    @for (g of grupos(); track g.id) {
      <section class="panel">
        <div class="panel-h">
          <span class="dot" [style.background]="g.cor"></span>
          <h2>{{ g.nome }}</h2>
          <span class="row-sub">{{ t.tarefas.agenda.itens(g.itens.length) }}</span>
        </div>
        @for (i of g.itens; track i.id) {
          <app-linha-item [item]="i" />
        }
      </section>
    } @empty {
      <div class="empty">{{ t.tarefas.agenda.vazio }}</div>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel-h h2 {
      margin-right: auto;
    }
  `,
})
export class AgendaComponent {
  protected readonly t = TEXTOS;
  readonly itens = input.required<Item[]>();
  /** Para testes: "hoje" em Lisboa. */
  readonly hoje = input(hojeIso());

  protected readonly grupos = computed(() => {
    const hoje = this.hoje();
    const amanha = somarDias(hoje, 1);
    const fimSemana = somarDias(segundaDaSemana(hoje), 6);
    const fimDuas = somarDias(fimSemana, 14);
    const grupoDe = (i: Item): Grupo => {
      const d = i.prazo;
      if (i.atrasado || (d && d < hoje)) return 'atrasados';
      if (!d) return 'semPrazo';
      if (d === hoje) return 'hoje';
      if (d === amanha) return 'amanha';
      if (d <= fimSemana) return 'semana';
      if (d <= fimDuas) return 'duasSemanas';
      return 'adiante';
    };
    const porGrupo = new Map<Grupo, Item[]>();
    for (const i of this.itens()) {
      if (i.status === 'concluida') continue;
      const g = grupoDe(i);
      porGrupo.set(g, [...(porGrupo.get(g) ?? []), i]);
    }
    return (Object.keys(COR) as Grupo[])
      .filter((g) => porGrupo.has(g))
      .map((g) => ({
        id: g,
        nome: this.t.tarefas.agenda.grupos[g],
        cor: COR[g],
        itens: porGrupo.get(g)!.sort((a, b) => (a.prazo ?? '9').localeCompare(b.prazo ?? '9')),
      }));
  });
}
