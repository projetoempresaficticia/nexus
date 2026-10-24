// Datas do Nexus: prazos/início são texto AAAA-MM-DD (tipo date no banco) e "hoje" é sempre em Lisboa.
// Nunca usar new Date('AAAA-MM-DD') sem fixar o fuso (ERROS_CONHECIDOS — bug de datas do v26).

const FUSO = 'Europe/Lisbon';

/** Hoje em Lisboa, AAAA-MM-DD. */
export function hojeIso(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}

/** Milissegundos de um timestamptz da API ou do Realtime (aceita "2026-10-24 01:00:00.5+00"). */
export function instante(ts: string): number {
  return Date.parse(ts.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00'));
}

/** Soma dias a uma data AAAA-MM-DD (aritmética em UTC, sem efeito de horário de verão). */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function diferencaDias(de: string, ate: string): number {
  const ms = (iso: string) => {
    const [a, m, d] = iso.split('-').map(Number);
    return Date.UTC(a, m - 1, d);
  };
  return Math.round((ms(ate) - ms(de)) / 86_400_000);
}

/** "02/11" — prazo curto das listas. */
export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** "02/11/2026". */
export function dataLonga(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/** Data e hora de um evento (timestamptz) em Lisboa: "23/10/2026 14:05". */
export function dataHora(instante: string | null | undefined): string {
  if (!instante) return '';
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(instante))
    .replace(',', '');
}

/** Segunda-feira da semana da data. */
export function segundaDaSemana(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return somarDias(iso, -((dia + 6) % 7));
}
