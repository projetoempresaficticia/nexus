import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Database } from './models/database.types';

/**
 * Cliente Supabase único da aplicação. Só os *.service.ts o injetam (`inject(SUPABASE)`);
 * componentes nunca falam com o Supabase direto (CLAUDE.md).
 * Usa apenas a chave pública (anon/publishable) — as permissões reais estão na RLS.
 * Tipos gerados pelo CI a partir das migrations (core/models/database.types.ts).
 */
export const SUPABASE = new InjectionToken<SupabaseClient<Database>>('SUPABASE', {
  providedIn: 'root',
  factory: () =>
    createClient<Database>(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }),
});
