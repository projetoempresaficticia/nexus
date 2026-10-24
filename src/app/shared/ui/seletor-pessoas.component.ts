import { Component, computed, input, model, signal } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';
import { AvatarComponent } from './avatar.component';

export interface OpcaoPessoa {
  id: string;
  nome: string;
  iniciais: string;
}

/** Vários responsáveis: busca + chips (avatar, nome, ×). Só lista quem tem vínculo no setor (DESIGN.md, US-35). */
@Component({
  selector: 'app-seletor-pessoas',
  imports: [AvatarComponent],
  template: `
    <div class="chips">
      @for (p of escolhidas(); track p.id) {
        <span class="chip">
          <app-avatar [pessoa]="p" [tamanho]="22" />
          {{ p.nome }}{{ p.id === euId() ? ' ' + t.comum.eu : '' }}
          <button
            type="button"
            class="x"
            [attr.aria-label]="'Remover ' + p.nome"
            (click)="remover(p.id)"
          >
            ×
          </button>
        </span>
      }
      <input
        type="search"
        [attr.aria-label]="rotulo()"
        [placeholder]="t.novoItem.adicionarPessoa"
        [value]="busca()"
        (input)="busca.set($any($event.target).value)"
        (keydown.enter)="$event.preventDefault(); escolher(sugestoes()[0])"
      />
    </div>
    @if (busca() && sugestoes().length) {
      <div class="lista" role="listbox" [attr.aria-label]="rotulo()">
        @for (p of sugestoes(); track p.id) {
          <button
            type="button"
            class="mi"
            role="option"
            aria-selected="false"
            (click)="escolher(p)"
          >
            <app-avatar [pessoa]="p" [tamanho]="26" />{{ p.nome }}
          </button>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      min-height: 42px;
      padding: 4px 8px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--surface);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 4px 2px 2px;
      border-radius: 999px;
      background: var(--surface-2);
      font-size: 13px;
      font-weight: 600;
    }
    .x {
      border: 0;
      background: transparent;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      color: var(--muted);
    }
    input {
      flex: 1 1 120px;
      border: 0;
      height: 32px;
      background: transparent;
      outline: none;
      font-weight: 400;
    }
    .lista {
      position: absolute;
      z-index: 5;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: var(--shadow);
      padding: 6px;
    }
  `,
})
export class SeletorPessoasComponent {
  protected readonly t = TEXTOS;
  readonly opcoes = input.required<OpcaoPessoa[]>();
  readonly selecionados = model<string[]>([]);
  readonly euId = input<string | null>(null);
  readonly rotulo = input('Responsáveis');
  protected readonly busca = signal('');

  protected readonly escolhidas = computed(() => {
    const porId = new Map(this.opcoes().map((p) => [p.id, p]));
    return this.selecionados()
      .map((id) => porId.get(id))
      .filter((p): p is OpcaoPessoa => !!p);
  });

  protected readonly sugestoes = computed(() => {
    const q = this.busca().toLocaleLowerCase('pt');
    const ja = new Set(this.selecionados());
    return this.opcoes()
      .filter((p) => !ja.has(p.id) && p.nome.toLocaleLowerCase('pt').includes(q))
      .slice(0, 8);
  });

  protected escolher(p: OpcaoPessoa | undefined): void {
    if (!p) return;
    this.selecionados.update((ids) => [...ids, p.id]);
    this.busca.set('');
  }

  protected remover(id: string): void {
    this.selecionados.update((ids) => ids.filter((x) => x !== id));
  }
}
