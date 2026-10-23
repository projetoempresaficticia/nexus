// Desenvolvimento (npm start) → projeto Supabase de DESENVOLVIMENTO na nuvem: nexus-dev (Frankfurt).
// Só chave pública (publishable); a proteção dos dados é a RLS. Nunca coloque a secret aqui.
// Para usar o Supabase local (npm run db:start): supabaseUrl 'http://127.0.0.1:54321' e a chave de
// `npx supabase status`.
export const environment = {
  supabaseUrl: 'https://woroiluncnfscajlqoot.supabase.co',
  supabaseAnonKey: 'sb_publishable_EAKylOEwRPzaYAQSOM_yQw_P8fXoENm',
  appUrl: 'http://localhost:4200',
  // Login por e-mail/senha só em desenvolvimento (NAO_FAZER #7).
  loginComSenha: true,
};
