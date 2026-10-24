import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { PillStatusComponent } from '../../../shared/ui/pill-status.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { Dependencia, ItemService } from '../item.service';

/** Dependências: o que este item espera e o que ele bloqueia; ciclo é recusado pelo banco (US-12). */
@Component({
  selector: 'app-dependencias-item',
  imports: [RouterLink, PillStatusComponent],
  template: `
    <section class="sec">
      <h3>{{ t.item.dependencias }}</h3>
      @if (espera().length) {
        <span class="nav-label">{{ t.item.esperaPor }}</span>
        @for (d of espera(); track d.id) {
          <div class="dep">
            <a [routerLink]="['/item', d.id]">{{ d.nome }}</a>
            <app-pill-status [status]="d.status" />
            @if (podeEditar()) {
              <button
                type="button"
                class="btn sm ghost"
                [attr.aria-label]="t.item.removerDependencia(d.nome)"
                (click)="alternar(d.id, false)"
              >
                ×
              </button>
            }
          </div>
        }
      } @else {
        <p class="hint">{{ t.item.semDependencias }}</p>
      }
      @if (bloqueia().length) {
        <span class="nav-label">{{ t.item.bloqueia }}</span>
        @for (d of bloqueia(); track d.id) {
          <div class="dep">
            <a [routerLink]="['/item', d.id]">{{ d.nome }}</a>
            <app-pill-status [status]="d.status" />
          </div>
        }
      }
      @if (podeEditar() && candidatos().length) {
        <label class="fld">
          {{ t.item.adicionarDependencia }}
          <select (change)="adicionar($any($event.target))">
            <option value="">{{ t.item.escolhaItem }}</option>
            @for (c of candidatos(); track c.id) {
              <option [value]="c.id">{{ c.nome }}</option>
            }
          </select>
        </label>
      }
    </section>
  `,
  styles: `
    .nav-label {
      color: var(--muted);
    }
    .dep {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .dep a {
      margin-right: auto;
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class DependenciasItemComponent {
  private readonly service = inject(ItemService);
  private readonly itens = inject(ItensStore);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  private readonly deps = signal<Dependencia[]>([]);
  private readonly porIds = (ids: string[]) =>
    ids.map((id) => this.itens.porId(id)).filter((i): i is Item => !!i);

  protected readonly espera = computed(() =>
    this.porIds(
      this.deps()
        .filter((d) => d.item_id === this.item().id)
        .map((d) => d.depende_de_id),
    ),
  );
  protected readonly bloqueia = computed(() =>
    this.porIds(
      this.deps()
        .filter((d) => d.depende_de_id === this.item().id)
        .map((d) => d.item_id),
    ),
  );
  protected readonly candidatos = computed(() => {
    const ja = new Set([this.item().id, ...this.espera().map((i) => i.id)]);
    return this.itens
      .todos()
      .filter((i) => i.nivel > 0 && !ja.has(i.id) && i.status !== 'concluida')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  });

  constructor() {
    effect(() => {
      const id = this.item().id;
      void this.carregar(id);
    });
  }

  protected async adicionar(select: HTMLSelectElement): Promise<void> {
    const id = select.value;
    select.value = '';
    if (id) await this.alternar(id, true);
  }

  protected async alternar(dependeDe: string, ligar: boolean): Promise<void> {
    try {
      await this.service.definirDependencia(this.item().id, dependeDe, ligar);
      await this.carregar(this.item().id);
    } catch (e) {
      this.toast.erro(e);
    }
  }

  private async carregar(id: string): Promise<void> {
    try {
      this.deps.set(await this.service.listarDependencias(id));
    } catch (e) {
      this.toast.erro(e);
    }
  }
}
