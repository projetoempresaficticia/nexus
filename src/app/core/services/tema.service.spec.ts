import { TestBed } from '@angular/core/testing';
import { TemaService } from './tema.service';

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('alterna e lembra a escolha', async () => {
    const tema = TestBed.inject(TemaService);
    const antes = tema.escuro();
    tema.alternar();
    TestBed.tick();
    expect(tema.escuro()).toBe(!antes);
    expect(document.documentElement.getAttribute('data-theme')).toBe(antes ? 'light' : 'dark');
    expect(localStorage.getItem('nexus-tema')).toBe(antes ? 'claro' : 'escuro');
  });

  it('usa a escolha guardada', () => {
    localStorage.setItem('nexus-tema', 'escuro');
    expect(TestBed.inject(TemaService).escuro()).toBe(true);
  });
});
