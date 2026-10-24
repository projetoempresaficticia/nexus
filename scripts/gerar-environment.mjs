// Gera src/environments/environment.ts (produção) a partir de variáveis de ambiente do build
// (Cloudflare Pages → Settings → Environment variables). Só chaves PÚBLICAS:
//   SUPABASE_URL        https://<ref>.supabase.co
//   SUPABASE_ANON_KEY   chave publishable (sb_publishable_...) ou anon
//   APP_URL             endereço do site (ex.: https://nexus.pages.dev)
// Recusa a chave secreta do Supabase (sb_secret_... ou JWT com role service_role).
import { writeFileSync } from 'node:fs';

const { SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL } = process.env;

function falhar(mensagem) {
  console.error(`gerar-environment: ${mensagem}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !APP_URL) {
  falhar('defina SUPABASE_URL, SUPABASE_ANON_KEY e APP_URL nas variáveis do build.');
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL)) {
  falhar('SUPABASE_URL deve ser https://<ref>.supabase.co');
}
if (SUPABASE_ANON_KEY.startsWith('sb_secret_')) {
  falhar('SUPABASE_ANON_KEY é uma chave SECRETA. Use a publishable (sb_publishable_...).');
}
if (SUPABASE_ANON_KEY.startsWith('eyJ')) {
  const carga = SUPABASE_ANON_KEY.split('.')[1] ?? '';
  const json = Buffer.from(carga, 'base64url').toString('utf8');
  if (json.includes('"service_role"')) falhar('SUPABASE_ANON_KEY é a service_role. Use a anon/publishable.');
}

const texto = (v) => JSON.stringify(v.trim().replace(/\/$/, ''));
writeFileSync(
  'src/environments/environment.ts',
  `// Gerado no build por scripts/gerar-environment.mjs — não editar.
export const environment = {
  supabaseUrl: ${texto(SUPABASE_URL)},
  supabaseAnonKey: ${texto(SUPABASE_ANON_KEY)},
  appUrl: ${texto(APP_URL)},
  loginComSenha: false,
};
`,
);
console.log('gerar-environment: environment.ts de produção gerado (só chaves públicas).');
