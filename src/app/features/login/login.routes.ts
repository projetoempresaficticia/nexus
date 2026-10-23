import { Routes } from '@angular/router';
import { visitanteGuard } from '../../core/guards/autenticado.guard';

export const LOGIN_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [visitanteGuard],
    loadComponent: () => import('./login.page').then((m) => m.LoginPage),
    title: 'Entrar · Nexus',
  },
  {
    path: 'sem-acesso',
    loadComponent: () => import('./sem-acesso.page').then((m) => m.SemAcessoPage),
    title: 'Acesso não autorizado · Nexus',
  },
];
