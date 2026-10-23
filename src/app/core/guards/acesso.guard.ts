import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AcessoStore } from '../auth/acesso.store';

/** Carrega perfil/setores (carregar_inicial) antes do shell; perfil inativo → "Acesso não autorizado". */
export const acessoGuard: CanActivateFn = async () => {
  const store = inject(AcessoStore);
  const router = inject(Router);
  if (store.carregado()) return true;
  return (await store.carregar()) === 'ok' ? true : router.parseUrl('/sem-acesso');
};

/** Painel, Produtividade e afins: só quem administra algum setor (US-28). */
export const liderGuard: CanActivateFn = () =>
  inject(AcessoStore).ehLider() ? true : inject(Router).parseUrl('/tarefas');

/** Usuários e Setores: só o Adm do sistema. */
export const adminGuard: CanActivateFn = () =>
  inject(AcessoStore).ehAdmin() ? true : inject(Router).parseUrl('/');
