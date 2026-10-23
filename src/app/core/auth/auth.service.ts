import { Injectable, computed, inject, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { SUPABASE } from '../supabase.client';

/** Resultado de um login por senha: null = sucesso; senão o código para mostrar. */
export type ErroLogin = 'senha_invalida' | 'acesso_nao_autorizado' | 'rede';

/**
 * Sessão do Supabase Auth em signals. `iniciar()` roda antes do roteamento (app.config.ts),
 * então os guards já sabem se há sessão. O Google devolve para appUrl com ?code (PKCE) ou ?error.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE);
  private readonly _sessao = signal<Session | null>(null);
  private readonly _erroRetorno = signal<string | null>(null);

  readonly sessao = this._sessao.asReadonly();
  readonly logado = computed(() => this._sessao() !== null);
  readonly email = computed(() => this._sessao()?.user.email ?? null);
  /** Erro devolvido pelo login Google (ex.: hook recusou a conta). */
  readonly erroRetorno = this._erroRetorno.asReadonly();

  async iniciar(url: URL = new URL(window.location.href)): Promise<void> {
    const erro =
      url.searchParams.get('error_description') ??
      new URLSearchParams(url.hash.slice(1)).get('error_description');
    if (erro) this._erroRetorno.set(erro);

    this.supabase.auth.onAuthStateChange((_evento, sessao) => this._sessao.set(sessao));
    const { data } = await this.supabase.auth.getSession();
    this._sessao.set(data.session);
  }

  async entrarComGoogle(): Promise<void> {
    await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${environment.appUrl}/`,
        queryParams: { hd: 'estudeemportugal.org', prompt: 'select_account' },
      },
    });
  }

  async entrarComSenha(email: string, senha: string): Promise<ErroLogin | null> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password: senha });
    if (!error) return null;
    return error.status === 400 ? 'senha_invalida' : 'rede';
  }

  /** Só em desenvolvimento: cria a senha de um perfil já cadastrado (o hook recusa os outros). */
  async criarSenha(email: string, senha: string): Promise<ErroLogin | null> {
    const { error } = await this.supabase.auth.signUp({ email, password: senha });
    if (!error) return null;
    return error.message.includes('acesso_nao_autorizado') ? 'acesso_nao_autorizado' : 'rede';
  }

  limparErroRetorno(): void {
    this._erroRetorno.set(null);
  }

  async sair(): Promise<void> {
    await this.supabase.auth.signOut();
    this._sessao.set(null);
  }
}
