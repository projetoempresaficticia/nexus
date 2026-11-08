import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { ORDEM_STATUS, STATUS_ITEM, StatusItem } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { BarraComponent } from '../../shared/ui/barra.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { VazioComponent } from '../../shared/ui/vazio.component';
import { CriterioOrdenacao, ordenarItens } from '../../shared/utils/ordenar';
import {
  ehResponsavelAbaixo,
  paradosAbaixo,
  progressoPorFilhos,
} from '../../shared/utils/progresso';
import { NovoItemModal } from '../tarefas/novo-item.modal';
import { ProjetosFiltrosStore } from './projetos-filtros.store';

/** Grade de projetos com progresso e parados (US-07); cartão "Sem projeto" para as tarefas avulsas (US-34). */
@Component({
  selector: 'app-projetos-page',
  imports: [
    RouterLink,
    CabecalhoComponent,
    BarraComponent,
    VazioComponent,
    CarregandoComponent,
    NovoItemModal,
    PillStatusComponent,
  ],
  host: { '(document:keydown.escape)': 'statusAberto.set(false)' },
  templateUrl: './projetos.page.html',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
      min-width: 0;
    }
    .pcard {
      text-decoration: none;
      color: inherit;
    }
    .topo,
    .rodape {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }
    .topo .row-sub,
    .rodape .muted {
      margin-right: auto;
    }
    .rodape {
      font-size: 13px;
    }
    .nome {
      font-size: 18px;
      font-family: var(--f-display);
    }
    .parados {
      color: var(--bloq-fg);
      font-weight: 600;
    }
    .avulsas {
      border-style: dashed;
    }
    .status-filtro {
      position: relative;
    }
    .status-pop {
      position: absolute;
      z-index: 10;
      top: calc(100% + 6px);
      left: 0;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 12px;
      box-shadow: var(--shadow);
    }
    .status-acoes {
      display: flex;
      gap: 6px;
      margin-bottom: 4px;
    }
    .status-acoes .btn {
      flex: 1 1 0;
    }
    .status-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 4px;
      font-size: 14px;
      cursor: pointer;
    }
  `,
})
export class ProjetosPage {
  protected readonly acesso = inject(AcessoStore);
  protected readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;
  protected readonly novo = signal(false);
  private readonly filtros = inject(ProjetosFiltrosStore);

  private readonly noFiltro = (setorId: string) =>
    this.acesso.setorFiltro() === 'todos' || this.acesso.setoresDoFiltro().includes(setorId);

  /**
   * Filtro por pessoa (igual ao de Tarefas, US-39): só para quem lidera; lista quem tem vínculo
   * nos setores que eu administro dentro do setor do cabeçalho. '' = todas. Guardado fora do
   * componente (T-69): voltar de um projeto não reseta a escolha.
   */
  protected readonly pessoaEscolhida = this.filtros.pessoaEscolhida;
  protected readonly pessoasFiltro = computed(() => {
    if (!this.acesso.ehLider()) return [];
    const adm = this.acesso.administrados();
    const setores = new Set(this.acesso.setoresDoFiltro().filter((s) => adm.has(s)));
    return this.acesso
      .pessoas()
      .filter((p) => p.vinculos.some((v) => setores.has(v.setor_id)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  });
  /** A escolha some se a pessoa sair da lista (ex.: trocou o setor do cabeçalho). */
  protected readonly pessoa = computed(() => {
    const id = this.pessoaEscolhida();
    return this.pessoasFiltro().some((p) => p.id === id) ? id : '';
  });

  /** Ordem dos cartões de projeto (T-70). Guardada fora do componente, igual ao filtro de pessoa. */
  protected readonly ordenarPor = this.filtros.ordenarPor;
  protected readonly ordenarOpcoes: [CriterioOrdenacao, string][] = [
    ['nome', this.t.ordenar.nome],
    ['prazo', this.t.ordenar.prazo],
    ['prioridade', this.t.ordenar.prioridade],
    ['recente', this.t.ordenar.recente],
  ];

  /**
   * Filtro por status do próprio projeto (T-72, igual ao de Tarefas US-22): quais status
   * aparecem na grade. Todos marcados = sem filtro nenhum.
   */
  protected readonly statusLista = ORDEM_STATUS;
  protected readonly statusEscolhido = this.filtros.status;
  protected readonly statusAberto = signal(false);
  protected readonly statusTexto = computed(() => {
    const n = this.statusEscolhido().size;
    return n === this.statusLista.length
      ? this.t.tarefas.status.todos
      : this.t.tarefas.status.alguns(n);
  });
  protected statusRotulo(s: StatusItem): string {
    return STATUS_ITEM[s].texto;
  }
  protected alternarStatus(s: StatusItem, marcado: boolean): void {
    const atual = new Set(this.statusEscolhido());
    if (marcado) atual.add(s);
    else atual.delete(s);
    this.filtros.status.set(atual);
  }
  protected marcarTodosStatus(marcar: boolean): void {
    this.filtros.status.set(new Set(marcar ? this.statusLista : []));
  }

  protected readonly cartoes = computed(() => {
    const todos = this.itens.todos();
    const pessoa = this.pessoa();
    const status = this.statusEscolhido();
    const projetos = todos.filter(
      (i) =>
        i.nivel === 0 &&
        this.noFiltro(i.setor_id) &&
        status.has(i.status) &&
        (!pessoa || ehResponsavelAbaixo(i.id, pessoa, todos)),
    );
    return ordenarItens(projetos, this.ordenarPor()).map((p) => {
      const papel = this.acesso.opcoesSetor().find((o) => o.id === p.setor_id)?.papel ?? null;
      return {
        projeto: p,
        setor: this.acesso.nomeSetor(p.setor_id),
        papel: papel ? this.t.papel[papel] : null,
        lider: papel === 'lider',
        progresso: progressoPorFilhos(todos.filter((f) => f.pai_id === p.id)),
        parados: paradosAbaixo(p.id, todos),
      };
    });
  });

  protected readonly avulsas = computed(
    () =>
      this.itens.todos().filter((i) => i.nivel === 1 && !i.pai_id && this.noFiltro(i.setor_id))
        .length,
  );

  constructor() {
    void this.itens.carregar();

    // Fecha o painel de status ao clicar fora dele (igual ao de Tarefas).
    const fechar = (evento: MouseEvent) => {
      if (!(evento.target as HTMLElement).closest('.status-filtro')) this.statusAberto.set(false);
    };
    document.addEventListener('click', fechar);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('click', fechar));
  }
}
