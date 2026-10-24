import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AcessoStore } from '../../core/auth/acesso.store';
import { ItensStore } from '../../core/itens/itens.store';
import { Item } from '../../core/models/item.model';
import { NIVEL } from '../../core/models/rotulos';
import { TEXTOS } from '../../core/models/textos';
import { SolicitacoesStore } from '../../core/solicitacoes/solicitacoes.store';
import { CabecalhoComponent } from '../../layout/cabecalho/cabecalho.component';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { BarraComponent } from '../../shared/ui/barra.component';
import { CarregandoComponent } from '../../shared/ui/carregando.component';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { PillStatusComponent } from '../../shared/ui/pill-status.component';
import { diferencaDias, hojeIso } from '../../shared/utils/datas';
import { textoPuro } from '../../shared/utils/html-seguro';
import { progressoPorFilhos } from '../../shared/utils/progresso';

type Kpi = keyof typeof TEXTOS.painel.kpis;

const KPIS: { id: Kpi; cor: string; aba: string }[] = [
  { id: 'abertas', cor: 'var(--accent)', aba: 'todas' },
  { id: 'atrasadas', cor: 'var(--danger)', aba: 'todas' },
  { id: 'bloqueadas', cor: 'var(--bloq-fg)', aba: 'paradas' },
  { id: 'aguardando', cor: 'var(--aprov-fg)', aba: 'paradas' },
  { id: 'concluidas', cor: 'var(--done-fg)', aba: 'concluidas' },
];

/**
 * Painel do líder (US-28): KPIs dos setores que administra (dentro do filtro), itens parados
 * e andamento dos projetos. Calculado dos itens já carregados — atualiza em tempo real.
 */
@Component({
  selector: 'app-painel-page',
  imports: [
    RouterLink,
    CabecalhoComponent,
    KpiCardComponent,
    PillStatusComponent,
    CarregandoComponent,
    BarraComponent,
    AvatarComponent,
  ],
  templateUrl: './painel.page.html',
  styleUrl: './painel.page.css',
})
export class PainelPage {
  protected readonly acesso = inject(AcessoStore);
  protected readonly itens = inject(ItensStore);
  private readonly solicitacoes = inject(SolicitacoesStore);
  private readonly router = inject(Router);
  protected readonly t = TEXTOS;
  protected readonly nivel = NIVEL;

  /** Setores do filtro que eu administro. */
  private readonly setores = computed(() => {
    const adm = this.acesso.administrados();
    return new Set(this.acesso.setoresDoFiltro().filter((s) => adm.has(s)));
  });

  protected readonly subtitulo = computed(() => {
    const nomes = [...this.setores()]
      .filter((s) => this.acesso.setores().some((x) => x.id === s && x.visivel))
      .map((s) => this.acesso.nomeSetor(s));
    return nomes.length ? this.t.painel.setores(nomes.join(', ')) : '';
  });

  private readonly trabalho = computed(() =>
    this.itens.todos().filter((i) => i.nivel > 0 && this.setores().has(i.setor_id)),
  );

  protected readonly kpis = computed(() => {
    const hoje = hojeIso();
    const mes = hoje.slice(0, 7);
    const l = this.trabalho();
    const valor: Record<Kpi, number> = {
      abertas: l.filter((i) => i.status !== 'concluida').length,
      atrasadas: l.filter((i) => i.status !== 'concluida' && !!i.prazo && i.prazo < hoje).length,
      bloqueadas: l.filter((i) => i.status === 'bloqueada').length,
      aguardando: l.filter((i) => i.status === 'aguardando_aprovacao').length,
      concluidas: l.filter(
        (i) => i.status === 'concluida' && this.mesLisboa(i.concluido_em) === mes,
      ).length,
    };
    return KPIS.map((k) => ({ ...k, ...this.t.painel.kpis[k.id], valor: valor[k.id] }));
  });

  /** Parados (bloqueada / aguardando), mais antigos primeiro, com de quem se espera. */
  protected readonly parados = computed(() => {
    const hoje = hojeIso();
    return this.trabalho()
      .filter((i) => i.status === 'bloqueada' || i.status === 'aguardando_aprovacao')
      .map((i) => {
        const pendente = this.solicitacoes
          .lista()
          .filter((s) => s.item_id === i.id && s.status === 'pendente')
          .sort((a, b) => a.criado_em.localeCompare(b.criado_em))[0];
        const espera = pendente?.para_id ?? i.aprovador_id;
        const pessoa = espera ? this.acesso.pessoaPorId().get(espera) : undefined;
        const setorPessoa = pessoa?.vinculos[0]?.setor_id;
        const dias =
          i.dias_parado ?? (i.parado_desde ? diferencaDias(i.parado_desde.slice(0, 10), hoje) : 0);
        return {
          item: i,
          caminho: this.itens
            .caminho(i)
            .map((c) => c.nome)
            .join(' › '),
          motivo: textoPuro(i.motivo_bloqueio_html) || textoPuro(pendente?.texto_html) || '—',
          pessoa: pessoa?.nome ?? null,
          setorPessoa: setorPessoa ? this.acesso.nomeSetor(setorPessoa) : '',
          outroSetor: !!pessoa && !pessoa.vinculos.some((v) => v.setor_id === i.setor_id),
          dias,
        };
      })
      .sort((a, b) => b.dias - a.dias);
  });

  protected readonly projetos = computed(() =>
    this.itens
      .todos()
      .filter((i) => i.nivel === 0 && this.setores().has(i.setor_id))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
      .map((p) => {
        const resp = p.responsaveis[0]
          ? this.acesso.pessoaPorId().get(p.responsaveis[0])
          : undefined;
        return {
          item: p,
          setor: this.acesso.nomeSetor(p.setor_id),
          responsavel: resp ?? null,
          progresso: progressoPorFilhos(this.itens.filhos(p.id)) ?? {
            concluidos: 0,
            total: 0,
            percentual: 0,
          },
        };
      }),
  );

  constructor() {
    void this.itens.carregar();
    void this.solicitacoes.carregar();
  }

  protected abrirKpi(aba: string): void {
    void this.router.navigate(['/tarefas'], { queryParams: { aba } });
  }

  protected abrirItem(item: Item): void {
    void this.router.navigate(['/item', item.id]);
  }

  /** Mês (AAAA-MM) de um instante em Lisboa. */
  private mesLisboa(instante: string | null): string | null {
    if (!instante) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Lisbon',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date(instante));
  }
}
