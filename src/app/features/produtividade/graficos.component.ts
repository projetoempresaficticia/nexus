import { Component, computed, inject, input } from '@angular/core';
import { AcessoStore } from '../../core/auth/acesso.store';
import { Pessoa } from '../../core/models/acesso.model';
import { TEXTOS } from '../../core/models/textos';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { dataCurta } from '../../shared/utils/datas';
import { Entrega, Semana, decimal, noIntervalo } from './produtividade.calculos';

/** Tempo médio de resposta de um setor aos pedidos da equipe. */
export interface Espera {
  setor_id: string;
  media: number;
  n: number;
}

// Geometria do gráfico de linhas (mesma do protótipo)
const W = 760;
const H = 270;
const L = 44;
const R = 120;
const T = 16;
const B = 34;
const IW = W - L - R;
const IH = H - T - B;

/** Teto "redondo" do eixo Y. */
function teto(v: number): number {
  if (v <= 5) return 5;
  const m = 10 ** Math.floor(Math.log10(v));
  return (Math.ceil((v / m) * 2) / 2) * m;
}

/** Gráficos da Produtividade (T-31b): ritmo, entregas por pessoa, quem segura, setor × semana. */
@Component({
  selector: 'app-graficos-produtividade',
  imports: [AvatarComponent],
  templateUrl: './graficos.component.html',
  styleUrl: './graficos.component.css',
})
export class GraficosProdutividadeComponent {
  private readonly acesso = inject(AcessoStore);
  protected readonly t = TEXTOS;
  protected readonly W = W;
  protected readonly H = H;
  protected readonly decimal = decimal;
  protected readonly dataCurta = dataCurta;

  readonly semanas = input.required<Semana[]>();
  /** Entregas da seleção (equipe sem repetir item, ou da pessoa), todos os períodos carregados. */
  readonly entregas = input.required<Entrega[]>();
  /** Entregas do período atual, uma linha por responsável. */
  readonly doPeriodo = input.required<Entrega[]>();
  readonly pessoas = input.required<Pessoa[]>();
  readonly criadosPorSemana = input.required<number[]>();
  readonly esperas = input.required<Espera[]>();
  readonly setores = input.required<string[]>();

  protected readonly ritmo = computed(() => {
    const semanas = this.semanas();
    const entregues = semanas.map(
      (s) => this.entregas().filter((e) => noIntervalo(e, s.de, s.ate)).length,
    );
    const criados = this.criadosPorSemana();
    const max = teto(Math.max(1, ...entregues, ...criados));
    const x = (i: number) => L + (semanas.length === 1 ? IW / 2 : (i * IW) / (semanas.length - 1));
    const y = (v: number) => T + IH - (v / max) * IH;
    const passo = semanas.length > 1 ? IW / (semanas.length - 1) : IW;
    const linha = (vals: number[]) =>
      vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const ultimo = semanas.length - 1;
    return {
      grade: [0, 1, 2, 3, 4].map((k) => ({
        y: y((max / 4) * k),
        valor: Math.round((max / 4) * k),
      })),
      rotulos: semanas
        .map((s, i) => ({ x: x(i), texto: dataCurta(s.de), i }))
        .filter((r) => r.i % Math.ceil(semanas.length / 8) === 0 || r.i === ultimo),
      faixas: semanas.map((s, i) => ({
        x: x(i) - passo / 2,
        largura: passo,
        dica: `${this.t.produtividade.ritmo.semana} ${dataCurta(s.de)} · ${this.t.produtividade.ritmo.entregues}: ${entregues[i]} · ${this.t.produtividade.ritmo.criados}: ${criados[i] ?? 0}`,
      })),
      series: [
        {
          nome: this.t.produtividade.ritmo.entregues,
          cor: 'var(--c1)',
          vals: entregues,
          ajuste: -6,
        },
        { nome: this.t.produtividade.ritmo.criados, cor: 'var(--c2)', vals: criados, ajuste: 10 },
      ].map((s) => ({
        ...s,
        d: linha(s.vals),
        fimX: x(ultimo),
        fimY: y(s.vals[ultimo] ?? 0),
        ultimo: s.vals[ultimo] ?? 0,
      })),
      tabela: semanas.map((s, i) => ({ s, entregues: entregues[i], criados: criados[i] ?? 0 })),
      L,
      fimGrade: W - R,
      altura: IH,
      topo: T,
    };
  });

  protected readonly porPessoa = computed(() => {
    const linhas = this.pessoas()
      .map((p) => {
        const l = this.doPeriodo().filter((e) => e.perfil_id === p.id);
        const atrasadas = l.filter((e) => !e.no_prazo);
        const total = l.length;
        const pctNoPrazo = total ? Math.round(((total - atrasadas.length) / total) * 100) : 0;
        return {
          pessoa: p,
          total,
          noPrazo: total - atrasadas.length,
          atrasadas: atrasadas.length,
          pctNoPrazo,
          pctAtraso: total ? 100 - pctNoPrazo : 0,
          dica: atrasadas.length
            ? this.t.produtividade.porPessoa.atrasadas(
                p.nome,
                atrasadas
                  .slice(0, 6)
                  .map((e) => e.nome)
                  .join(', '),
              )
            : p.nome,
        };
      })
      .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...linhas.map((l) => l.total));
    return linhas.map((l) => ({
      ...l,
      wOk: (l.noPrazo / max) * 100,
      wAtraso: (l.atrasadas / max) * 100,
    }));
  });

  protected readonly seguram = computed(() => {
    const max = Math.max(1, ...this.esperas().map((e) => e.media));
    return this.esperas().map((e) => ({
      ...e,
      nome: this.acesso.nomeSetor(e.setor_id),
      largura: (e.media / max) * 100,
    }));
  });

  protected readonly porSetor = computed(() => {
    const semanas = this.semanas();
    const linhas = this.setores().map((s) => {
      const vals = semanas.map(
        (w) =>
          this.entregas().filter((e) => e.setor_id === s && noIntervalo(e, w.de, w.ate)).length,
      );
      return {
        setor: this.acesso.nomeSetor(s),
        id: s,
        vals,
        total: vals.reduce((a, b) => a + b, 0),
      };
    });
    const max = Math.max(1, ...linhas.flatMap((l) => l.vals));
    return linhas.map((l) => ({
      ...l,
      celulas: l.vals.map((c) => {
        const pct = c ? 15 + Math.round((c / max) * 70) : 0;
        return {
          c,
          fundo: `color-mix(in srgb, var(--c1) ${pct}%, var(--surface))`,
          claro: pct > 55,
        };
      }),
    }));
  });
}
