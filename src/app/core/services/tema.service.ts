import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

type Tema = 'claro' | 'escuro';
const CHAVE = 'nexus-tema';

/** Tema claro/escuro: segue o sistema até a pessoa escolher; a escolha fica no localStorage (DESIGN.md). */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly doc = inject(DOCUMENT);
  private readonly midia = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly sistemaEscuro = signal(this.midia?.matches ?? false);
  private readonly escolha = signal<Tema | null>(this.ler());

  readonly escuro = computed(() => {
    const e = this.escolha();
    return e ? e === 'escuro' : this.sistemaEscuro();
  });

  constructor() {
    this.midia?.addEventListener?.('change', (ev) => this.sistemaEscuro.set(ev.matches));
    effect(() => {
      const e = this.escolha();
      const raiz = this.doc.documentElement;
      if (e) raiz.setAttribute('data-theme', e === 'escuro' ? 'dark' : 'light');
      else raiz.removeAttribute('data-theme');
    });
  }

  alternar(): void {
    const novo: Tema = this.escuro() ? 'claro' : 'escuro';
    this.escolha.set(novo);
    try {
      localStorage.setItem(CHAVE, novo);
    } catch {
      // armazenamento indisponível (modo privado): o tema vale só nesta sessão
    }
  }

  private ler(): Tema | null {
    try {
      const v = localStorage.getItem(CHAVE);
      return v === 'claro' || v === 'escuro' ? v : null;
    } catch {
      return null;
    }
  }
}
