import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { supabaseFalso } from '../../../testing/supabase-falso';
import { AuthService } from '../auth/auth.service';
import { SUPABASE } from '../supabase.client';
import { autenticadoGuard, visitanteGuard } from './autenticado.guard';

describe('guards de autenticação', () => {
  async function preparar(sessao: Partial<Session> | null, url = 'http://localhost:4200/') {
    TestBed.configureTestingModule({
      providers: [{ provide: SUPABASE, useValue: supabaseFalso(sessao) }],
    });
    await TestBed.inject(AuthService).iniciar(new URL(url));
  }
  const rodar = (guard: typeof autenticadoGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  const caminho = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('deixa entrar quem tem sessão', async () => {
    await preparar({ user: { email: 'a@estudeemportugal.org' } } as Session);
    expect(rodar(autenticadoGuard)).toBe(true);
  });

  it('manda para o login quem não tem sessão', async () => {
    await preparar(null);
    expect(caminho(rodar(autenticadoGuard))).toBe('/login');
  });

  it('manda para "sem acesso" quando o Google devolveu erro', async () => {
    await preparar(null, 'http://localhost:4200/?error_description=acesso_nao_autorizado');
    expect(caminho(rodar(autenticadoGuard))).toBe('/sem-acesso');
  });

  it('tira do login quem já entrou', async () => {
    await preparar({ user: { email: 'a@estudeemportugal.org' } } as Session);
    expect(caminho(rodar(visitanteGuard))).toBe('/');
  });
});
