import { Component, input } from '@angular/core';

export interface PessoaAvatar {
  nome: string;
  iniciais: string;
}

/** Círculo com iniciais (32px por padrão). */
@Component({
  selector: 'app-avatar',
  template: `<span
    class="av"
    [title]="pessoa().nome"
    [style.width.px]="tamanho()"
    [style.height.px]="tamanho()"
    [style.font-size.px]="tamanho() < 30 ? 10 : 12"
    >{{ pessoa().iniciais }}</span
  >`,
})
export class AvatarComponent {
  readonly pessoa = input.required<PessoaAvatar>();
  readonly tamanho = input(32);
}
