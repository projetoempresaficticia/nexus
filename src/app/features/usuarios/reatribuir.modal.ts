import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { NIVEL } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { ToastService } from '../../shared/ui/toast.service';
import { dataCurta } from '../../shared/utils/datas';
import { ItemAberto, Usuario, UsuariosService } from './usuarios.service';

/** Depois de desativar: passar os itens abertos para outra pessoa (US-04). */
@Component({
  selector: 'app-reatribuir-modal',
  imports: [ModalComponent, PillStatusComponent],
  template: `
    <app-modal
      [titulo]="t.usuarios.reatribuirTitulo(de().nome)"
      [largura]="560"
      (fechar)="fechar.emit()"
    >
      <p class="hint">{{ t.usuarios.reatribuirAjuda(itens().length) }}</p>
      <ul class="lista">
        @for (i of itens(); track i.id) {
          <li>
            <span class="lvl">{{ nivel[i.nivel] }}</span>
            <span class="nome">{{ i.nome }}</span>
            <span class="row-sub">{{ acesso.nomeSetor(i.setor_id) }}</span>
            @if (i.prazo) {
              <span class="row-sub">{{ dataCurta(i.prazo) }}</span>
            }
            <app-pill-status [status]="i.status" />
          </li>
        }
      </ul>
      <label class="fld">
        {{ t.usuarios.passarPara }}
        <select (change)="para.set($any($event.target).value)">
          <option value="">{{ t.usuarios.escolhaPessoa }}</option>
          @for (p of candidatos(); track p.id) {
            <option [value]="p.id">{{ p.nome }}</option>
          }
        </select>
      </label>
      <button rodape type="button" class="btn" (click)="fechar.emit()">
        {{ t.usuarios.depoisReatribuo }}
      </button>
      <button
        rodape
        type="button"
        class="btn primary"
        [disabled]="!para() || salvando()"
        (click)="reatribuir()"
      >
        {{ t.usuarios.reatribuir }}
      </button>
    </app-modal>
  `,
  styles: `
    .hint {
      margin: 0;
    }
    .lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 260px;
      overflow-y: auto;
    }
    .lista li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .nome {
      font-weight: 600;
      margin-right: auto;
    }
  `,
})
export class ReatribuirModal {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(UsuariosService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;
  protected readonly dataCurta = dataCurta;

  readonly de = input.required<Usuario>();
  readonly itens = input.required<ItemAberto[]>();
  readonly fechar = output();

  protected readonly para = signal('');
  protected readonly salvando = signal(false);
  /** Pessoas ativas; o banco recusa quem não pode ser responsável no setor do item. */
  protected readonly candidatos = computed(() =>
    this.acesso.pessoas().filter((p) => p.id !== this.de().id),
  );

  protected async reatribuir(): Promise<void> {
    this.salvando.set(true);
    try {
      const n = await this.service.reatribuir(this.de().id, this.para());
      const nome = this.candidatos().find((p) => p.id === this.para())?.nome ?? '';
      this.toast.sucesso(this.t.usuarios.reatribuidos(n, nome));
      this.fechar.emit();
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }
}
