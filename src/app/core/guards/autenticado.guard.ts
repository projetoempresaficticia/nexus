import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Só entra com sessão. Login recusado pelo hook vai para "Acesso não autorizado". */
export const autenticadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.erroRetorno()) return router.parseUrl('/sem-acesso');
  return auth.logado() ? true : router.parseUrl('/login');
};

/** A tela de login não faz sentido para quem já entrou. */
export const visitanteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logado() ? inject(Router).parseUrl('/') : true;
};
