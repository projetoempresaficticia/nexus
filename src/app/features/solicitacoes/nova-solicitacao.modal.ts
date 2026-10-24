import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { Item } from '../../core/models/item.model';
import { NIVEL, TIPO_SOLICITACAO, TipoSolicitacao } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { SolicitacoesStore } from '../../core/solicitacoes/solicitacoes.store';
import { EditorRicoComponent } from '../../shared/ui/editor-rico/editor-rico.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { ToastService } from '../../shared/ui/toast.service';
import { ancestrais } from '../../shared/utils/arvore';
import { htmlVazio, sanitizar } from '../../shared/utils/html-seguro';

/** Nova solicitação de Informação, Ação ou Aprovação a um colega, a partir do item (US-15). */
@Component({
  selector: 'app-nova-solicitacao-modal',
  imports: [ModalComponent, EditorRicoComponent],
  template: `
    <app-modal [titulo]="t.solicitacoes.novaTitulo" (fechar)="fechar.emit()">
      <div class="hint dentro">
        {{ nivel[item().nivel] }}: <strong>{{ item().nome }}</strong>
      </div>
      <div class="fld-row">
        <label class="fld">
          {{ t.solicitacoes.paraQuem }}
          <select (change)="para.set($any($event.target).value)">
            <option value="">{{ t.solicitacoes.escolhaPessoa }}</option>
            @for (p of pessoas(); track p.id) {
              <option [value]="p.id" [selected]="p.id === para()">{{ p.rotulo }}</option>
            }
          </select>
        </label>
        <label class="fld">
          {{ t.solicitacoes.tipo }}
          <select (change)="tipo.set($any($event.target).value)">
            @for (op of tipos; track op[0]) {
              <option [value]="op[0]" [selected]="op[0] === tipo()">{{ op[1].texto }}</option>
            }
          </select>
        </label>
      </div>
      <div class="fld">
        <span>{{ t.solicitacoes.oQuePrecisa }}</span>
        <app-editor-rico
          [(valor)]="texto"
          [rotulo]="t.solicitacoes.descreva"
          [pessoas]="acesso.pessoas()"
        />
      </div>
      @if (erro(); as e) {
        <p class="erro" role="alert">{{ e }}</p>
      }
      <p class="hint">{{ t.solicitacoes.ajuda }}</p>
      <button rodape type="button" class="btn" (click)="fechar.emit()">
        {{ t.comum.cancelar }}
      </button>
      <button rodape type="button" class="btn primary" [disabled]="enviando()" (click)="enviar()">
        {{ t.solicitacoes.enviar }}
      </button>
    </app-modal>
  `,
  styles: `
    .hint {
      margin: 0;
    }
  `,
})
export class NovaSolicitacaoModal {
  protected readonly acesso = inject(AcessoStore);
  private readonly solicitacoes = inject(SolicitacoesStore);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;
  protected readonly tipos = Object.entries(TIPO_SOLICITACAO) as [
    TipoSolicitacao,
    { texto: string },
  ][];

  readonly item = input.required<Item>();
  readonly fechar = output();

  protected readonly para = signal('');
  protected readonly tipo = signal<TipoSolicitacao>('informacao');
  protected readonly texto = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly enviando = signal(false);

  /** Quem decide pelo setor do item: o líder mais próximo (setor do item, depois os de cima) que não sou eu. */
  private readonly decisor = computed(() => {
    const eu = this.acesso.perfil()?.id;
    const setores = this.acesso.setores();
    const cadeia = [
      this.item().setor_id,
      ...ancestrais(this.item().setor_id, setores).map((s) => s.id),
    ];
    for (const setorId of cadeia) {
      const lider = this.acesso
        .pessoas()
        .find(
          (p) =>
            p.id !== eu && p.vinculos.some((v) => v.setor_id === setorId && v.papel === 'lider'),
        );
      if (lider) return { id: lider.id, setor: this.acesso.nomeSetor(setorId) };
    }
    return null;
  });

  protected readonly pessoas = computed(() => {
    const eu = this.acesso.perfil()?.id;
    const dec = this.decisor();
    return this.acesso
      .pessoas()
      .filter((p) => p.id !== eu)
      .map((p) => {
        const setor = p.vinculos[0] ? this.acesso.nomeSetor(p.vinculos[0].setor_id) : '';
        const decide = dec?.id === p.id ? ` ${this.t.solicitacoes.decidePor(dec.setor)}` : '';
        return {
          id: p.id,
          nome: p.nome,
          rotulo: `${p.nome}${setor ? ' · ' + setor : ''}${decide}`,
        };
      });
  });

  constructor() {
    // Aprovação: sugere quem decide pelo setor
    effect(() => {
      if (this.tipo() === 'aprovacao' && !this.para() && this.decisor())
        this.para.set(this.decisor()!.id);
    });
  }

  protected async enviar(): Promise<void> {
    if (!this.para()) {
      this.erro.set(this.t.solicitacoes.escolhaPessoa);
      return;
    }
    if (htmlVazio(this.texto())) {
      this.erro.set(this.t.solicitacoes.textoObrigatorio);
      return;
    }
    this.erro.set(null);
    this.enviando.set(true);
    const ok = await this.solicitacoes.abrir(
      this.item().id,
      this.para(),
      this.tipo(),
      sanitizar(this.texto()),
    );
    this.enviando.set(false);
    if (!ok) return;
    const nome = this.pessoas().find((p) => p.id === this.para())?.nome ?? '';
    this.toast.sucesso(this.t.solicitacoes.enviada(nome));
    this.fechar.emit();
  }
}
