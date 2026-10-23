import { Component, inject, input } from '@angular/core';
import { AcessoStore, OpcaoSetor } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';

/** Topo da área de trabalho: título, subtítulo, seletor de Setor e ações (conteúdo projetado). */
@Component({
  selector: 'app-cabecalho',
  template: `
    <header class="head">
      <div class="head-t">
        <ng-content select="[antes]" />
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p class="muted sub">{{ subtitulo() }}</p>
        }
      </div>
      @if (mostrarSetor()) {
        <label class="field-inline">
          {{ t.setor.rotulo }}
          <select (change)="acesso.setorFiltro.set($any($event.target).value)">
            <option value="todos" [selected]="acesso.setorFiltro() === 'todos'">
              {{ t.setor.todos }}
            </option>
            @for (o of acesso.opcoesSetor(); track o.id) {
              <option [value]="o.id" [selected]="acesso.setorFiltro() === o.id">
                {{ rotulo(o) }}
              </option>
            }
          </select>
        </label>
      }
      <ng-content />
    </header>
  `,
  styles: `
    .sub {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class CabecalhoComponent {
  protected readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;

  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly mostrarSetor = input(true);

  protected rotulo(o: OpcaoSetor): string {
    const recuo = '   '.repeat(o.nivel) + (o.nivel ? '└ ' : '');
    const papel =
      o.papel === 'lider'
        ? ` (${this.t.papel.lider})`
        : o.papel === 'adm'
          ? ` (${this.t.papel.adm})`
          : '';
    return recuo + o.nome + papel;
  }
}
