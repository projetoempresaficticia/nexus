import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Envolve um conteúdo largo (ex.: o quadro do Kanban) com uma barra de rolagem horizontal
 * idêntica em cima, além da de baixo — pra não precisar descer a página inteira até achar a
 * barra quando o conteúdo é alto (T-68). As duas rolam juntas.
 */
@Component({
  selector: 'app-rolagem-topo',
  template: `
    <div class="rt-topo" #topo (scroll)="copiar(topo, conteudo)">
      <div [style.width.px]="largura()"></div>
    </div>
    <div class="rt-conteudo" #conteudo (scroll)="copiar(conteudo, topo)">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .rt-topo {
      overflow-x: auto;
      overflow-y: hidden;
      height: 17px;
    }
    .rt-topo > div {
      height: 1px;
    }
    .rt-conteudo {
      overflow-x: auto;
      padding-bottom: 6px;
    }
  `,
})
export class RolagemTopoComponent implements AfterViewInit {
  private readonly conteudoRef = viewChild.required<ElementRef<HTMLDivElement>>('conteudo');
  protected readonly largura = signal(0);
  private sincronizando = false;

  /** Acompanha a largura real do conteúdo (muda quando colunas entram/saem) pra barra de cima bater com a de baixo. */
  ngAfterViewInit(): void {
    const alvo = this.conteudoRef().nativeElement;
    this.largura.set(alvo.scrollWidth);
    // jsdom (testes) não tem ResizeObserver; nos navegadores de verdade, sempre tem.
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => this.largura.set(alvo.scrollWidth));
    observador.observe(alvo);
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }

  protected copiar(de: HTMLDivElement, para: HTMLDivElement): void {
    if (this.sincronizando) return;
    this.sincronizando = true;
    para.scrollLeft = de.scrollLeft;
    this.sincronizando = false;
  }
}
