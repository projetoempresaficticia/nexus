import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import {
  PRIORIDADE,
  Prioridade,
  RECORRENCIA,
  Recorrencia,
  SEM_RECORRENCIA,
} from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { EditorRicoComponent } from '../../shared/ui/editor-rico/editor-rico.component';
import { ModalComponent } from '../../shared/ui/modal.component';
import { SeletorPessoasComponent } from '../../shared/ui/seletor-pessoas.component';
import { ToastService } from '../../shared/ui/toast.service';
import { hojeIso } from '../../shared/utils/datas';
import { sanitizar } from '../../shared/utils/html-seguro';

/**
 * Novo projeto (nível 0), tarefa (1) ou subtarefa (2). Tarefa pode ficar "Sem projeto" escolhendo só o setor
 * (US-34); vários responsáveis com vínculo no setor (US-35).
 */
@Component({
  selector: 'app-novo-item-modal',
  imports: [ModalComponent, EditorRicoComponent, SeletorPessoasComponent],
  templateUrl: './novo-item.modal.html',
})
export class NovoItemModal {
  private readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly prioridades = Object.entries(PRIORIDADE) as [Prioridade, { texto: string }][];
  protected readonly recorrencias = Object.entries(RECORRENCIA) as [Recorrencia, string][];
  protected readonly semRecorrencia = SEM_RECORRENCIA;

  readonly nivel = input<0 | 1 | 2>(1);
  readonly paiId = input<string | null>(null);
  readonly fechar = output<Item | null>();

  protected readonly setorId = signal('');
  protected readonly projetoId = signal('');
  protected readonly nome = signal('');
  protected readonly descricao = signal('');
  protected readonly responsaveis = signal<string[]>([]);
  protected readonly inicio = signal(hojeIso());
  protected readonly prazo = signal('');
  protected readonly prioridade = signal<Prioridade>('media');
  protected readonly recorrencia = signal<Recorrencia | ''>('');
  protected readonly tentou = signal(false);
  protected readonly salvando = signal(false);

  protected readonly titulo = computed(() =>
    this.nivel() === 0
      ? this.t.novoItem.tituloProjeto
      : this.nivel() === 2
        ? this.t.novoItem.tituloSubtarefa
        : this.t.novoItem.tituloTarefa,
  );
  protected readonly pai = computed(() =>
    this.paiId() ? this.itens.porId(this.paiId()!) : undefined,
  );
  protected readonly caminhoPai = computed(() => {
    const p = this.pai();
    return p ? [...this.itens.caminho(p), p].map((i) => i.nome).join(' › ') : '';
  });
  /** Setores onde posso criar: os visíveis (vínculo direto ou administrados). */
  protected readonly setores = computed(() =>
    this.acesso.opcoesSetor().filter((o) => o.papel !== null),
  );
  protected readonly projetos = computed(() =>
    this.itens
      .todos()
      .filter((i) => i.nivel === 0 && !i.meu_envolvimento.includes('contexto'))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
  );
  protected readonly setorAlvo = computed(() => {
    const pai = this.pai() ?? (this.projetoId() ? this.itens.porId(this.projetoId()) : undefined);
    return pai?.setor_id ?? this.setorId();
  });
  protected readonly pessoas = computed(() =>
    this.setorAlvo() ? this.acesso.pessoasDoSetor(this.setorAlvo()) : [],
  );
  protected readonly euId = computed(() => this.acesso.perfil()?.id ?? null);

  protected readonly erroNome = computed(() => this.tentou() && !this.nome().trim());
  protected readonly erroPrazo = computed(
    () => !!this.prazo() && !!this.inicio() && this.prazo() < this.inicio(),
  );
  protected readonly erroSetor = computed(() => this.tentou() && !this.setorAlvo());

  constructor() {
    effect(() => {
      // primeiro setor disponível por padrão; responsável padrão = eu, se eu puder ser
      if (!this.setorId() && this.setores().length) this.setorId.set(this.setores()[0].id);
    });
    effect(() => {
      const eu = this.euId();
      const podeEu = this.pessoas().some((p) => p.id === eu);
      this.responsaveis.set(eu && podeEu ? [eu] : []);
    });
  }

  protected async criar(): Promise<void> {
    this.tentou.set(true);
    if (this.erroNome() || this.erroPrazo() || this.erroSetor()) return;
    this.salvando.set(true);
    const paiId =
      this.paiId() ?? (this.nivel() === 1 && this.projetoId() ? this.projetoId() : null);
    const criado = await this.itens.criar({
      nivel: this.nivel(),
      pai_id: paiId,
      setor_id: paiId ? undefined : this.setorId(),
      nome: this.nome().trim(),
      descricao_html: sanitizar(this.descricao()),
      responsaveis: this.responsaveis(),
      inicio: this.inicio() || null,
      prazo: this.prazo() || null,
      prioridade: this.prioridade(),
      recorrencia:
        this.nivel() > 0 && this.recorrencia() ? (this.recorrencia() as Recorrencia) : null,
    });
    this.salvando.set(false);
    if (!criado) return;
    this.toast.sucesso(this.nivel() === 0 ? this.t.novoItem.projetoCriado : this.t.novoItem.criada);
    this.fechar.emit(criado);
  }
}
