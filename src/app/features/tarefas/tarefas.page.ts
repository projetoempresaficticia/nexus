import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import { ORDEM_STATUS, STATUS_ITEM, StatusItem } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { LinhaItemComponent } from '../../shared/ui/linha-item.component';
import { VazioComponent } from '../../shared/ui/vazio.component';
import { Aba, TarefasFiltrosStore, Visao } from './tarefas-filtros.store';
import { NovoItemModal } from './novo-item.modal';
import { AgendaComponent } from './visoes/agenda.component';
import { ArvoreComponent } from './visoes/arvore.component';
import { CalendarioComponent } from './visoes/calendario.component';
import { DependenciasComponent } from './visoes/dependencias.component';
import { CargaComponent } from './visoes/carga.component';
import { GanttComponent } from './visoes/gantt.component';
import { PorPessoaComponent } from './visoes/por-pessoa.component';
import { KanbanComponent } from './visoes/kanban.component';

const FILTROS: Record<Aba, (i: Item, eu: string | null) => boolean> = {
  todas: (i) => i.status !== 'concluida',
  minhas: (i, eu) => !!eu && i.responsaveis.includes(eu) && i.status !== 'concluida',
  andamento: (i) => i.status === 'em_andamento' || i.status === 'a_fazer',
  paradas: (i) => i.status === 'bloqueada' || i.status === 'aguardando_aprovacao',
  concluidas: (i) => i.status === 'concluida',
};
/** "Só os meus" do líder: itens em que estou diretamente envolvido. */
const DIRETO = ['responsavel', 'criador', 'aprovador', 'solicitacao', 'mencao'];

interface Grupo {
  id: string;
  nome: string;
  contexto: boolean;
  itens: Item[];
}

/** Tarefas / Minhas tarefas — visão Lista agrupada por projeto, com "Sem projeto" (US-21, US-34, US-36). */
@Component({
  selector: 'app-tarefas-page',
  imports: [
    RouterLink,
    CabecalhoComponent,
    LinhaItemComponent,
    VazioComponent,
    CarregandoComponent,
    NovoItemModal,
    KanbanComponent,
    ArvoreComponent,
    DependenciasComponent,
    AgendaComponent,
    CalendarioComponent,
    GanttComponent,
    PorPessoaComponent,
    CargaComponent,
    NgTemplateOutlet,
  ],
  host: { '(document:keydown.escape)': 'statusAberto.set(false)' },
  templateUrl: './tarefas.page.html',
  styleUrl: './tarefas.page.css',
})
export class TarefasPage {
  protected readonly acesso = inject(AcessoStore);
  protected readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;
  /** Guardados fora do componente (T-69): voltar de uma tarefa não reseta o que foi escolhido. */
  private readonly filtros = inject(TarefasFiltrosStore);

  protected readonly abaAtual = this.filtros.abaAtual;
  /** ?aba= vindo dos KPIs do Painel. */
  readonly aba = input<string>();
  protected readonly visao = this.filtros.visao;
  protected readonly soMeus = this.filtros.soMeus;
  /** Mês/semana mostrados no calendário; continua igual ao trocar entre Mês e Semana. */
  protected readonly refCalendario = this.filtros.refCalendario;
  /** Visões além da Lista: "Todos" ou "Só as minhas" (sou responsável). */
  protected readonly quem = this.filtros.quem;
  protected readonly deQuem = [
    ['todos', this.t.tarefas.deQuem.todos],
    ['minhas', this.t.tarefas.deQuem.minhas],
  ] as const;
  protected readonly novo = signal(false);

  /**
   * Filtro por status (US-22): quais status aparecem em qualquer visão. Todos marcados = sem
   * filtro nenhum (como sempre foi).
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

  /**
   * Filtro por pessoa (US-39): só para quem lidera; lista quem tem vínculo nos setores que eu
   * administro (e abaixo) dentro do setor do cabeçalho. '' = todas.
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

  protected readonly abas = Object.entries(this.t.tarefas.abas) as [Aba, string][];
  protected readonly visoes = computed(() =>
    (Object.entries(this.t.tarefas.visoes) as [Visao, string][]).filter(
      ([v]) => (v !== 'pessoa' && v !== 'carga') || this.acesso.ehLider(),
    ),
  );
  protected readonly titulo = computed(() =>
    this.acesso.ehLider() ? this.t.tarefas.tituloLider : this.t.tarefas.tituloMembro,
  );

  /** Tarefas e subtarefas dos setores do filtro (contexto não entra como linha). */
  protected readonly base = computed(() => {
    const filtro = this.acesso.setorFiltro();
    const setores = new Set(this.acesso.setoresDoFiltro());
    const status = this.statusEscolhido();
    return this.itens
      .todos()
      .filter(
        (i) =>
          i.nivel > 0 &&
          !i.meu_envolvimento.includes('contexto') &&
          (filtro === 'todos' || setores.has(i.setor_id)) &&
          status.has(i.status) &&
          (!this.soMeus() || i.meu_envolvimento.some((e) => DIRETO.includes(e))) &&
          (!this.pessoa() || i.responsaveis.includes(this.pessoa())),
      );
  });
  protected readonly itensVisao = computed(() => {
    const eu = this.acesso.perfil()?.id ?? '';
    return this.quem() === 'minhas'
      ? this.base().filter((i) => i.responsaveis.includes(eu))
      : this.base();
  });
  /** Árvore: todos os itens dos setores do filtro, inclusive projetos e contexto (os galhos). */
  protected readonly itensArvore = computed(() => {
    const filtro = this.acesso.setorFiltro();
    const setores = new Set(this.acesso.setoresDoFiltro());
    return this.itens.todos().filter((i) => filtro === 'todos' || setores.has(i.setor_id));
  });
  /** Folhas que a Árvore mostra (com o caminho até elas), pelos filtros "Só os meus" e "Só as minhas". */
  protected readonly interessa = computed(() => {
    const eu = this.acesso.perfil()?.id ?? '';
    const soMeus = this.soMeus();
    const minhas = this.quem() === 'minhas';
    const pessoa = this.pessoa();
    const status = this.statusEscolhido();
    return (i: Item) =>
      !i.meu_envolvimento.includes('contexto') &&
      status.has(i.status) &&
      (!pessoa || i.responsaveis.includes(pessoa)) &&
      (!soMeus || i.meu_envolvimento.some((e) => DIRETO.includes(e))) &&
      (!minhas || i.responsaveis.includes(eu));
  });
  /** Por pessoa / Carga: abertos dos setores que administro, e a equipe do filtro "Pessoa". */
  protected readonly itensEquipe = computed(() => {
    const adm = this.acesso.administrados();
    return this.base().filter((i) => i.status !== 'concluida' && adm.has(i.setor_id));
  });
  protected readonly pessoasEquipe = computed(() =>
    this.pessoa()
      ? this.pessoasFiltro().filter((p) => p.id === this.pessoa())
      : this.pessoasFiltro(),
  );
  protected readonly abertos = computed(
    () => this.base().filter((i) => i.status !== 'concluida').length,
  );
  protected readonly contagem = computed(() => {
    const eu = this.acesso.perfil()?.id ?? null;
    return Object.fromEntries(
      this.abas.map(([a]) => [a, this.base().filter((i) => FILTROS[a](i, eu)).length]),
    );
  });

  /** Grupos por projeto (alfabético) e, no fim, "Sem projeto". */
  protected readonly grupos = computed<Grupo[]>(() => {
    const eu = this.acesso.perfil()?.id ?? null;
    const lista = this.base().filter((i) => FILTROS[this.abaAtual()](i, eu));
    const porProjeto = new Map<string, Item[]>();
    for (const i of lista) {
      const chave = i.projeto_id ?? '';
      porProjeto.set(chave, [...(porProjeto.get(chave) ?? []), i]);
    }
    const grupos: Grupo[] = [...porProjeto.entries()]
      .filter(([id]) => id)
      .map(([id, itens]) => {
        const p = this.itens.porId(id);
        return {
          id,
          nome: p?.nome ?? '—',
          contexto: !!p?.meu_envolvimento.includes('contexto'),
          itens,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
    const avulsas = porProjeto.get('');
    if (avulsas)
      grupos.push({ id: '', nome: this.t.tarefas.semProjeto, contexto: false, itens: avulsas });
    return grupos.map((g) => ({ ...g, itens: this.ordenar(g.itens) }));
  });

  /** "+N mais" no Mês abre a Semana daquele dia. */
  protected verSemana(iso: string): void {
    this.refCalendario.set(iso);
    this.visao.set('semana');
  }

  constructor() {
    effect(() => {
      const aba = this.aba();
      if (aba && aba in this.t.tarefas.abas) {
        this.abaAtual.set(aba as Aba);
        this.visao.set('lista');
      }
    });
    void this.itens.carregar();

    // Fecha o painel de status ao clicar fora dele (igual ao sino de notificações).
    const fechar = (evento: MouseEvent) => {
      if (!(evento.target as HTMLElement).closest('.status-filtro')) this.statusAberto.set(false);
    };
    document.addEventListener('click', fechar);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('click', fechar));
  }

  /** Tarefa seguida das suas subtarefas; depois por prazo. */
  private ordenar(itens: Item[]): Item[] {
    const chave = (i: Item) => {
      const tarefa = i.nivel === 2 && i.pai_id ? this.itens.porId(i.pai_id) : i;
      return `${tarefa?.prazo ?? '9999'}|${tarefa?.id}|${i.nivel}|${i.prazo ?? '9999'}`;
    };
    return [...itens].sort((a, b) => chave(a).localeCompare(chave(b)));
  }
}
