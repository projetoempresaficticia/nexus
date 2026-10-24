import { Component, inject, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { Papel } from '../../core/models/acesso.model';
import { TEXTOS } from '../../core/models/textos';
import { ErroApi } from '../../core/services/erro-api';
import { ModalComponent } from '../../shared/ui/modal.component';
import { ToastService } from '../../shared/ui/toast.service';
import { UsuariosService } from './usuarios.service';

/** Cadastro de pessoa com o primeiro setor (US-03). O banco valida o e-mail e o Adm. */
@Component({
  selector: 'app-novo-usuario-modal',
  imports: [ModalComponent],
  template: `
    <app-modal [titulo]="t.usuarios.novoTitulo" (fechar)="fechar.emit(false)">
      <label class="fld">
        {{ t.usuarios.nome }}
        <input
          type="text"
          autocomplete="off"
          maxlength="120"
          [value]="nome()"
          (input)="nome.set($any($event.target).value)"
        />
      </label>
      <label class="fld">
        {{ t.usuarios.email }}
        <input
          type="email"
          autocomplete="off"
          [placeholder]="t.usuarios.emailAjuda"
          [value]="email()"
          (input)="email.set($any($event.target).value)"
        />
      </label>
      <div class="fld-row">
        <label class="fld">
          {{ t.usuarios.setor }}
          <select (change)="setor.set($any($event.target).value)">
            <option value="">{{ t.usuarios.semVinculo }}</option>
            @for (o of acesso.opcoesSetor(); track o.id) {
              <option [value]="o.id" [selected]="o.id === setor()">
                {{ rotulo(o.nome, o.nivel) }}
              </option>
            }
          </select>
        </label>
        <label class="fld">
          {{ t.usuarios.papel }}
          <select (change)="papel.set($any($event.target).value)">
            <option value="membro" [selected]="papel() === 'membro'">{{ t.papel.membro }}</option>
            <option value="lider" [selected]="papel() === 'lider'">{{ t.papel.lider }}</option>
          </select>
        </label>
      </div>
      @if (erro(); as e) {
        <p class="erro" role="alert">{{ e }}</p>
      }
      <p class="hint">{{ t.usuarios.depois }}</p>
      <p class="hint">{{ t.usuarios.boasVindas }}</p>
      <button rodape type="button" class="btn" (click)="fechar.emit(false)">
        {{ t.comum.cancelar }}
      </button>
      <button rodape type="button" class="btn primary" [disabled]="salvando()" (click)="salvar()">
        {{ t.usuarios.cadastrar }}
      </button>
    </app-modal>
  `,
  styles: `
    .hint {
      margin: 0;
    }
  `,
})
export class NovoUsuarioModal {
  protected readonly acesso = inject(AcessoStore);
  private readonly service = inject(UsuariosService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;

  /** true = cadastrou (a página recarrega a lista). */
  readonly fechar = output<boolean>();

  protected readonly nome = signal('');
  protected readonly email = signal('');
  protected readonly setor = signal('');
  protected readonly papel = signal<Papel>('membro');
  protected readonly erro = signal<string | null>(null);
  protected readonly salvando = signal(false);

  protected rotulo(nome: string, nivel: number): string {
    return '   '.repeat(nivel) + (nivel ? '└ ' : '') + nome;
  }

  protected async salvar(): Promise<void> {
    if (!this.nome().trim()) {
      this.erro.set(this.t.erros.nome_obrigatorio);
      return;
    }
    this.erro.set(null);
    this.salvando.set(true);
    try {
      await this.service.cadastrar(
        this.email(),
        this.nome(),
        this.setor() ? [{ setor_id: this.setor(), papel: this.papel() }] : [],
      );
      this.toast.sucesso(this.t.usuarios.cadastrado(this.nome().trim()));
      this.fechar.emit(true);
    } catch (e) {
      // Erros de validação ficam no formulário; o resto vira aviso
      if (e instanceof ErroApi && e.codigo !== 'rede') this.erro.set(e.message);
      else this.toast.erro(e);
    } finally {
      this.salvando.set(false);
    }
  }
}
