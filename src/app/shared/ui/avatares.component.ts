import { Component, computed, input } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';
import { AvatarComponent, PessoaAvatar } from './avatar.component';

/** Vários responsáveis: até 3 sobrepostos + "+N"; vazio = "Sem responsável" (DESIGN.md, US-35). */
@Component({
  selector: 'app-avatares',
  imports: [AvatarComponent],
  template: `
    @if (pessoas().length) {
      <span class="avs" [title]="nomes()">
        @for (p of visiveis(); track p.iniciais + $index) {
          <app-avatar [pessoa]="p" [tamanho]="tamanho()" />
        }
        @if (resto() > 0) {
          <span class="av mais" [style.width.px]="tamanho()" [style.height.px]="tamanho()">{{
            t.comum.maisPessoas(resto())
          }}</span>
        }
      </span>
    } @else {
      <span class="muted vazio">{{ t.comum.semResponsavel }}</span>
    }
  `,
  styles: `
    .avs {
      display: inline-flex;
      align-items: center;
    }
    .avs > * + * {
      margin-left: -8px;
    }
    .avs ::ng-deep .av,
    .mais {
      box-shadow: 0 0 0 2px var(--surface);
    }
    .mais {
      background: var(--surface-2);
      color: var(--muted);
      font-size: 11px;
    }
    .vazio {
      font-size: 13px;
    }
  `,
})
export class AvataresComponent {
  protected readonly t = TEXTOS;
  readonly pessoas = input.required<PessoaAvatar[]>();
  readonly tamanho = input(28);
  readonly maximo = input(3);

  protected readonly visiveis = computed(() => this.pessoas().slice(0, this.maximo()));
  protected readonly resto = computed(() => this.pessoas().length - this.maximo());
  protected readonly nomes = computed(() =>
    this.pessoas()
      .map((p) => p.nome)
      .join(', '),
  );
}
