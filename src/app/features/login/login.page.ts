import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService, ErroLogin } from '../../core/auth/auth.service';
import { TEXTOS } from '../../core/models/textos';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly t = TEXTOS;
  protected readonly loginComSenha = environment.loginComSenha;
  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly ocupado = signal(false);
  protected readonly mensagem = signal<string | null>(null);

  protected entrarComGoogle(): Promise<void> {
    this.ocupado.set(true);
    return this.auth.entrarComGoogle();
  }

  protected async entrarComSenha(evento: Event): Promise<void> {
    evento.preventDefault();
    await this.executar(() => this.auth.entrarComSenha(this.email().trim(), this.senha()));
  }

  protected async criarSenha(): Promise<void> {
    await this.executar(() => this.auth.criarSenha(this.email().trim(), this.senha()));
  }

  private async executar(acao: () => Promise<ErroLogin | null>): Promise<void> {
    this.ocupado.set(true);
    this.mensagem.set(null);
    const erro = await acao();
    this.ocupado.set(false);
    if (erro === 'acesso_nao_autorizado') {
      await this.router.navigateByUrl('/sem-acesso');
    } else if (erro) {
      this.mensagem.set(erro === 'senha_invalida' ? this.t.login.senhaInvalida : this.t.erros.rede);
    } else if (this.auth.logado()) {
      await this.router.navigateByUrl('/');
    } else {
      this.mensagem.set(this.t.login.contaCriada);
    }
  }
}
