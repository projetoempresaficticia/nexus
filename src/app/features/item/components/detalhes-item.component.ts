import { Component, computed, inject, input } from '@angular/core';
import { AcessoStore } from '../../../core/auth/acesso.store';
import { ItensStore } from '../../../core/itens/itens.store';
import { CamposEditaveis, Item } from '../../../core/models/item.model';
import {
  PRIORIDADE,
  Prioridade,
  RECORRENCIA,
  Recorrencia,
  SEM_RECORRENCIA,
} from '../../../core/models/rotulos';
import { TEXTOS } from '../../../core/models/textos';
import { AvataresComponent } from '../../../shared/ui/avatares.component';
import { BarraComponent } from '../../../shared/ui/barra.component';
import { SeletorPessoasComponent } from '../../../shared/ui/seletor-pessoas.component';
import { ToastService } from '../../../shared/ui/toast.service';
import { progressoPorFilhos } from '../../../shared/utils/progresso';

/** Painel "Detalhes": responsáveis, prioridade, repetir, datas, projeto (mover avulsa), setor, decide, progresso. */
@Component({
  selector: 'app-detalhes-item',
  imports: [AvataresComponent, BarraComponent, SeletorPessoasComponent],
  templateUrl: './detalhes-item.component.html',
  styles: `
    .kv-l {
      color: var(--muted);
      font-size: 13px;
    }
    .resp {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .resp > span {
      color: var(--muted);
      font-size: 13px;
    }
    .prog {
      display: flex;
      align-items: center;
      gap: 8px;
      font-variant-numeric: tabular-nums;
    }
    .prog app-barra {
      flex: 1;
    }
  `,
})
export class DetalhesItemComponent {
  private readonly itens = inject(ItensStore);
  protected readonly acesso = inject(AcessoStore);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly prioridades = Object.entries(PRIORIDADE) as [Prioridade, { texto: string }][];
  protected readonly recorrencias = Object.entries(RECORRENCIA) as [Recorrencia, string][];
  protected readonly semRecorrencia = SEM_RECORRENCIA;

  readonly item = input.required<Item>();
  readonly podeEditar = input(false);

  protected readonly pessoas = computed(() => this.acesso.pessoasDoSetor(this.item().setor_id));
  protected readonly responsaveis = computed(() =>
    this.item()
      .responsaveis.map((id) => this.acesso.pessoaPorId().get(id))
      .filter((p) => !!p),
  );
  protected readonly euId = computed(() => this.acesso.perfil()?.id ?? null);
  /** Projetos para onde a tarefa pode ir: do mesmo setor, ou de setor que administro. */
  protected readonly projetos = computed(() =>
    this.itens
      .todos()
      .filter(
        (p) =>
          p.nivel === 0 &&
          !p.meu_envolvimento.includes('contexto') &&
          (p.setor_id === this.item().setor_id || this.acesso.administrados().has(p.setor_id)),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
  );
  protected readonly decide = computed(() => {
    const nomes = this.acesso
      .decisores(this.item().setor_id)
      .flatMap((d) => d.lideres)
      .filter((n, i, todos) => todos.indexOf(n) === i);
    return nomes.length ? nomes.slice(0, 3).join(' → ') : this.t.item.semLider;
  });
  protected readonly progresso = computed(() =>
    progressoPorFilhos(this.itens.filhos(this.item().id)),
  );

  protected async salvar(campos: CamposEditaveis): Promise<void> {
    const i = this.item();
    const inicio = 'inicio' in campos ? campos.inicio : i.inicio;
    const prazo = 'prazo' in campos ? campos.prazo : i.prazo;
    if (inicio && prazo && prazo < inicio) {
      this.toast.falha(this.t.novoItem.prazoAntesInicio);
      return;
    }
    if (await this.itens.atualizar(i.id, campos)) this.toast.sucesso(this.t.item.alteracoesSalvas);
  }

  protected async definirResponsaveis(ids: string[]): Promise<void> {
    if (await this.itens.definirResponsaveis(this.item().id, ids)) {
      this.toast.sucesso(this.t.item.responsaveisAtualizados);
    }
  }

  protected async mover(projetoId: string): Promise<void> {
    const destino = projetoId ? this.itens.porId(projetoId) : undefined;
    if (await this.itens.atualizar(this.item().id, { pai_id: projetoId || null })) {
      // o setor dos filhos pode ter mudado no servidor (trigger): recarrega
      await this.itens.carregar(true);
      this.toast.sucesso(destino ? this.t.item.movida(destino.nome) : this.t.item.tiradaDoProjeto);
    }
  }
}
