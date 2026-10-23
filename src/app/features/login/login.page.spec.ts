import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { SUPABASE } from '../../core/supabase.client';
import { TEXTOS, textoErro } from '../../core/models/textos';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let falso: ReturnType<typeof supabaseFalso>;

  beforeEach(() => {
    falso = supabaseFalso();
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]), { provide: SUPABASE, useValue: falso }],
    });
  });

  it('mostra o botão do Google e chama o login', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const botao = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.includes(TEXTOS.login.entrarGoogle),
    ) as HTMLButtonElement;
    expect(botao).toBeTruthy();
    botao.click();
    expect(falso.auth.signInWithOAuth).toHaveBeenCalled();
  });

  it('mostra erro de senha incorreta', async () => {
    falso.auth.signInWithPassword.mockResolvedValue({ error: { status: 400, message: 'x' } });
    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role=alert]')?.textContent).toContain(
      TEXTOS.login.senhaInvalida,
    );
  });
});

describe('textoErro', () => {
  it('traduz códigos conhecidos e cai no erro de rede', () => {
    expect(textoErro('sem_permissao')).toBe(TEXTOS.erros.sem_permissao);
    expect(textoErro('xyz')).toBe(TEXTOS.erros.rede);
    expect(textoErro(null)).toBe(TEXTOS.erros.rede);
  });
});
