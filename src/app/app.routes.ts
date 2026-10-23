import { Routes } from '@angular/router';
import { autenticadoGuard } from './core/guards/autenticado.guard';
import { LOGIN_ROUTES } from './features/login/login.routes';

export const routes: Routes = [
  ...LOGIN_ROUTES,
  {
    path: '',
    canActivate: [autenticadoGuard],
    loadComponent: () => import('./features/inicio/inicio.page').then((m) => m.InicioPage),
    title: 'Nexus',
  },
  { path: '**', redirectTo: '' },
];
