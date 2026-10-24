import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TEXTOS } from '../../core/models/textos';
import { SemAcessoPage } from './sem-acesso.page';

describe('SemAcessoPage', () => {
  async function montar(auth: Partial<Record<keyof AuthService, unknown>>) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(SemAcessoPage);
    await fixture.whenStable();
    return fixture;
  }

  it('mostra a marca do app e o e-mail de quem tentou entrar', async () => {
    const fixture = await montar({ email: () => 'ana@gmail.com', logado: () => false });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.marca')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toBe(TEXTOS.semAcesso.titulo);
    expect(el.querySelector('p')?.textContent).toBe(TEXTOS.semAcesso.comEmail('ana@gmail.com'));
    expect(el.querySelector('p')?.textContent).toContain('a gestão');
  });

  it('sem sessão: mensagem genérica e botão "Voltar ao início"', async () => {
    const fixture = await montar({ email: () => null, logado: () => false });
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('p')?.textContent).toBe(TEXTOS.semAcesso.semEmail);
    expect(el.querySelector('button')?.textContent?.trim()).toBe(TEXTOS.semAcesso.voltar);
  });

  it('com sessão (perfil inativo): botão "Sair" e desconecta ao clicar', async () => {
    const sair = vi.fn().mockResolvedValue(undefined);
    const limparErroRetorno = vi.fn();
    const fixture = await montar({
      email: () => 'ex-funcionario@estudeemportugal.org',
      logado: () => true,
      sair,
      limparErroRetorno,
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;
    const botao = el.querySelector('button') as HTMLButtonElement;
    expect(botao.textContent?.trim()).toBe(TEXTOS.sair);
    botao.click();
    await fixture.whenStable();
    expect(sair).toHaveBeenCalled();
    expect(limparErroRetorno).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith('/login');
  });
});
