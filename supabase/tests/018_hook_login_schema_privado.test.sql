-- T-57 · O hook de login roda como supabase_auth_admin de verdade (não como o dono da função);
-- sem USAGE no schema privado, chamar privado.email_permitido de dentro do hook falhava só em
-- produção (SQL direto no editor, como postgres, não pegava esse bug — T-56 quebrou o login real)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(3);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000f57', 'ana57@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('18000000-0000-0000-0000-000000000001', null, 'ana57@estudeemportugal.org', 'Ana', 'AN');

select ok(has_schema_privilege('supabase_auth_admin', 'privado', 'USAGE'),
  'supabase_auth_admin tem USAGE no schema privado');

set local role supabase_auth_admin;
select lives_ok($$select public.auth_hook_antes_criar_usuario('{"user":{"email":"ana57@estudeemportugal.org"}}')$$,
  'o hook, chamado como supabase_auth_admin (o papel real do Auth), não falha por permissão');
select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"ana57@estudeemportugal.org"}}'), '{}'::jsonb,
  'e deixa a pessoa cadastrada entrar');

select * from finish();
rollback;
