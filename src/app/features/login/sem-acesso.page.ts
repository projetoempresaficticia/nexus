import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TEXTOS } from '../../core/models/textos';

/** US-02: conta recusada pelo hook (sem sessão) ou perfil desativado/sem cadastro (com sessão). */
@Component({
  selector: 'app-sem-acesso-page',
  template: `
    <main class="sem-acesso fade">
      <div class="card">
        <span class="marca" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 11l3 3 8-8" />
            <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </span>
        <h1>{{ t.semAcesso.titulo }}</h1>
        <p>{{ mensagem() }}</p>
        <button type="button" class="btn primary" (click)="voltar()">
          {{ auth.logado() ? t.sair : t.semAcesso.voltar }}
        </button>
      </div>
    </main>
  `,
  styles: `
    .sem-acesso {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 16px;
    }
    .card {
      max-width: 520px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }
    .marca {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: var(--accent);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    p {
      margin: 0;
    }
  `,
})
export class SemAcessoPage {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;

  protected mensagem(): string {
    const email = this.auth.email();
    return email ? this.t.semAcesso.comEmail(email) : this.t.semAcesso.semEmail;
  }

  protected async voltar(): Promise<void> {
    if (this.auth.logado()) await this.auth.sair();
    this.auth.limparErroRetorno();
    await this.router.navigateByUrl('/login');
  }
}
