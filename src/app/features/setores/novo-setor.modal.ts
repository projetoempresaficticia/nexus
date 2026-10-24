import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { TEXTOS } from '../../core/models/textos';
import { ModalComponent } from '../../shared/ui/modal.component';
import { ToastService } from '../../shared/ui/toast.service';
import { SetoresService } from './setores.service';

/**
 * Novo setor ou subsetor. O Adm pode criar setor principal; o líder só dentro de um setor que
 * administra (pedido do Germano: nunca acima dele). O banco confere de novo.
 */
@Component({
  selector: 'app-novo-setor-modal',
  imports: [ModalComponent],
  template: `
    <app-modal
      [titulo]="pai() ? t.setores.subsetorTitulo : t.setores.novoTitulo"
      [largura]="480"
      (fechar)="fechar.emit(false)"
    >
      <label class="fld">
        {{ t.setores.nome }}
        <input
          type="text"
          autocomplete="off"
          maxlength="80"
          [value]="nome()"
          (input)="nome.set($any($event.target).value)"
          (keydown.enter)="criar()"
        />
      </label>
      <label class="fld">
        {{ t.setores.dentroDe }}
        <select (change)="paiEscolhido.set($any($event.target).value)">
          @if (acesso.ehAdmin()) {
            <option value="" [selected]="!paiEscolhido()">{{ t.setores.principal }}</option>
          }
          @for (o of opcoes(); track o.id) {
            <option [value]="o.id" [selected]="o.id === paiEscolhido()">{{ o.rotulo }}</option>
          }
        </select>
      </label>
      @if (erro(); as e) {
        <p class="erro" role="alert">{{ e }}</p>
      }
      <p class="hint">{{ t.setores.herda }}</p>
      <button rodape type="button" class="btn" (click)="fechar.emit(false)">
        {{ t.comum.cancelar }}
      </button>
      <button rodape type="button" class="btn primary" [disabled]="salvando()" (click)="criar()">
        {{ t.setores.criar }}
      </button>
    </app-modal>
  `,
  styles: `
    .hint {
      margin: 0;
    }
  `,
})
export class NovoSetorModal implements OnInit {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(SetoresService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;

  /** Setor de cima já escolhido ("+ Subsetor"). */
  readonly pai = input<string | null>(null);
  /** true = criou. */
  readonly fechar = output<boolean>();

  protected readonly nome = signal('');
  protected readonly paiEscolhido = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly salvando = signal(false);

  /** Onde posso criar: setores que administro (o Adm administra todos). */
  protected readonly opcoes = computed(() =>
    this.acesso
      .opcoesSetor()
      .filter((o) => this.acesso.administrados().has(o.id))
      .map((o) => ({ id: o.id, rotulo: '   '.repeat(o.nivel) + (o.nivel ? '└ ' : '') + o.nome })),
  );

  ngOnInit(): void {
    this.paiEscolhido.set(
      this.pai() ?? (this.acesso.ehAdmin() ? '' : (this.opcoes()[0]?.id ?? '')),
    );
  }

  protected async criar(): Promise<void> {
    const nome = this.nome().trim();
    const eu = this.acesso.perfil()?.id;
    if (!nome || !eu) {
      this.erro.set(this.t.setores.nomeObrigatorio);
      return;
    }
    this.erro.set(null);
    this.salvando.set(true);
    try {
      await this.service.criar(nome, this.paiEscolhido() || null, eu);
      this.toast.sucesso(this.t.setores.criado(nome));
      await this.acesso.recarregar();
      this.fechar.emit(true);
    } catch (e) {
      this.toast.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }
}
