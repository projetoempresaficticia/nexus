import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPreview,
  CdkDropList,
  CdkDropListGroup,
} from '@angular/cdk/drag-drop';
import { Component, computed, inject, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ToastService } from '../../shared/ui/toast.service';
import { descendentes, ordenarArvore } from '../../shared/utils/arvore';
import { NovoSetorModal } from './novo-setor.modal';
import { SetoresService } from './setores.service';

/**
 * Setores (US-05): árvore, criar, renomear, mover (lista ou arrastar), (des)ativar e excluir vazio.
 * O Adm mexe em tudo; o líder só nos subsetores ABAIXO dos que lidera e só os move para dentro do que
 * administra (T-51b — o banco confere de novo em salvar_setor/excluir_setor).
 */
@Component({
  selector: 'app-setores-page',
  imports: [
    CabecalhoComponent,
    NovoSetorModal,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
  ],
  templateUrl: './setores.page.html',
  styleUrl: './setores.page.css',
})
export class SetoresPage {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(SetoresService);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;

  /** null = fechado; '' = setor principal; id = subsetor de. */
  protected readonly criando = signal<string | null>(null);
  protected readonly renomeando = signal<string | null>(null);
  protected readonly rascunho = signal('');
  /** Setor sob o arraste (contorno tracejado). '' = faixa "setor principal". */
  protected readonly sobre = signal<string | null>(null);

  /** O Adm vê todos; o líder, os que administra (o seu e os de baixo). */
  private readonly visiveis = computed(() => {
    const adm = this.acesso.administrados();
    return this.acesso.setores().filter((s) => this.acesso.ehAdmin() || adm.has(s.id));
  });

  protected readonly linhas = computed(() => {
    const setores = this.acesso.setores();
    return ordenarArvore(this.visiveis()).map(({ no, nivel }) => {
      const abaixo = descendentes(no.id, setores);
      return {
        setor: no,
        nivel,
        pessoas: this.acesso.pessoas().filter((p) => p.vinculos.some((v) => v.setor_id === no.id))
          .length,
        editavel: this.podeEditar(no.id),
        // Para onde pode ir: fora dele e dos de baixo; para o líder, só dentro do que administra
        destinos: this.visiveis().filter((s) => !abaixo.has(s.id)),
      };
    });
  });

  /** Espelho de privado.pode_editar_setor, só para esconder botões. */
  protected podeEditar(id: string): boolean {
    if (this.acesso.ehAdmin()) return true;
    const pai = this.acesso.setores().find((s) => s.id === id)?.pai_id;
    return !!pai && this.acesso.administrados().has(pai);
  }

  protected comecarRenomear(id: string, nome: string): void {
    this.rascunho.set(nome);
    this.renomeando.set(id);
  }

  protected async salvarNome(id: string, atual: string): Promise<void> {
    if (this.renomeando() !== id) return;
    this.renomeando.set(null);
    const nome = this.rascunho().trim();
    if (!nome || nome === atual) return;
    await this.alterar(id, { nome }, this.t.setores.renomeado);
  }

  protected async mover(id: string, nome: string, select: HTMLSelectElement): Promise<void> {
    const ok = await this.moverPara(id, nome, select.value || null);
    // Recusado (ex.: ciclo_setor): volta o select para o pai atual
    if (!ok) select.value = this.acesso.setores().find((s) => s.id === id)?.pai_id ?? '';
  }

  /** Só aceita soltar onde o setor pode ir: não nele mesmo nem nos de baixo (o banco confere de novo). */
  protected readonly podeSoltar = (
    arrasto: CdkDrag<string>,
    alvo: CdkDropList<string>,
  ): boolean => {
    const id = arrasto.data;
    const destino = alvo.data;
    if (!destino) {
      return this.acesso.ehAdmin() && !!this.acesso.setores().find((s) => s.id === id)?.pai_id;
    }
    const permitido = this.acesso.ehAdmin() || this.acesso.administrados().has(destino);
    return permitido && !descendentes(id, this.acesso.setores()).has(destino);
  };

  protected async soltou(e: CdkDragDrop<string, string, string>): Promise<void> {
    this.sobre.set(null);
    const id = e.item.data;
    const pai = e.container.data || null;
    const setor = this.acesso.setores().find((s) => s.id === id);
    if (!setor || e.previousContainer === e.container || setor.pai_id === pai) return;
    await this.moverPara(id, setor.nome, pai);
  }

  protected async excluir(id: string, nome: string): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: this.t.setores.excluirTitulo(nome),
      mensagem: this.t.setores.excluirTexto,
      confirmar: this.t.setores.excluir,
      perigo: true,
    });
    if (!sim) return;
    try {
      await this.service.excluir(id);
      await this.acesso.recarregar();
      this.toast.sucesso(this.t.setores.excluido(nome));
    } catch (e) {
      this.toast.erro(e);
    }
  }

  private moverPara(id: string, nome: string, pai: string | null): Promise<boolean> {
    const novoPai = pai ? this.acesso.nomeSetor(pai) : this.t.setores.principal;
    return this.alterar(id, { pai_id: pai }, this.t.setores.movido(nome, novoPai));
  }

  protected async alternarAtivo(id: string, nome: string, ativo: boolean): Promise<void> {
    if (ativo) {
      const sim = await this.confirmacao.perguntar({
        titulo: this.t.setores.desativarTitulo(nome),
        mensagem: this.t.setores.desativarTexto,
        confirmar: this.t.setores.desativar,
        perigo: true,
      });
      if (!sim) return;
    }
    await this.alterar(
      id,
      { ativo: !ativo },
      ativo ? this.t.setores.desativado(nome) : this.t.setores.reativado(nome),
    );
  }

  protected fechouNovo(): void {
    this.criando.set(null);
  }

  private async alterar(
    id: string,
    campos: { nome?: string; pai_id?: string | null; ativo?: boolean },
    sucesso: string,
  ): Promise<boolean> {
    try {
      await this.service.alterar(id, campos);
      await this.acesso.recarregar();
      this.toast.sucesso(sucesso);
      return true;
    } catch (e) {
      this.toast.erro(e);
      return false;
    }
  }
}
