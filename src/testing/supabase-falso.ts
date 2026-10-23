import { Session } from '@supabase/supabase-js';

/** Supabase falso para testes de unidade: só o que os serviços usam, com vi.fn() para verificar chamadas. */
export function supabaseFalso(sessao: Partial<Session> | null = null) {
  return {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: sessao } }),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}
