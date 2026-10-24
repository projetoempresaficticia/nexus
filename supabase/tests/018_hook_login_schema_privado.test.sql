-- T-57 · O hook de login roda como supabase_auth_admin de verdade (não como o dono da função);
-- sem USAGE no schema privado, chamar privado.email_permitido de dentro do hook falhava só em
-- produção (SQL direto no editor, como postgres, não pegava esse bug — T-56 quebrou o login real).
-- SET ROLE supabase_auth_admin não é permitido neste banco de teste, então a prova aqui é de ACL
-- (as duas permissões que a chamada precisa); o comportamento de ponta a ponta foi confirmado à mão
-- no nexus-dev antes de abrir o PR desta correção (ver a migration e o PR da T-57).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000f57', 'ana57@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('18000000-0000-0000-0000-000000000001', null, 'ana57@estudeemportugal.org', 'Ana', 'AN');

select ok(has_schema_privilege('supabase_auth_admin', 'privado', 'USAGE'),
  'supabase_auth_admin tem USAGE no schema privado (faltava antes da T-57)');
select ok(has_function_privilege('supabase_auth_admin', 'privado.email_permitido(text)', 'execute'),
  'e EXECUTE na função que o hook chama');
select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"ana57@estudeemportugal.org"}}'), '{}'::jsonb,
  'o hook deixa a pessoa cadastrada e ativa entrar');

select * from finish();
rollback;
