import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase.client';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let falso: ReturnType<typeof supabaseFalso>;
  let auth: AuthService;

  function criar(sessao: Partial<Session> | null = null) {
    falso = supabaseFalso(sessao);
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE, useValue: falso }] });
    auth = TestBed.inject(AuthService);
  }

  it('começa com a sessão guardada', async () => {
    criar({ user: { email: 'ana@estudeemportugal.org' } } as Session);
    await auth.iniciar(new URL('http://localhost:4200/'));
    expect(auth.logado()).toBe(true);
    expect(auth.email()).toBe('ana@estudeemportugal.org');
  });

  it('guarda o erro devolvido pelo login Google', async () => {
    criar();
    await auth.iniciar(
      new URL('http://localhost:4200/?error=access_denied&error_description=acesso_nao_autorizado'),
    );
    expect(auth.logado()).toBe(false);
    expect(auth.erroRetorno()).toBe('acesso_nao_autorizado');
  });

  it('pede ao Google só contas da empresa', async () => {
    criar();
    await auth.entrarComGoogle();
    const opcoes = falso.auth.signInWithOAuth.mock.calls[0][0];
    expect(opcoes.provider).toBe('google');
    expect(opcoes.options.queryParams.hd).toBe('estudeemportugal.org');
  });

  it('traduz senha errada', async () => {
    criar();
    falso.auth.signInWithPassword.mockResolvedValue({
      error: { status: 400, message: 'Invalid login' },
    });
    expect(await auth.entrarComSenha('x@estudeemportugal.org', '12345678')).toBe('senha_invalida');
  });

  it('reconhece conta recusada pelo hook ao criar senha', async () => {
    criar();
    falso.auth.signUp.mockResolvedValue({
      error: { status: 403, message: 'acesso_nao_autorizado' },
    });
    expect(await auth.criarSenha('x@gmail.com', '12345678')).toBe('acesso_nao_autorizado');
  });

  it('sair limpa a sessão', async () => {
    criar({ user: { email: 'a@estudeemportugal.org' } } as Session);
    await auth.iniciar(new URL('http://localhost:4200/'));
    await auth.sair();
    expect(falso.auth.signOut).toHaveBeenCalled();
    expect(auth.logado()).toBe(false);
  });
});
