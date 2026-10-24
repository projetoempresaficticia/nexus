import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AcessoStore } from './core/auth/acesso.store';
import { acessoGuard, adminGuard, liderGuard } from './core/guards/acesso.guard';
import { autenticadoGuard } from './core/guards/autenticado.guard';
import { TEXTOS } from './core/models/textos';
import { LOGIN_ROUTES } from './features/login/login.routes';

const m = TEXTOS.menu;
const emBreve = () => import('./features/em-breve/em-breve.page').then((x) => x.EmBrevePage);

export const routes: Routes = [
  ...LOGIN_ROUTES,
  {
    path: '',
    canActivate: [autenticadoGuard, acessoGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((x) => x.ShellComponent),
    children: [
      // Rota inicial: Painel para quem lidera, Minhas tarefas para os demais (US-01)
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => (inject(AcessoStore).ehLider() ? 'painel' : 'tarefas'),
      },
      {
        path: 'painel',
        canActivate: [liderGuard],
        loadComponent: () => import('./features/painel/painel.page').then((x) => x.PainelPage),
        title: m.painel,
      },
      {
        path: 'produtividade',
        canActivate: [liderGuard],
        loadComponent: emBreve,
        data: { titulo: m.produtividade },
        title: m.produtividade,
      },
      {
        path: 'projetos',
        loadComponent: () =>
          import('./features/projetos/projetos.page').then((x) => x.ProjetosPage),
        title: m.projetos,
      },
      {
        path: 'tarefas',
        loadComponent: () => import('./features/tarefas/tarefas.page').then((x) => x.TarefasPage),
        title: m.tarefas,
      },
      {
        path: 'item/:id',
        loadComponent: () => import('./features/item/item.page').then((x) => x.ItemPage),
        title: 'Item',
      },
      {
        path: 'solicitacoes',
        loadComponent: () =>
          import('./features/solicitacoes/solicitacoes.page').then((x) => x.SolicitacoesPage),
        title: m.solicitacoes,
      },
      { path: 'equipe', loadComponent: emBreve, data: { titulo: m.equipe }, title: m.equipe },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: emBreve,
        data: { titulo: m.usuarios },
        title: m.usuarios,
      },
      {
        path: 'setores',
        canActivate: [adminGuard],
        loadComponent: emBreve,
        data: { titulo: m.setores },
        title: m.setores,
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
