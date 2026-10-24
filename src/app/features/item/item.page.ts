import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { podeEditarItem, podeExcluirItem } from '../../core/itens/permissoes';
import { RECORRENCIA } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { ErroApi } from '../../core/services/erro-api';
import { HtmlSeguroPipe } from '../../shared/pipes/html-seguro.pipe';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { EditorRicoComponent } from '../../shared/ui/editor-rico/editor-rico.component';
import { NivelComponent } from '../../shared/ui/nivel.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { TituloEditavelComponent } from '../../shared/ui/titulo-editavel.component';
import { ToastService } from '../../shared/ui/toast.service';
import { VazioComponent } from '../../shared/ui/vazio.component';
import { htmlVazio, sanitizar } from '../../shared/utils/html-seguro';
import { ChecklistItemComponent } from './components/checklist-item.component';
import { DependenciasItemComponent } from './components/dependencias-item.component';
import { DetalhesItemComponent } from './components/detalhes-item.component';
import { FilhosItemComponent } from './components/filhos-item.component';
import { StatusItemComponent } from './components/status-item.component';

/** Página do item: duas colunas (conteúdo | painel lateral), como no protótipo (US-09, US-10). */
@Component({
  selector: 'app-item-page',
  imports: [
    RouterLink,
    HtmlSeguroPipe,
    CarregandoComponent,
    VazioComponent,
    EditorRicoComponent,
    NivelComponent,
    PillStatusComponent,
    TituloEditavelComponent,
    StatusItemComponent,
    DetalhesItemComponent,
    FilhosItemComponent,
    ChecklistItemComponent,
    DependenciasItemComponent,
  ],
  templateUrl: './item.page.html',
  styleUrl: './item.page.css',
})
export class ItemPage {
  protected readonly itens = inject(ItensStore);
  protected readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly recorrencia = RECORRENCIA;

  /** Parâmetro da rota item/:id. */
  readonly id = input.required<string>();

  protected readonly existe = signal<boolean | null>(null);
  protected readonly item = computed(() => this.itens.porId(this.id()));
  protected readonly caminho = computed(() =>
    this.item() ? this.itens.caminho(this.item()!) : [],
  );
  protected readonly podeEditar = computed(() => {
    const i = this.item();
    return !!i && podeEditarItem(i, this.acesso.perfil()?.id ?? null, this.acesso.administrados());
  });
  protected readonly podeExcluir = computed(() => {
    const i = this.item();
    const eu = this.acesso.perfil()?.id ?? null;
    return (
      !!i && podeExcluirItem(i, this.itens.filhos(i.id).length, eu, this.acesso.administrados())
    );
  });
  protected readonly pessoas = computed(() => this.acesso.pessoas());

  protected readonly editandoDescricao = signal(false);
  protected readonly descricao = signal('');
  protected readonly editandoMotivo = signal(false);
  protected readonly motivo = signal('');
  protected readonly vazio = htmlVazio;

  constructor() {
    effect(() => {
      const id = this.id();
      this.existe.set(null);
      this.editandoDescricao.set(false);
      this.editandoMotivo.set(false);
      void this.itens.garantir(id).then((ok) => this.existe.set(ok));
    });
  }

  protected async salvarTitulo(nome: string): Promise<void> {
    if (await this.itens.atualizar(this.id(), { nome }))
      this.toast.sucesso(this.t.item.tituloAtualizado);
  }

  protected abrirDescricao(): void {
    this.descricao.set(this.item()?.descricao_html ?? '');
    this.editandoDescricao.set(true);
  }

  protected async salvarDescricao(): Promise<void> {
    this.editandoDescricao.set(false);
    if (await this.itens.atualizar(this.id(), { descricao_html: sanitizar(this.descricao()) })) {
      this.toast.sucesso(this.t.item.alteracoesSalvas);
    }
  }

  protected abrirMotivo(): void {
    this.motivo.set(this.item()?.motivo_bloqueio_html ?? '');
    this.editandoMotivo.set(true);
  }

  protected async salvarMotivo(): Promise<void> {
    if (htmlVazio(this.motivo())) {
      this.toast.erro(new ErroApi('motivo_obrigatorio'));
      return;
    }
    this.editandoMotivo.set(false);
    if (await this.itens.mudarStatus(this.id(), 'bloqueada', sanitizar(this.motivo()))) {
      this.toast.sucesso(this.t.item.alteracoesSalvas);
    }
  }

  /** US-13: conta o que vai junto, pede confirmação, exclui e volta para o pai (ou Tarefas). */
  protected async excluir(): Promise<void> {
    const item = this.item();
    if (!item) return;
    const abaixo = await this.itens.contarDescendentes(item.id);
    if (abaixo === null) return;
    const ok = await this.confirmacao.perguntar({
      titulo: this.t.item.excluirTitulo,
      mensagem: this.t.item.excluirConfirmacao(item.nome, abaixo),
      confirmar: this.t.item.excluir,
      perigo: true,
    });
    if (!ok) return;
    const r = await this.itens.excluir(item.id);
    if (!r) return;
    this.toast.sucesso(this.t.item.excluidos(r.apagados));
    await this.router.navigateByUrl(item.pai_id ? `/item/${item.pai_id}` : '/tarefas');
  }
}
