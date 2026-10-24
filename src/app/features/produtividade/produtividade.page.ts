import { Component, computed, effect, inject, signal } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { TEXTOS } from '../../core/models/textos';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { ToastService } from '../../shared/ui/toast.service';
import { dataCurta, hojeIso } from '../../shared/utils/datas';
import { estaAtrasado, estaParado, setoresDaPessoa } from '../tarefas/visoes/equipe';
import {
  Entrega,
  TipoPeriodo,
  Variacao,
  cicloMedio,
  decimal,
  noIntervalo,
  paradoMedio,
  periodo,
  porItem,
  pontualidade,
  semanasDo,
  variacao,
} from './produtividade.calculos';
import { ProdutividadeService } from './produtividade.service';

interface Kpi {
  id: keyof typeof TEXTOS.produtividade.kpis;
  rotulo: string;
  valor: string;
  unidade: string;
  sub: string;
  variacao: Variacao | null;
  /** Texto do lugar da variação quando não é comparação (Parados agora). */
  nota?: string;
}

/**
 * Produtividade da equipe dos setores que administro (US-29): período e pessoa, indicadores com
 * comparação ao período anterior de mesmo tamanho, e tabela da equipe.
 */
@Component({
  selector: 'app-produtividade-page',
  imports: [CabecalhoComponent, AvatarComponent, CarregandoComponent],
  templateUrl: './produtividade.page.html',
  styleUrl: './produtividade.page.css',
})
export class ProdutividadePage {
  protected readonly acesso = inject(AcessoStore);
  private readonly itens = inject(ItensStore);
  private readonly service = inject(ProdutividadeService);
  private readonly toast = inject(ToastService);
  protected readonly t = TEXTOS;
  protected readonly tipos = Object.entries(this.t.produtividade.periodos) as [
    TipoPeriodo,
    string,
  ][];

  protected readonly tipo = signal<TipoPeriodo>('12s');
  protected readonly pessoaEscolhida = signal('todas');
  private readonly entregas = signal<Entrega[]>([]);
  protected readonly carregando = signal(false);
  private readonly hoje = hojeIso();

  /** Setores do filtro do cabeçalho que eu administro. */
  protected readonly setores = computed(() => {
    const adm = this.acesso.administrados();
    return this.acesso.setoresDoFiltro().filter((s) => adm.has(s));
  });

  protected readonly periodo = computed(() => periodo(this.tipo(), this.hoje));
  protected readonly subtitulo = computed(() =>
    this.t.produtividade.subtitulo(dataCurta(this.periodo().de), dataCurta(this.periodo().ate)),
  );

  /** Toda a equipe: quem tem vínculo nos setores que administro (dentro do filtro). */
  protected readonly equipe = computed(() => {
    const setores = new Set(this.setores());
    return this.acesso
      .pessoas()
      .filter((p) => p.vinculos.some((v) => setores.has(v.setor_id)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  });
  protected readonly pessoa = computed(() => {
    const id = this.pessoaEscolhida();
    return this.equipe().some((p) => p.id === id) ? id : 'todas';
  });
  private readonly ids = computed(() =>
    this.pessoa() === 'todas' ? new Set(this.equipe().map((p) => p.id)) : new Set([this.pessoa()]),
  );

  /** Entregas das pessoas escolhidas; para a equipe, um item conta uma vez. */
  private readonly daSelecao = computed(() => {
    const l = this.entregas().filter((e) => this.ids().has(e.perfil_id));
    return this.pessoa() === 'todas' ? porItem(l) : l;
  });
  protected readonly atual = computed(() =>
    this.daSelecao().filter((e) => noIntervalo(e, this.periodo().de, this.periodo().ate)),
  );
  private readonly anterior = computed(() =>
    this.daSelecao().filter((e) => noIntervalo(e, this.periodo().deAnt, this.periodo().ateAnt)),
  );

  /** Itens abertos (tarefas e subtarefas) das pessoas escolhidas nos meus setores. */
  private readonly abertos = computed(() => {
    const setores = new Set(this.setores());
    return this.itens
      .todos()
      .filter(
        (i) =>
          i.nivel > 0 &&
          i.status !== 'concluida' &&
          setores.has(i.setor_id) &&
          i.responsaveis.some((r) => this.ids().has(r)),
      );
  });

  protected readonly kpis = computed<Kpi[]>(() => {
    const k = this.t.produtividade.kpis;
    const atual = this.atual();
    const ant = this.anterior();
    const parados = this.abertos().filter(estaParado);
    const ciclo = cicloMedio(atual);
    const parado = paradoMedio(atual);
    return [
      {
        id: 'entregas',
        ...k.entregas,
        valor: String(atual.length),
        unidade: '',
        variacao: variacao(atual.length, ant.length, true),
      },
      {
        id: 'pontualidade',
        ...k.pontualidade,
        valor: String(Math.round(pontualidade(atual))),
        unidade: '%',
        variacao: variacao(pontualidade(atual), pontualidade(ant), true),
      },
      {
        id: 'ciclo',
        ...k.ciclo,
        valor: decimal(ciclo),
        unidade: this.t.produtividade.dias,
        variacao: variacao(ciclo, cicloMedio(ant), false),
      },
      {
        id: 'parado',
        ...k.parado,
        valor: decimal(parado),
        unidade: this.t.produtividade.dias,
        variacao: variacao(parado, paradoMedio(ant), false),
      },
      {
        id: 'paradosAgora',
        rotulo: k.paradosAgora.rotulo,
        sub: k.paradosAgora.sub(this.abertos().length),
        valor: String(parados.length),
        unidade: '',
        variacao: null,
        nota: this.t.produtividade.ha5Dias(parados.filter((i) => (i.dias_parado ?? 0) >= 5).length),
      },
    ];
  });

  protected readonly semanas = computed(() => semanasDo(this.periodo()));

  /** Tabela da equipe: sempre todas as pessoas; a escolhida fica destacada. */
  protected readonly linhas = computed(() => {
    const adm = this.acesso.administrados();
    const setores = new Set(this.setores());
    const { de, ate } = this.periodo();
    return this.equipe()
      .map((p) => {
        const todas = this.entregas().filter((e) => e.perfil_id === p.id);
        const noPeriodo = todas.filter((e) => noIntervalo(e, de, ate));
        const abertos = this.itens
          .todos()
          .filter(
            (i) =>
              i.nivel > 0 &&
              i.status !== 'concluida' &&
              setores.has(i.setor_id) &&
              i.responsaveis.includes(p.id),
          );
        return {
          pessoa: p,
          setores: setoresDaPessoa(p, adm, (id) => this.acesso.nomeSetor(id), ''),
          tendencia: this.semanas().map(
            (s) => todas.filter((e) => noIntervalo(e, s.de, s.ate)).length,
          ),
          entregas: noPeriodo.length,
          pontualidade: noPeriodo.length ? Math.round(pontualidade(noPeriodo)) : null,
          ciclo: noPeriodo.length ? decimal(cicloMedio(noPeriodo)) : null,
          abertos: abertos.length,
          atrasados: abertos.filter((i) => estaAtrasado(i, this.hoje)).length,
          parados: abertos.filter(estaParado).length,
        };
      })
      .sort((a, b) => b.entregas - a.entregas);
  });

  constructor() {
    void this.itens.carregar();
    // Recarrega quando muda o período ou os setores (busca também o período anterior, para comparar)
    let pedido = 0;
    effect(() => {
      const setores = this.setores();
      const desde = this.periodo().deAnt;
      const meu = ++pedido;
      this.carregando.set(true);
      this.service.listar(setores, desde).then(
        (l) => {
          if (meu !== pedido) return;
          this.entregas.set(l);
          this.carregando.set(false);
        },
        (e) => {
          if (meu !== pedido) return;
          this.carregando.set(false);
          this.toast.erro(e);
        },
      );
    });
  }

  protected escolherPessoa(id: string): void {
    this.pessoaEscolhida.set(this.pessoa() === id ? 'todas' : id);
  }

  protected textoVariacao(v: Variacao): string {
    const tv = this.t.produtividade.variacao;
    return v.comparavel ? v.texto : tv[v.texto as keyof typeof tv];
  }

  /** Mini gráfico de linha da tendência semanal (pontos do polyline). */
  protected pontos(vals: number[]): string {
    const max = Math.max(1, ...vals);
    return vals
      .map(
        (v, i) =>
          `${((i * 90) / Math.max(1, vals.length - 1) + 3).toFixed(1)},${(23 - (v / max) * 20).toFixed(1)}`,
      )
      .join(' ');
  }
}
