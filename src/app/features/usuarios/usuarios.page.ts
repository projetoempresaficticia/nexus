import { Component, computed, inject, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ToastService } from '../../shared/ui/toast.service';
import { NovoUsuarioModal } from './novo-usuario.modal';
import { ReatribuirModal } from './reatribuir.modal';
import { ItemAberto, Usuario, UsuariosService } from './usuarios.service';
import { VinculosModal } from './vinculos.modal';

/** Usuários (só o Adm): cadastrar, setores e papéis, desativar e reativar (US-03, US-04). */
@Component({
  selector: 'app-usuarios-page',
  imports: [
    CabecalhoComponent,
    AvatarComponent,
    CarregandoComponent,
    NovoUsuarioModal,
    VinculosModal,
    ReatribuirModal,
  ],
  templateUrl: './usuarios.page.html',
  styleUrl: './usuarios.page.css',
})
export class UsuariosPage {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(UsuariosService);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly carregado = signal(false);
  protected readonly busca = signal('');
  protected readonly mostrarInativos = signal(false);
  protected readonly novo = signal(false);
  protected readonly editando = signal<Usuario | null>(null);
  protected readonly reatribuindo = signal<{ de: Usuario; itens: ItemAberto[] } | null>(null);

  protected readonly subtitulo = computed(() => {
    const ativos = this.usuarios().filter((u) => u.ativo).length;
    return this.t.usuarios.subtitulo(ativos, this.usuarios().length - ativos);
  });

  protected readonly lista = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt');
    return this.usuarios().filter(
      (u) =>
        (u.ativo || this.mostrarInativos()) &&
        (!termo ||
          u.nome.toLocaleLowerCase('pt').includes(termo) ||
          u.email.toLocaleLowerCase('pt').includes(termo)),
    );
  });

  constructor() {
    void this.carregar();
  }

  protected async carregar(): Promise<void> {
    try {
      this.usuarios.set(await this.service.listar());
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.carregado.set(true);
    }
  }

  protected souEu(u: Usuario): boolean {
    return u.id === this.acesso.perfil()?.id;
  }

  /** Depois de mudar pessoas ou vínculos, a lista e o resto do app (menus, filtros) se atualizam. */
  protected async fechouModal(mudou: boolean): Promise<void> {
    this.novo.set(false);
    this.editando.set(null);
    if (!mudou) return;
    await this.carregar();
    void this.acesso.recarregar();
  }

  protected async desativar(u: Usuario): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: this.t.usuarios.desativarTitulo(u.nome),
      mensagem: this.t.usuarios.desativarTexto,
      confirmar: this.t.usuarios.desativar,
      perigo: true,
    });
    if (!sim) return;
    try {
      const itens = await this.service.desativar(u.id);
      this.toast.sucesso(this.t.usuarios.desativado(u.nome));
      await this.carregar();
      void this.acesso.recarregar();
      if (itens.length) this.reatribuindo.set({ de: u, itens });
    } catch (e) {
      this.toast.erro(e);
    }
  }

  protected async reativar(u: Usuario): Promise<void> {
    try {
      await this.service.reativar(u.id);
      this.toast.sucesso(this.t.usuarios.reativado(u.nome));
      await this.carregar();
      void this.acesso.recarregar();
    } catch (e) {
      this.toast.erro(e);
    }
  }

  /** Marca/desmarca uma pessoa como conta de teste, na hora; volta atrás se o servidor recusar (T-65). */
  protected async alternarContaTeste(u: Usuario): Promise<void> {
    const valor = !u.conta_teste;
    this.usuarios.update((l) => l.map((x) => (x.id === u.id ? { ...x, conta_teste: valor } : x)));
    try {
      await this.service.atualizarContaTeste(u.id, valor);
    } catch (e) {
      this.usuarios.update((l) =>
        l.map((x) => (x.id === u.id ? { ...x, conta_teste: !valor } : x)),
      );
      this.toast.erro(e);
    }
  }

  /** Emergência: liga/desliga as 6 categorias de e-mail de todo mundo ativo de uma vez (T-65). */
  protected async mudarPreferenciaTodos(valor: boolean): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: valor
        ? this.t.usuarios.ligarEmailTodosTitulo
        : this.t.usuarios.desligarEmailTodosTitulo,
      mensagem: this.t.usuarios.emailTodosTexto,
      confirmar: this.t.comum.confirmar,
    });
    if (!sim) return;
    try {
      await this.service.atualizarPreferenciaEmailTodos(valor);
      this.toast.sucesso(this.t.usuarios.emailTodosFeito);
    } catch (e) {
      this.toast.erro(e);
    }
  }
}
