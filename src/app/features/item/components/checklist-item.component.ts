import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { RealtimeService, afetaItem } from '../../../core/services/realtime.service';
import { HtmlSeguroPipe } from '../../../shared/pipes/html-seguro.pipe';
import { BarraComponent } from '../../../shared/ui/barra.component';
import { CampoMencaoComponent } from '../../../shared/ui/campo-mencao.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { htmlVazio, sanitizar, textoPuro } from '../../../shared/utils/html-seguro';
import { ItemService, PassoChecklist } from '../item.service';

/** Checklist do item: marcar (otimista), adicionar com @menção, editar (duplo clique) e remover (US-11, US-40). */
@Component({
  selector: 'app-checklist-item',
  imports: [BarraComponent, CampoMencaoComponent, HtmlSeguroPipe],
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
            [checked]="p.feito"
            [disabled]="!podeEditar()"
            [attr.aria-labelledby]="'ck-' + p.id"
            (change)="marcar(p, $any($event.target).checked)"
          />
          @if (editandoId() === p.id) {
            <app-campo-mencao
              [(valor)]="rascunho"
              [pessoas]="pessoas()"
              [rotulo]="t.item.editarPasso(textoPuro(p.texto))"
              [focar]="true"
              (enviar)="salvarEdicao(p)"
              (saiu)="salvarEdicao(p)"
              (cancelar)="editandoId.set(null)"
            />
          } @else {
            <span
              class="texto"
              [id]="'ck-' + p.id"
              [class.feito]="p.feito"
              [title]="podeEditar() ? t.item.dicaEditarPasso : ''"
              [innerHTML]="p.texto | htmlSeguro"
              (dblclick)="comecarEdicao(p)"
            ></span>
            @if (podeEditar()) {
              <button
                type="button"
                class="btn sm ghost"
                [attr.aria-label]="t.item.editarPasso(textoPuro(p.texto))"
                (click)="comecarEdicao(p)"
              >
                ✎
              </button>
              <button
                type="button"
                class="btn sm ghost"
                [attr.aria-label]="t.item.removerPasso(textoPuro(p.texto))"
                (click)="remover(p)"
              >
                ×
              </button>
            }
          }
        </div>
      }
      @if (podeEditar()) {
        <div class="novo">
          <app-campo-mencao
            [(valor)]="texto"
            [pessoas]="pessoas()"
            [rotulo]="t.item.novoPassoAjuda"
            (enviar)="adicionar()"
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
    .passo .texto {
      flex: 1;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .passo .texto.feito {
      text-decoration: line-through;
      color: var(--muted);
    }
    .novo {
      display: flex;
      gap: 8px;
    }
    .hint {
      margin: 0;
    }
    .completo ::ng-deep .bar > span {
      background: var(--done-fg);
    }
  `,
})
export class ChecklistItemComponent {
  private readonly service = inject(ItemService);
  private readonly toast = inject(ToastService);
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;
  protected readonly textoPuro = textoPuro;
  protected readonly pessoas = computed(() => this.acesso.pessoas());
  protected readonly editandoId = signal<string | null>(null);
  protected readonly rascunho = signal('');
  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  protected readonly passos = signal<PassoChecklist[]>([]);
  protected readonly texto = signal('');
  protected readonly feitos = computed(() => this.passos().filter((p) => p.feito).length);
  protected readonly percentual = computed(() =>
    this.passos().length ? Math.round((this.feitos() / this.passos().length) * 100) : 0,
  );

  constructor() {
    effect(() => this.carregar(this.item().id));
    inject(RealtimeService).ouvirAqui(['checklist_itens'], (e) => {
      const id = this.item().id;
      if (
        afetaItem(
          e,
          id,
          this.passos().map((p) => p.id),
        )
      )
        this.carregar(id);
    });
  }

  private carregar(id: string): void {
    this.service.listarChecklist(id).then(
      (passos) => this.passos.set(passos),
      (e) => this.toast.erro(e),
    );
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
    if (htmlVazio(this.texto())) return;
    const texto = sanitizar(this.texto());
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

  protected comecarEdicao(passo: PassoChecklist): void {
    if (!this.podeEditar()) return;
    this.rascunho.set(passo.texto);
    this.editandoId.set(passo.id);
  }

  /** Enter ou sair do campo salva; texto vazio ou igual não muda nada. */
  protected async salvarEdicao(passo: PassoChecklist): Promise<void> {
    if (this.editandoId() !== passo.id) return;
    this.editandoId.set(null);
    if (htmlVazio(this.rascunho())) return;
    const texto = sanitizar(this.rascunho());
    if (texto === passo.texto) return;
    this.trocar(passo.id, { ...passo, texto });
    try {
      await this.service.editarPasso(passo.id, texto);
    } catch (e) {
      this.trocar(passo.id, passo);
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
