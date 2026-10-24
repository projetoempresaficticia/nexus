import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { Item } from '../../../core/models/item.model';
import { TEXTOS } from '../../../core/models/textos';
import { RealtimeService, afetaItem } from '../../../core/services/realtime.service';
import { HtmlSeguroPipe } from '../../../shared/pipes/html-seguro.pipe';
import { AvatarComponent } from '../../../shared/ui/avatar.component';
import { ConfirmacaoService } from '../../../shared/ui/confirmacao.service';
import { EditorRicoComponent } from '../../../shared/ui/editor-rico/editor-rico.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { dataHora } from '../../../shared/utils/datas';
import { htmlVazio, sanitizar } from '../../../shared/utils/html-seguro';
import { AnexosService } from '../anexos.service';
import { ImagensPrivadasDirective } from '../imagens-privadas.directive';
import { Comentario, ItemService } from '../item.service';

/** Comentários do item: publicar com @menção, editar (autor) e apagar (autor ou líder) — US-18, US-19. */
@Component({
  selector: 'app-comentarios-item',
  imports: [AvatarComponent, EditorRicoComponent, HtmlSeguroPipe, ImagensPrivadasDirective],
  templateUrl: './comentarios-item.component.html',
  styles: `
    .com + .com {
      margin-top: 4px;
    }
    .cab {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    .cab .acoes {
      margin-left: auto;
      display: flex;
      gap: 4px;
    }
    .rodape {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .vazio {
      margin: 0;
      font-size: 14px;
    }
  `,
})
export class ComentariosItemComponent {
  private readonly service = inject(ItemService);
  private readonly anexos = inject(AnexosService);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;
  protected readonly dataHora = dataHora;
  readonly item = input.required<Item>();

  protected readonly comentarios = signal<Comentario[]>([]);
  protected readonly novo = signal('');
  protected readonly editandoId = signal<string | null>(null);
  protected readonly edicao = signal('');
  protected readonly enviando = signal(false);
  protected readonly pessoas = computed(() => this.acesso.pessoas());
  private readonly eu = computed(() => this.acesso.perfil()?.id ?? null);

  /** Imagem colada no comentário: vira anexo do item (bucket privado). */
  protected readonly enviarImagem = async (arquivo: File) => {
    try {
      return await this.anexos.enviarImagem(this.item(), arquivo, this.eu()!);
    } catch (e) {
      this.toast.erro(e);
      throw e;
    }
  };

  constructor() {
    effect(() => {
      const id = this.item().id;
      this.editandoId.set(null);
      this.carregar(id);
    });
    // Comentário de um colega aparece sozinho (US-37)
    inject(RealtimeService).ouvirAqui(['comentarios'], (e) => {
      const id = this.item().id;
      if (
        afetaItem(
          e,
          id,
          this.comentarios().map((c) => c.id),
        )
      )
        this.carregar(id);
    });
  }

  private carregar(id: string): void {
    this.service.listarComentarios(id).then(
      (lista) => this.comentarios.set(lista),
      (e) => this.toast.erro(e),
    );
  }

  protected autor(c: Comentario) {
    const p = this.acesso.pessoaPorId().get(c.autor_id);
    return p ?? { nome: this.t.comentarios.pessoaRemovida, iniciais: '—' };
  }

  protected ehAutor(c: Comentario): boolean {
    return c.autor_id === this.eu();
  }

  protected async publicar(): Promise<void> {
    if (htmlVazio(this.novo())) {
      this.toast.falha(this.t.comentarios.vazioNaoEnvia);
      return;
    }
    this.enviando.set(true);
    try {
      const c = await this.service.salvarComentario(null, this.item().id, sanitizar(this.novo()));
      this.comentarios.update((l) => [...l, c]);
      this.novo.set('');
      this.toast.sucesso(this.t.comentarios.publicado);
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.enviando.set(false);
    }
  }

  protected editar(c: Comentario): void {
    this.edicao.set(c.texto_html);
    this.editandoId.set(c.id);
  }

  protected async salvarEdicao(c: Comentario): Promise<void> {
    if (htmlVazio(this.edicao())) return;
    try {
      const novo = await this.service.salvarComentario(
        c.id,
        this.item().id,
        sanitizar(this.edicao()),
      );
      this.comentarios.update((l) => l.map((x) => (x.id === c.id ? novo : x)));
      this.editandoId.set(null);
      this.toast.sucesso(this.t.comentarios.atualizado);
    } catch (e) {
      this.toast.erro(e);
    }
  }

  protected async apagar(c: Comentario): Promise<void> {
    const ok = await this.confirmacao.perguntar({
      titulo: this.t.comentarios.apagarTitulo,
      mensagem: this.t.comentarios.apagarConfirmacao,
      confirmar: this.t.comentarios.apagar,
      perigo: true,
    });
    if (!ok) return;
    const antes = this.comentarios();
    this.comentarios.update((l) => l.filter((x) => x.id !== c.id));
    try {
      await this.service.apagarComentario(c.id);
      this.toast.sucesso(this.t.comentarios.apagado);
    } catch (e) {
      this.comentarios.set(antes);
      this.toast.erro(e);
    }
  }
}
