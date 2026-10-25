-- T-59 · Central de notificações (sino): cada pessoa vê e marca como lida só as suas; preferência de
-- e-mail é só da própria pessoa (US-30)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f59', 'ana59@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000f60', 'bruno59@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000f59', 'ana59@estudeemportugal.org', 'Ana', 'AN'),
  ('19000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000f60', 'bruno59@estudeemportugal.org', 'Bruno', 'BR');
insert into public.notificacoes (id, tipo, destinatario_id, dados) values
  ('29000000-0000-0000-0000-000000000001', 'mencao', '19000000-0000-0000-0000-000000000001', '{"nome":"Tarefa X"}'),
  ('29000000-0000-0000-0000-000000000002', 'mencao', '19000000-0000-0000-0000-000000000002', '{"nome":"Tarefa Y"}');

select is(
  (select column_default from information_schema.columns
   where table_schema = 'public' and table_name = 'perfis' and column_name = 'notif_atribuicao'),
  'true', 'por padrão, recebe e-mail');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000f59","role":"authenticated"}';

select results_eq($$select id::text from public.notificacoes order by id$$,
  array['29000000-0000-0000-0000-000000000001'], 'Ana só vê a notificação dela');
select lives_ok($$update public.notificacoes set lido_em = now() where id = '29000000-0000-0000-0000-000000000001'$$,
  'Ana marca a própria notificação como lida');
select isnt((select lido_em from public.notificacoes where id = '29000000-0000-0000-0000-000000000001'), null,
  'lido_em ficou preenchido');
select throws_ok($$update public.notificacoes set tipo = 'comentario' where id = '29000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'não muda outra coluna da notificação');

update public.notificacoes set lido_em = now() where id = '29000000-0000-0000-0000-000000000002';
select is((select lido_em from public.notificacoes where id = '29000000-0000-0000-0000-000000000002'), null,
  'não marca a notificação de outra pessoa (RLS filtra a linha; 0 linhas afetadas)');

select lives_ok($$update public.perfis set notif_atribuicao = false where id = '19000000-0000-0000-0000-000000000001'$$,
  'Ana desliga a própria preferência de e-mail');
select is((select notif_atribuicao from public.perfis where id = '19000000-0000-0000-0000-000000000001'), false,
  'preferência ficou salva');
select throws_ok($$update public.perfis set nome = 'Outro Nome' where id = '19000000-0000-0000-0000-000000000001'$$,
  'P0001', 'sem_permissao', 'não muda o próprio nome por esse caminho (trigger barra)');

update public.perfis set notif_atribuicao = false where id = '19000000-0000-0000-0000-000000000002';
select is((select notif_atribuicao from public.perfis where id = '19000000-0000-0000-0000-000000000002'), true,
  'não muda a preferência de outra pessoa (RLS filtra a linha)');

select * from finish();
rollback;
