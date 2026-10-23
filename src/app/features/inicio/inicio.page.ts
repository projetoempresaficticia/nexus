import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TEXTOS } from '../../core/models/textos';

/** Página provisória depois do login — a T-13 troca pelo shell com a barra lateral. */
@Component({
  selector: 'app-inicio-page',
  template: `
    <main class="inicio fade">
      <h1>{{ t.marca }}</h1>
      <p class="muted">{{ auth.email() }}</p>
      <button type="button" class="btn" (click)="sair()">{{ t.sair }}</button>
    </main>
  `,
  styles: `
    .inicio {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  `,
})
export class InicioPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;

  protected async sair(): Promise<void> {
    await this.auth.sair();
    await this.router.navigateByUrl('/login');
  }
}
