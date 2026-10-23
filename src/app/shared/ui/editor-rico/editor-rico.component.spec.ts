import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EditorRicoComponent } from './editor-rico.component';

@Component({
  imports: [EditorRicoComponent],
  template: `<app-editor-rico [(valor)]="html" rotulo="Comentário" />`,
})
class Host {
  readonly html = signal('<p>Olá <b>mundo</b><script>alert(1)</script></p>');
}

describe('EditorRicoComponent', () => {
  async function montar() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('mostra o conteúdo já sanitizado e a barra de formatação', async () => {
    const { el } = await montar();
    const area = el.querySelector('.ProseMirror') as HTMLElement;
    expect(area.innerHTML).toContain('<strong>mundo</strong>');
    expect(area.innerHTML).not.toContain('script');
    expect(el.querySelector('[role=toolbar]')?.getAttribute('aria-label')).toBe('Formatação');
    expect(el.querySelector('[aria-label="Inserir imagem"]')).toBeNull();
  });

  it('atualiza o conteúdo quando o valor muda por fora', async () => {
    const { fixture, el } = await montar();
    fixture.componentInstance.html.set('<p>novo texto</p>');
    await fixture.whenStable();
    expect((el.querySelector('.ProseMirror') as HTMLElement).textContent).toBe('novo texto');
  });
});
