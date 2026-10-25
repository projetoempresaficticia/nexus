import { Session } from '@supabase/supabase-js';

/** Supabase falso para testes de unidade: só o que os serviços usam, com vi.fn() para verificar chamadas. */
export function supabaseFalso(sessao: Partial<Session> | null = null) {
  const canal = canalFalso();
  return {
    canal,
    channel: vi.fn(() => canal),
    removeChannel: vi.fn().mockResolvedValue('ok'),
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
    // Só para quem não testa a tabela em si (ex.: o sino de notificações montado junto do shell):
    // qualquer encadeamento resolve numa lista vazia. Um teste que precise de dados de verdade
    // sobrepõe `from` no seu próprio provider (ver anexos-item.spec.ts).
    from: vi.fn(() => tabelaVazia()),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn().mockResolvedValue({ data: { session: sessao } }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

/** Encadeamento de consulta que aceita qualquer método e resolve numa lista vazia. */
function tabelaVazia() {
  const resultado = Promise.resolve({ data: [], error: null });
  const builder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    update: () => builder,
    maybeSingle: () => resultado,
    single: () => resultado,
    then: resultado.then.bind(resultado),
    catch: resultado.catch.bind(resultado),
  };
  return builder;
}

/** Canal de tempo real falso: guarda as tabelas assinadas e deixa o teste mudar o status. */
function canalFalso() {
  const canal = {
    tabelas: [] as string[],
    // substituído pelo callback do subscribe()
    status: (() => undefined) as (s: string) => void,
    on: vi.fn((_tipo: string, filtro: { table: string }) => {
      canal.tabelas.push(filtro.table);
      return canal;
    }),
    subscribe: vi.fn((cb: (s: string) => void) => {
      canal.status = cb;
      return canal;
    }),
  };
  return canal;
}
