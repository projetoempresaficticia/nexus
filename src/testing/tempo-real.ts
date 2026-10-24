import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Linha = Record<string, unknown>;

/** Evento Postgres Changes como o Realtime entrega (DELETE: `old` só com a chave primária). */
export function mudanca(
  tipo: 'INSERT' | 'UPDATE' | 'DELETE',
  novo: Linha = {},
  antigo: Linha = {},
): RealtimePostgresChangesPayload<Linha> {
  return {
    schema: 'public',
    table: '',
    commit_timestamp: '2026-10-24T10:00:00Z',
    errors: [],
    eventType: tipo,
    new: novo,
    old: antigo,
  } as unknown as RealtimePostgresChangesPayload<Linha>;
}
