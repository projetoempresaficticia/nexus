import { Component } from '@angular/core';

/** Mensagem cinza de estado vazio (o texto vem do GLOSSARIO_UI via textos.ts). */
@Component({
  selector: 'app-vazio',
  template: `<p class="empty"><ng-content /></p>`,
  styles: `
    .empty {
      margin: 0;
    }
  `,
})
export class VazioComponent {}
