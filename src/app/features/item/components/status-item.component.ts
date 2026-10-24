import { Component, computed, inject, input, signal } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { Item } from '../../../core/models/item.model';
import { ORDEM_STATUS, STATUS_ITEM, StatusItem } from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { ConfirmacaoService } from '../../../shared/ui/confirmacao.service';
import { EditorRicoComponent } from '../../../shared/ui/editor-rico/editor-rico.component';
import { ModalComponent } from '../../../shared/ui/modal.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { dataLonga } from '../../../shared/utils/datas';
import { htmlVazio, sanitizar } from '../../../shared/utils/html-seguro';

/** Botões de status (FLUXOS.md §1): Bloqueada pede motivo, Aguardando pede aprovador (US-10). */
@Component({
  selector: 'app-status-item',
  imports: [ModalComponent, EditorRicoComponent],
  template: `
    <section class="sec">
      <h3>{{ t.item.status }}</h3>
      <div class="status-set">
        @for (s of ordem; track s) {
          <button
            type="button"
            class="st-btn"
            [class]="'st-btn ' + rotulos[s].classe"
            [class.on]="item().status === s"
            [attr.aria-pressed]="item().status === s"
            [disabled]="!podeEditar()"
            (click)="escolher(s)"
          >
            {{ rotulos[s].texto }}
          </button>
        }
      </div>
    </section>

    @if (pedindo() === 'bloqueada') {
      <app-modal [titulo]="t.item.bloquearTitulo" (fechar)="pedindo.set(null)">
        <div class="fld">
          <span>{{ t.item.motivo }}</span>
          <app-editor-rico [(valor)]="motivo" [rotulo]="t.item.motivoAjuda" [pessoas]="pessoas()" />
        </div>
        @if (erro()) {
          <p class="erro" role="alert">{{ t.erros.motivo_obrigatorio }}</p>
        }
        <button rodape type="button" class="btn" (click)="pedindo.set(null)">
          {{ t.comum.cancelar }}
        </button>
        <button rodape type="button" class="btn primary" (click)="confirmarBloqueio()">
          {{ rotulos.bloqueada.texto }}
        </button>
      </app-modal>
    }

    @if (pedindo() === 'aguardando_aprovacao') {
      <app-modal [titulo]="t.item.aprovacaoTitulo" [largura]="460" (fechar)="pedindo.set(null)">
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
        <button rodape type="button" class="btn" (click)="pedindo.set(null)">
          {{ t.comum.cancelar }}
        </button>
        <button rodape type="button" class="btn primary" (click)="confirmarAprovacao()">
          {{ rotulos.aguardando_aprovacao.texto }}
        </button>
      </app-modal>
    }
  `,
})
export class StatusItemComponent {
  private readonly itens = inject(ItensStore);
  private readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly t = TEXTOS;
  protected readonly ordem = ORDEM_STATUS;
  protected readonly rotulos = STATUS_ITEM;

  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  protected readonly pedindo = signal<StatusItem | null>(null);
  protected readonly motivo = signal('');
  protected readonly aprovador = signal('');
  protected readonly erro = signal(false);
  protected readonly pessoas = computed(() =>
    this.acesso.pessoas().filter((p) => p.id !== this.acesso.perfil()?.id),
  );

  protected async escolher(status: StatusItem): Promise<void> {
    const item = this.item();
    if (status === item.status && status !== 'bloqueada') return;
    this.erro.set(false);
    if (status === 'bloqueada') {
      this.motivo.set(item.motivo_bloqueio_html ?? '');
      this.pedindo.set(status);
      return;
    }
    if (status === 'aguardando_aprovacao') {
      this.aprovador.set('');
      this.pedindo.set(status);
      return;
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
        return;
      }
    }
    await this.aplicar(status);
  }

  protected async confirmarBloqueio(): Promise<void> {
    if (htmlVazio(this.motivo())) {
      this.erro.set(true);
      return;
    }
    this.pedindo.set(null);
    await this.aplicar('bloqueada', sanitizar(this.motivo()));
  }

  protected async confirmarAprovacao(): Promise<void> {
    if (!this.aprovador()) {
      this.erro.set(true);
      return;
    }
    this.pedindo.set(null);
    await this.aplicar('aguardando_aprovacao', null, this.aprovador());
  }

  private async aplicar(
    status: StatusItem,
    motivo?: string | null,
    aprovador?: string | null,
  ): Promise<void> {
    const r = await this.itens.mudarStatus(this.item().id, status, motivo, aprovador);
    if (!r) return;
    const prox = r.novo_item_recorrente?.prazo;
    this.toast.sucesso(prox ? this.t.item.proxima(dataLonga(prox)) : this.t.item.statusAtualizado);
  }
}
