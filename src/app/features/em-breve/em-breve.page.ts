import { Component, input } from '@angular/core';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';

/** Lugar provisório das telas que ainda vão ser feitas (o título vem do `data` da rota). */
@Component({
  selector: 'app-em-breve-page',
  imports: [CabecalhoComponent],
  template: `
    <app-cabecalho [titulo]="titulo()" />
    <div class="card vazio">{{ t.emBreve }}</div>
  `,
  styles: `
    .vazio {
      padding: 32px;
      color: var(--muted);
    }
  `,
})
export class EmBrevePage {
  protected readonly t = TEXTOS;
  readonly titulo = input('');
}
