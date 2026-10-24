import { Component, computed, inject, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import { STATUS_ITEM, StatusItem } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { dataLonga } from '../utils/datas';
import { htmlVazio, sanitizar } from '../utils/html-seguro';
import { ConfirmacaoService } from './confirmacao.service';
import { EditorRicoComponent } from './editor-rico/editor-rico.component';
import { ModalComponent } from './modal.component';
import { ToastService } from './toast.service';

/**
 * Mudança de status com o que cada um pede (FLUXOS.md §1): Bloqueada → motivo, Aguardando aprovação →
 * aprovador, Concluída com filhos abertos → confirmação. Usado pelos botões do item e pelo Kanban.
 */
@Component({
  selector: 'app-mudar-status',
  imports: [ModalComponent, EditorRicoComponent],
  template: `
    @if (pedindo() === 'bloqueada') {
      <app-modal [titulo]="t.item.bloquearTitulo" (fechar)="responder(false)">
        <div class="fld">
          <span>{{ t.item.motivo }}</span>
          <app-editor-rico [(valor)]="motivo" [rotulo]="t.item.motivoAjuda" [pessoas]="pessoas()" />
        </div>
        @if (erro()) {
          <p class="erro" role="alert">{{ t.erros.motivo_obrigatorio }}</p>
        }
        <button rodape type="button" class="btn" (click)="responder(false)">
          {{ t.comum.cancelar }}
        </button>
        <button rodape type="button" class="btn primary" (click)="confirmarBloqueio()">
          {{ rotulos.bloqueada.texto }}
        </button>
      </app-modal>
    }
    @if (pedindo() === 'aguardando_aprovacao') {
      <app-modal [titulo]="t.item.aprovacaoTitulo" [largura]="460" (fechar)="responder(false)">
        <label class="fld">
          {{ t.item.aprovador }}
          <select (change)="aprovador.set($any($event.target).value)">
            <option value="">{{ t.item.escolhaAprovador }}</option>
            @for (p of pessoas(); track p.id) {
              <option [value]="p.id">{{ p.nome }}</option>
            }
          </select>
        </label>
        @if (erro()) {
          <p class="erro" role="alert">{{ t.erros.aprovador_obrigatorio }}</p>
        }
        <button rodape type="button" class="btn" (click)="responder(false)">
          {{ t.comum.cancelar }}
        </button>
        <button rodape type="button" class="btn primary" (click)="confirmarAprovacao()">
          {{ rotulos.aguardando_aprovacao.texto }}
        </button>
      </app-modal>
    }
  `,
})
export class MudarStatusComponent {
  private readonly itens = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;
  protected readonly rotulos = STATUS_ITEM;

  protected readonly pedindo = signal<'bloqueada' | 'aguardando_aprovacao' | null>(null);
  protected readonly motivo = signal('');
  protected readonly aprovador = signal('');
  protected readonly erro = signal(false);
  private alvo: Item | null = null;
  private resolver?: (ok: boolean) => void;

  protected readonly pessoas = computed(() =>
    this.acesso.pessoas().filter((p) => p.id !== this.acesso.perfil()?.id),
  );

  /** Pede o que faltar e muda o status. `false` = cancelou, não mudou ou o servidor recusou. */
  async mudar(item: Item, status: StatusItem): Promise<boolean> {
    if (status === item.status && status !== 'bloqueada') return false;
    this.responder(false);
    this.alvo = item;
    this.erro.set(false);
    if (status === 'bloqueada' || status === 'aguardando_aprovacao') {
      this.motivo.set(item.motivo_bloqueio_html ?? '');
      this.aprovador.set('');
      this.pedindo.set(status);
      return new Promise((r) => (this.resolver = r));
    }
    if (status === 'concluida') {
      const abertos = this.itens.filhos(item.id).filter((f) => f.status !== 'concluida').length;
      if (
        abertos &&
        !(await this.confirmacao.perguntar({
          titulo: this.t.item.concluir,
          mensagem: this.t.item.concluirComAbertas(item.nome, abertos),
          confirmar: this.t.item.concluir,
        }))
      ) {
        return false;
      }
    }
    return this.aplicar(item, status);
  }

  protected responder(ok: boolean): void {
    this.pedindo.set(null);
    this.resolver?.(ok);
    this.resolver = undefined;
  }

  protected async confirmarBloqueio(): Promise<void> {
    if (htmlVazio(this.motivo())) {
      this.erro.set(true);
      return;
    }
    const resolver = this.soltar();
    resolver?.(await this.aplicar(this.alvo!, 'bloqueada', sanitizar(this.motivo())));
  }

  protected async confirmarAprovacao(): Promise<void> {
    if (!this.aprovador()) {
      this.erro.set(true);
      return;
    }
    const resolver = this.soltar();
    resolver?.(await this.aplicar(this.alvo!, 'aguardando_aprovacao', null, this.aprovador()));
  }

  /** Fecha o modal e devolve quem espera a resposta (para responder depois do servidor). */
  private soltar(): ((ok: boolean) => void) | undefined {
    const resolver = this.resolver;
    this.resolver = undefined;
    this.pedindo.set(null);
    return resolver;
  }

  private async aplicar(
    item: Item,
    status: StatusItem,
    motivo?: string | null,
    aprovador?: string | null,
  ): Promise<boolean> {
    const r = await this.itens.mudarStatus(item.id, status, motivo, aprovador);
    if (!r) return false;
    const prox = r.novo_item_recorrente?.prazo;
    this.toast.sucesso(prox ? this.t.item.proxima(dataLonga(prox)) : this.t.item.statusAtualizado);
    return true;
  }
}
