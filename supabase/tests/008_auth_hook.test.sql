-- T-12 · Hook antes de criar usuário e ligação do perfil (US-01, US-02)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

insert into public.perfis (id, email, nome, iniciais, ativo) values
  ('17000000-0000-0000-0000-000000000001', 'Nova.Pessoa@estudeemportugal.org', 'Nova Pessoa', 'NP', true),
  ('17000000-0000-0000-0000-000000000002', 'saiu12@estudeemportugal.org', 'Saiu', 'SA', false);

select ok(has_function_privilege('supabase_auth_admin', 'public.auth_hook_antes_criar_usuario(jsonb)', 'execute'),
  'Auth consegue chamar o hook');
select ok(not has_function_privilege('authenticated', 'public.auth_hook_antes_criar_usuario(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.auth_hook_antes_criar_usuario(jsonb)', 'execute'),
  'hook fora da API');

select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"nova.pessoa@estudeemportugal.org"}}'), '{}'::jsonb,
  'perfil ativo cadastrado entra (sem diferenciar maiúsculas)');
select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"desconhecido@estudeemportugal.org"}}') #>> '{error,message}',
  'acesso_nao_autorizado', 'e-mail sem perfil é recusado');
select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"saiu12@estudeemportugal.org"}}') #>> '{error,message}',
  'acesso_nao_autorizado', 'perfil desativado é recusado');
select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"nova.pessoa@gmail.com"}}') #>> '{error,message}',
  'acesso_nao_autorizado', 'outro domínio é recusado');
select is((public.auth_hook_antes_criar_usuario('{"user":{"email":"x@gmail.com"}}') #>> '{error,http_code}')::int, 403,
  'recusa com HTTP 403');

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000c12', 'nova.pessoa@estudeemportugal.org');
select is((select auth_id from public.perfis where id = '17000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-000000000c12'::uuid, 'primeiro login liga a conta ao perfil');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000c12","role":"authenticated"}';
select is(privado.meu_perfil_id(), '17000000-0000-0000-0000-000000000001'::uuid, 'depois de ligado, meu_perfil_id funciona');

select * from finish();
rollback;
