import { Component, computed, inject, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao.service';
import { ToastService } from '../../shared/ui/toast.service';
import { descendentes, ordenarArvore } from '../../shared/utils/arvore';
import { NovoSetorModal } from './novo-setor.modal';
import { SetoresService } from './setores.service';

/** Setores (só o Adm, US-05): árvore, criar, renomear, mover e (des)ativar. */
@Component({
  selector: 'app-setores-page',
  imports: [CabecalhoComponent, NovoSetorModal],
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

  protected readonly linhas = computed(() => {
    const setores = this.acesso.setores();
    return ordenarArvore(setores).map(({ no, nivel }) => {
      const abaixo = descendentes(no.id, setores);
      return {
        setor: no,
        nivel,
        pessoas: this.acesso.pessoas().filter((p) => p.vinculos.some((v) => v.setor_id === no.id))
          .length,
        // Para onde pode ir: qualquer setor fora dele e dos subsetores dele
        destinos: setores.filter((s) => !abaixo.has(s.id)),
      };
    });
  });

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
    const pai = select.value || null;
    const novoPai = pai ? this.acesso.nomeSetor(pai) : this.t.setores.principal;
    const ok = await this.alterar(id, { pai_id: pai }, this.t.setores.movido(nome, novoPai));
    // Recusado (ex.: ciclo_setor): volta o select para o pai atual
    if (!ok) select.value = this.acesso.setores().find((s) => s.id === id)?.pai_id ?? '';
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
