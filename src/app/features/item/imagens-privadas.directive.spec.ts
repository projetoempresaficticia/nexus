import { HtmlSeguroPipe } from '../../shared/pipes/html-seguro.pipe';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnexosService } from './anexos.service';
import { ImagensPrivadasDirective } from './imagens-privadas.directive';

@Component({
  imports: [ImagensPrivadasDirective, HtmlSeguroPipe],
  template: `<div [innerHTML]="html() | htmlSeguro" [appImagensPrivadas]="html()"></div>`,
})
class Host {
  readonly html = signal('<p>ver</p><img data-caminho="s1/i1/foto.png" alt="foto">');
}

describe('ImagensPrivadasDirective', () => {
  it('troca o src das imagens privadas por URL assinada', async () => {
    const urlImagem = vi.fn().mockResolvedValue('https://exemplo.supabase.co/assinada');
    TestBed.configureTestingModule({
      providers: [{ provide: AnexosService, useValue: { urlImagem } }],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(urlImagem).toHaveBeenCalledWith('s1/i1/foto.png');
    expect(img.src).toBe('https://exemplo.supabase.co/assinada');
  });
});
