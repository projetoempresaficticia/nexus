-- T-56 · Além do domínio da empresa, só entra quem foi explicitamente aprovado (hoje: 1 conta externa)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

select ok(privado.email_permitido('ana@estudeemportugal.org'), 'domínio da empresa passa');
select ok(privado.email_permitido('ANA@ESTUDEEMPORTUGAL.ORG'), 'sem diferenciar maiúsculas');
select ok(privado.email_permitido('projetoempresaficticia@gmail.com'), 'conta externa aprovada passa');
select ok(not privado.email_permitido('outro@gmail.com'), 'gmail qualquer continua recusado');
select ok(not privado.email_permitido('ana@outraempresa.org'), 'outro domínio continua recusado');

select throws_ok($$insert into public.perfis (email, nome, iniciais) values ('x@gmail.com', 'X', 'XX')$$,
  '23514', null, 'perfis recusa e-mail não aprovado (mesma regra do hook)');
select lives_ok($$insert into public.perfis (id, email, nome, iniciais) values
  ('17100000-0000-0000-0000-000000000001', 'projetoempresaficticia@gmail.com', 'Conta Externa', 'CE')$$,
  'perfis aceita a conta externa aprovada');

select is(public.auth_hook_antes_criar_usuario('{"user":{"email":"projetoempresaficticia@gmail.com"}}'), '{}'::jsonb,
  'hook deixa a conta externa aprovada entrar, do mesmo jeito que o domínio da empresa');

select * from finish();
rollback;
