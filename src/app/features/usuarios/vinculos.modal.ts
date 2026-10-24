import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { Papel, VinculoResumo } from '../../core/models/acesso.model';
import { TEXTOS } from '../../core/models/textos';
import { ModalComponent } from '../../shared/ui/modal.component';
import { ToastService } from '../../shared/ui/toast.service';
import { Usuario, UsuariosService } from './usuarios.service';

/** Setores e papéis de uma pessoa; salva tudo de uma vez (salvar_vinculos). */
@Component({
  selector: 'app-vinculos-modal',
  imports: [ModalComponent],
  template: `
    <app-modal
      [titulo]="t.usuarios.vinculosTitulo(usuario().nome)"
      [largura]="520"
      (fechar)="fechar.emit(false)"
    >
      @for (v of vinculos(); track v.setor_id) {
        <div class="vinculo">
          <span class="setor">{{ acesso.caminhoSetor(v.setor_id) }}</span>
          <select
            class="inline-sel"
            [attr.aria-label]="t.usuarios.papel"
            (change)="mudarPapel(v.setor_id, $any($event.target).value)"
          >
            <option value="membro" [selected]="v.papel === 'membro'">{{ t.papel.membro }}</option>
            <option value="lider" [selected]="v.papel === 'lider'">{{ t.papel.lider }}</option>
          </select>
          <button
            type="button"
            class="btn sm ghost"
            [attr.aria-label]="t.usuarios.remover(acesso.nomeSetor(v.setor_id))"
            (click)="remover(v.setor_id)"
          >
            ×
          </button>
        </div>
      } @empty {
        <p class="hint">{{ t.usuarios.semVinculo }}</p>
      }
      @if (livres().length) {
        <label class="fld">
          {{ t.usuarios.adicionarSetor }}
          <select (change)="adicionar($any($event.target))">
            <option value="">{{ t.usuarios.escolhaSetor }}</option>
            @for (o of livres(); track o.id) {
              <option [value]="o.id">
                {{ '   '.repeat(o.nivel) + (o.nivel ? '└ ' : '') + o.nome }}
              </option>
            }
          </select>
        </label>
      }
      <p class="hint">{{ t.usuarios.vinculosAjuda }}</p>
      <button rodape type="button" class="btn" (click)="fechar.emit(false)">
        {{ t.comum.cancelar }}
      </button>
      <button rodape type="button" class="btn primary" [disabled]="salvando()" (click)="salvar()">
        {{ t.comum.salvar }}
      </button>
    </app-modal>
  `,
  styles: `
    .vinculo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .setor {
      flex: 1;
      min-width: 0;
      font-size: 14px;
    }
    .hint {
      margin: 0;
    }
  `,
})
export class VinculosModal implements OnInit {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(UsuariosService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;

  readonly usuario = input.required<Usuario>();
  readonly fechar = output<boolean>();

  protected readonly vinculos = signal<VinculoResumo[]>([]);
  protected readonly salvando = signal(false);
  protected readonly livres = computed(() =>
    this.acesso.opcoesSetor().filter((o) => !this.vinculos().some((v) => v.setor_id === o.id)),
  );

  ngOnInit(): void {
    this.vinculos.set([...this.usuario().vinculos]);
  }

  protected adicionar(select: HTMLSelectElement): void {
    const id = select.value;
    select.value = '';
    if (id) this.vinculos.update((l) => [...l, { setor_id: id, papel: 'membro' }]);
  }

  protected mudarPapel(setorId: string, papel: Papel): void {
    this.vinculos.update((l) => l.map((v) => (v.setor_id === setorId ? { ...v, papel } : v)));
  }

  protected remover(setorId: string): void {
    this.vinculos.update((l) => l.filter((v) => v.setor_id !== setorId));
  }

  protected async salvar(): Promise<void> {
    this.salvando.set(true);
    try {
      await this.service.salvarVinculos(this.usuario().id, this.vinculos());
      this.toast.sucesso(this.t.usuarios.vinculosSalvos);
      this.fechar.emit(true);
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }
}
