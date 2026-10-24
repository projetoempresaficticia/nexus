// Edge Function limpar-anexos (T-23): depois de excluir_item, apaga do Storage os arquivos dos anexos apagados.
// Segurança: exige usuário logado e só apaga caminhos que NÃO têm mais linha em public.anexos —
// assim ninguém consegue apagar arquivo de item que ainda existe.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { cors, json } from '../_shared/cors.ts';

const CAMINHO = /^[\w-]+\/[\w-]+\/[\w.-]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ erro: 'metodo_invalido' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: sessao } = await usuario.auth.getUser();
  if (!sessao.user) return json({ erro: 'sem_permissao' }, 401);

  const corpo = await req.json().catch(() => null);
  const caminhos: unknown = corpo?.caminhos;
  if (!Array.isArray(caminhos) || caminhos.length > 500) return json({ erro: 'pedido_invalido' }, 400);
  const validos = caminhos.filter((c): c is string => typeof c === 'string' && CAMINHO.test(c));
  if (!validos.length) return json({ apagados: 0 });

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: ainda, error } = await admin.from('anexos').select('caminho').in('caminho', validos);
  if (error) return json({ erro: 'rede' }, 500);
  const usados = new Set((ainda ?? []).map((a) => a.caminho));
  const apagar = validos.filter((c) => !usados.has(c));
  if (apagar.length) await admin.storage.from('anexos').remove(apagar);
  return json({ apagados: apagar.length });
});
