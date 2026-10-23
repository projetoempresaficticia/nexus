import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { sanitizar } from '../utils/html-seguro';

/**
 * Único jeito de pôr HTML de usuário no [innerHTML] (NAO_FAZER #4). Limpa com DOMPurify e só então
 * marca como confiável — o sanitizador do Angular removeria o data-uid das menções.
 */
@Pipe({ name: 'htmlSeguro' })
export class HtmlSeguroPipe implements PipeTransform {
  private readonly dom = inject(DomSanitizer);

  transform(html: string | null | undefined): SafeHtml {
    return this.dom.bypassSecurityTrustHtml(sanitizar(html));
  }
}
