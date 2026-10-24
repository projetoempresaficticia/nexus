import { diferencaDias, segundaDaSemana, somarDias, somarMeses } from '../../shared/utils/datas';

/** Uma entrega: item concluído × responsável (vw_produtividade). */
export interface Entrega {
  item_id: string;
  perfil_id: string;
  setor_id: string;
  nome: string;
  prazo: string | null;
  /** Dia da conclusão em Lisboa (AAAA-MM-DD). */
  concluido: string;
  dias_ciclo: number | null;
  no_prazo: boolean;
  dias_parado_total: number;
}

export type TipoPeriodo = '4s' | '12s' | 'mes' | 'mesant';

export interface Periodo {
  de: string;
  ate: string;
  /** Período anterior de mesmo tamanho, para comparar. */
  deAnt: string;
  ateAnt: string;
}

/** Mesmas regras do protótipo: últimas 4/12 semanas até hoje, este mês, mês passado. */
export function periodo(tipo: TipoPeriodo, hoje: string): Periodo {
  let de: string;
  let ate = hoje;
  if (tipo === '4s') de = somarDias(hoje, -27);
  else if (tipo === '12s') de = somarDias(hoje, -83);
  else if (tipo === 'mes') de = `${hoje.slice(0, 8)}01`;
  else {
    de = somarMeses(`${hoje.slice(0, 8)}01`, -1);
    ate = somarDias(`${hoje.slice(0, 8)}01`, -1);
  }
  const tamanho = diferencaDias(de, ate) + 1;
  return { de, ate, deAnt: somarDias(de, -tamanho), ateAnt: somarDias(de, -1) };
}

export function noIntervalo(e: Entrega, de: string, ate: string): boolean {
  return e.concluido >= de && e.concluido <= ate;
}

/** Uma linha por item (para a equipe toda, um item com 2 responsáveis conta uma vez). */
export function porItem(l: readonly Entrega[]): Entrega[] {
  const vistos = new Set<string>();
  return l.filter((e) => !vistos.has(e.item_id) && !!vistos.add(e.item_id));
}

const media = (l: number[]) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

/** Concluídos até o prazo ÷ concluídos (US-29), em %. Sem prazo conta como no prazo. */
export function pontualidade(l: readonly Entrega[]): number {
  return l.length ? (l.filter((e) => e.no_prazo).length / l.length) * 100 : 0;
}

/** Média de dias do início (ou criação) à conclusão. */
export function cicloMedio(l: readonly Entrega[]): number {
  return media(l.filter((e) => e.dias_ciclo !== null).map((e) => e.dias_ciclo!));
}

export function paradoMedio(l: readonly Entrega[]): number {
  return media(l.map((e) => e.dias_parado_total));
}

export interface Variacao {
  classe: 'good' | 'bad' | 'flat';
  /** ▲/▼ e percentual, ou texto quando não há base. */
  texto: string;
  comparavel: boolean;
}

/** Comparação com o período anterior; `melhorSobe` diz se subir é bom (entregas) ou ruim (ciclo). */
export function variacao(atual: number, anterior: number, melhorSobe: boolean): Variacao {
  if (!anterior && !atual) return { classe: 'flat', texto: 'semDados', comparavel: false };
  if (!anterior) return { classe: 'flat', texto: 'semBase', comparavel: false };
  const d = ((atual - anterior) / anterior) * 100;
  if (Math.abs(d) < 1) return { classe: 'flat', texto: 'igual', comparavel: false };
  const sobe = d > 0;
  return {
    classe: sobe === melhorSobe ? 'good' : 'bad',
    texto: `${sobe ? '▲' : '▼'} ${Math.abs(Math.round(d))}%`,
    comparavel: true,
  };
}

export interface Semana {
  de: string;
  ate: string;
}

/** Semanas (segunda a domingo) do período, no mínimo 4. */
export function semanasDo(p: Periodo): Semana[] {
  const saida: Semana[] = [];
  for (let s = segundaDaSemana(p.de); s <= p.ate; s = somarDias(s, 7)) {
    const fim = somarDias(s, 6);
    saida.push({ de: s, ate: fim > p.ate ? p.ate : fim });
  }
  while (saida.length < 4) {
    const de = somarDias(saida[0].de, -7);
    saida.unshift({ de, ate: somarDias(de, 6) });
  }
  return saida;
}

/** "3,5" — uma casa decimal com vírgula. */
export function decimal(n: number): string {
  return n.toFixed(1).replace('.', ',');
}
