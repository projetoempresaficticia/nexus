import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

/**
 * Cliente Supabase único da aplicação. Só os *.service.ts o injetam (`inject(SUPABASE)`);
 * componentes nunca falam com o Supabase direto (CLAUDE.md).
 * Usa apenas a chave pública (anon/publishable) — as permissões reais estão na RLS.
 */
export const SUPABASE = new InjectionToken<SupabaseClient>('SUPABASE', {
  providedIn: 'root',
  factory: () =>
    createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }),
});
