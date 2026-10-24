-- T-35 · Histórico do item: status, prazo e responsável com de → para e autor (US-32)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000cc1', 'ana35@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000cc2', 'bruno35@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000cc5', 'eva35@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('1c000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000cc1', 'ana35@estudeemportugal.org', 'Ana', 'AR'),
  ('1c000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000cc2', 'bruno35@estudeemportugal.org', 'Bruno', 'BC'),
  ('1c000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000cc5', 'eva35@estudeemportugal.org', 'Eva', 'EV');
insert into public.setores (id, nome, criado_por) values
  ('2c000000-0000-0000-0000-0000000000aa', 'SA35', '1c000000-0000-0000-0000-000000000001'),
  ('2c000000-0000-0000-0000-0000000000bb', 'FIN35', '1c000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-0000000000aa', 'lider'),
  ('1c000000-0000-0000-0000-000000000002', '2c000000-0000-0000-0000-0000000000aa', 'membro'),
  ('1c000000-0000-0000-0000-000000000005', '2c000000-0000-0000-0000-0000000000bb', 'membro');
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('3c000000-0000-0000-0000-000000000001', '2c000000-0000-0000-0000-0000000000aa', 1, 'T', '1c000000-0000-0000-0000-000000000001');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000cc1","role":"authenticated"}';
select public.mudar_status('3c000000-0000-0000-0000-000000000001', 'em_andamento');
select public.atualizar_item('3c000000-0000-0000-0000-000000000001', '{"prazo":"2026-11-30"}');
select public.definir_responsaveis('3c000000-0000-0000-0000-000000000001',
  array['1c000000-0000-0000-0000-000000000002']::uuid[]);
select public.definir_responsaveis('3c000000-0000-0000-0000-000000000001', array[]::uuid[]);

select results_eq($$select valor_antes, valor_depois from public.historico
  where registro_id = '3c000000-0000-0000-0000-000000000001' and campo = 'status'$$,
  $$values ('a_fazer', 'em_andamento')$$, 'status de → para');
select results_eq($$select valor_antes, valor_depois from public.historico
  where registro_id = '3c000000-0000-0000-0000-000000000001' and campo = 'prazo'$$,
  $$values (null::text, '2026-11-30')$$, 'prazo de → para');
select results_eq($$select valor_antes, valor_depois from public.historico
  where registro_id = '3c000000-0000-0000-0000-000000000001' and campo = 'responsaveis' order by id$$,
  $$values (null::text, '1c000000-0000-0000-0000-000000000002'), ('1c000000-0000-0000-0000-000000000002', null)$$,
  'responsável que entra e que sai');
select is((select count(distinct perfil_id)::int from public.historico
           where registro_id = '3c000000-0000-0000-0000-000000000001' and acao = 'update'), 1,
  'autor registrado');

-- quem não vê o item não vê o histórico
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000cc5","role":"authenticated"}';
select is_empty($$select 1 from public.historico where registro_id = '3c000000-0000-0000-0000-000000000001'$$,
  'outro setor não vê o histórico');

-- item apagado: os responsáveis saem em cascata sem gravar uma linha por pessoa
reset role;
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('3c000000-0000-0000-0000-000000000001', '1c000000-0000-0000-0000-000000000002', '1c000000-0000-0000-0000-000000000001');
delete from public.itens where id = '3c000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.historico
           where registro_id = '3c000000-0000-0000-0000-000000000001' and campo = 'responsaveis'
             and valor_antes is not null and valor_depois is null), 1,
  'exclusão do item não registra cada responsável');

select * from finish();
rollback;
