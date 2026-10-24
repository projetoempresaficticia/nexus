import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { BarraComponent } from '../../../shared/ui/barra.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { ItemService, PassoChecklist } from '../item.service';

/** Checklist do item: marcar (otimista), adicionar e remover passos (US-11). */
@Component({
  selector: 'app-checklist-item',
  imports: [BarraComponent],
  template: `
    <section class="sec">
      <div class="sec-h">
        <h3>{{ t.item.checklist }}</h3>
        @if (passos().length) {
          <span class="row-sub num">{{
            t.item.checklistProgresso(feitos(), passos().length, percentual())
          }}</span>
        }
      </div>
      @if (passos().length) {
        <app-barra [percentual]="percentual()" [class.completo]="percentual() === 100" />
      }
      @for (p of passos(); track p.id) {
        <div class="passo">
          <input
            type="checkbox"
            [id]="'ck-' + p.id"
            [checked]="p.feito"
            [disabled]="!podeEditar()"
            (change)="marcar(p, $any($event.target).checked)"
          />
          <label [for]="'ck-' + p.id" [class.feito]="p.feito">{{ p.texto }}</label>
          @if (podeEditar()) {
            <button
              type="button"
              class="btn sm ghost"
              [attr.aria-label]="t.item.removerPasso(p.texto)"
              (click)="remover(p)"
            >
              ×
            </button>
          }
        </div>
      }
      @if (podeEditar()) {
        <div class="novo">
          <label class="sr" for="ck-novo">{{ t.item.novoPasso }}</label>
          <input
            id="ck-novo"
            type="text"
            autocomplete="off"
            [placeholder]="t.item.novoPassoAjuda"
            [value]="texto()"
            (input)="texto.set($any($event.target).value)"
            (keydown.enter)="adicionar()"
          />
          <button type="button" class="btn" (click)="adicionar()">
            {{ t.item.adicionarPasso }}
          </button>
        </div>
      }
      @if (item().nivel === 1 && item().qtd_filhos) {
        <p class="hint">{{ t.item.checklistTarefa }}</p>
      } @else if (item().nivel === 2) {
        <p class="hint">{{ t.item.checklistSubtarefa }}</p>
      }
    </section>
  `,
  styles: `
    .sec-h h3 {
      margin-right: auto;
    }
    .passo {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
      padding: 0 6px;
      border-radius: 8px;
    }
    .passo:hover {
      background: var(--surface-2);
    }
    .passo input {
      width: 18px;
      height: 18px;
      accent-color: var(--accent);
      flex: none;
    }
    .passo label {
      flex: 1;
      font-size: 14px;
      cursor: pointer;
    }
    .passo label.feito {
      text-decoration: line-through;
      color: var(--muted);
    }
    .novo {
      display: flex;
      gap: 8px;
    }
    .novo input {
      flex: 1;
      min-width: 0;
      height: 40px;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 0 12px;
      background: var(--surface);
    }
    .hint {
      margin: 0;
    }
    .completo ::ng-deep .bar > span {
      background: var(--done-fg);
    }
    .sr {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
  `,
})
export class ChecklistItemComponent {
  private readonly service = inject(ItemService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  protected readonly passos = signal<PassoChecklist[]>([]);
  protected readonly texto = signal('');
  protected readonly feitos = computed(() => this.passos().filter((p) => p.feito).length);
  protected readonly percentual = computed(() =>
    this.passos().length ? Math.round((this.feitos() / this.passos().length) * 100) : 0,
  );

  constructor() {
    effect(() => {
      const id = this.item().id;
      this.service.listarChecklist(id).then(
        (passos) => this.passos.set(passos),
        (e) => this.toast.erro(e),
      );
    });
  }

  protected async marcar(passo: PassoChecklist, feito: boolean): Promise<void> {
    this.trocar(passo.id, { ...passo, feito });
    try {
      await this.service.marcarPasso(passo.id, feito);
    } catch (e) {
      this.trocar(passo.id, passo);
      this.toast.erro(e);
    }
  }

  protected async adicionar(): Promise<void> {
    const texto = this.texto().trim();
    if (!texto) return;
    this.texto.set('');
    try {
      const novo = await this.service.adicionarPasso(
        this.item().id,
        texto,
        this.passos().length + 1,
      );
      this.passos.update((ps) => [...ps, novo]);
    } catch (e) {
      this.texto.set(texto);
      this.toast.erro(e);
    }
  }

  protected async remover(passo: PassoChecklist): Promise<void> {
    const antes = this.passos();
    this.passos.update((ps) => ps.filter((p) => p.id !== passo.id));
    try {
      await this.service.removerPasso(passo.id);
    } catch (e) {
      this.passos.set(antes);
      this.toast.erro(e);
    }
  }

  private trocar(id: string, passo: PassoChecklist): void {
    this.passos.update((ps) => ps.map((p) => (p.id === id ? passo : p)));
  }
}
