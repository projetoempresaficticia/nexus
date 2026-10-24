import { Directive, ElementRef, afterRenderEffect, inject, input } from '@angular/core';
import { AnexosService } from './anexos.service';

/**
 * Em blocos de HTML do usuário: troca o src das <img data-caminho> por uma URL assinada nova
 * (o bucket é privado e a URL gravada expira). Uso: <div [innerHTML]="html | htmlSeguro" [appImagensPrivadas]="html">.
 */
@Directive({ selector: '[appImagensPrivadas]' })
export class ImagensPrivadasDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly anexos = inject(AnexosService);
  /** O HTML exibido: muda → o bloco foi redesenhado → resolve as imagens de novo. */
  readonly html = input<string | null>(null, { alias: 'appImagensPrivadas' });

  constructor() {
    afterRenderEffect(() => {
      this.html();
      for (const img of this.el.nativeElement.querySelectorAll<HTMLImageElement>(
        'img[data-caminho]',
      )) {
        const caminho = img.dataset['caminho'];
        if (!caminho || img.dataset['assinada'] === caminho) continue;
        img.dataset['assinada'] = caminho;
        this.anexos.urlImagem(caminho).then(
          (url) => (img.src = url),
          () => img.removeAttribute('src'),
        );
      }
    });
  }
}
