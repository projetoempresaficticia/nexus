import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // A sessão precisa estar pronta antes dos guards decidirem a primeira rota.
    provideAppInitializer(() => inject(AuthService).iniciar()),
    provideRouter(routes, withComponentInputBinding()),
  ],
};
