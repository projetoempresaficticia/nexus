import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { LinhaItemComponent } from '../../shared/ui/linha-item.component';
import { VazioComponent } from '../../shared/ui/vazio.component';
import { hojeIso } from '../../shared/utils/datas';
import { NovoItemModal } from './novo-item.modal';
import { AgendaComponent } from './visoes/agenda.component';
import { ArvoreComponent } from './visoes/arvore.component';
import { CalendarioComponent } from './visoes/calendario.component';
import { DependenciasComponent } from './visoes/dependencias.component';
import { CargaComponent } from './visoes/carga.component';
import { GanttComponent } from './visoes/gantt.component';
import { PorPessoaComponent } from './visoes/por-pessoa.component';
import { KanbanComponent } from './visoes/kanban.component';

type Aba = keyof typeof TEXTOS.tarefas.abas;
type Visao = keyof typeof TEXTOS.tarefas.visoes;

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
  templateUrl: './tarefas.page.html',
  styleUrl: './tarefas.page.css',
})
export class TarefasPage {
  protected readonly acesso = inject(AcessoStore);
  protected readonly itens = inject(ItensStore);
  protected readonly t = TEXTOS;

  protected readonly aba = signal<Aba>('todas');
  protected readonly visao = signal<Visao>('lista');
  protected readonly soMeus = signal(false);
  /** Mês/semana mostrados no calendário; continua igual ao trocar entre Mês e Semana. */
  protected readonly refCalendario = signal(hojeIso());
  /** Visões além da Lista: "Todos" ou "Só as minhas" (sou responsável). */
  protected readonly quem = signal<'todos' | 'minhas'>('todos');
  protected readonly deQuem = [
    ['todos', this.t.tarefas.deQuem.todos],
    ['minhas', this.t.tarefas.deQuem.minhas],
  ] as const;
  protected readonly novo = signal(false);

  /**
   * Filtro por pessoa (US-39): só para quem lidera; lista quem tem vínculo nos setores que eu
   * administro (e abaixo) dentro do setor do cabeçalho. '' = todas.
   */
  protected readonly pessoaEscolhida = signal('');
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
    return this.itens
      .todos()
      .filter(
        (i) =>
          i.nivel > 0 &&
          !i.meu_envolvimento.includes('contexto') &&
          (filtro === 'todos' || setores.has(i.setor_id)) &&
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
    return (i: Item) =>
      !i.meu_envolvimento.includes('contexto') &&
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
    const lista = this.base().filter((i) => FILTROS[this.aba()](i, eu));
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
    void this.itens.carregar();
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
