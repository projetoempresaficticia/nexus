-- T-57 · Corrige bug da T-56: o hook de login (`security invoker`, chamado pelo Supabase como
-- supabase_auth_admin) passou a chamar privado.email_permitido, mas esse papel nunca tinha USAGE no
-- schema privado (só tinha EXECUTE na função). Sem o USAGE, toda tentativa de login real falhava com
-- "permission denied for schema privado" (visto nos logs do Auth), mesmo a função estando correta —
-- SQL direto no SQL Editor não mostra esse erro porque roda como o dono (postgres).

grant usage on schema privado to supabase_auth_admin;
