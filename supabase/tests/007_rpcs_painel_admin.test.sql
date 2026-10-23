-- T-11 · carregar_inicial, painel, carga e administração (US-01, US-03..US-06, US-26, US-28)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(20);

-- ---------------------------------------------------------------- dados
-- R (raiz) > S (Lia líder, Mia membro) ; X (outra raiz). Adm = Rex. Ivo desativado.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a11', 'rex11@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000a12', 'lia11@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000a13', 'mia11@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000a14', 'ivo11@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin, ativo) values
  ('16000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000a11', 'rex11@estudeemportugal.org', 'Rex', 'RX', true, true),
  ('16000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000a12', 'lia11@estudeemportugal.org', 'Lia', 'LI', false, true),
  ('16000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000a13', 'mia11@estudeemportugal.org', 'Mia', 'MI', false, true),
  ('16000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000a14', 'ivo11@estudeemportugal.org', 'Ivo', 'IV', false, false);
insert into public.setores (id, nome, pai_id, criado_por) values
  ('26000000-0000-0000-0000-0000000000a0', 'R11', null, '16000000-0000-0000-0000-000000000001'),
  ('26000000-0000-0000-0000-0000000000c0', 'X11', null, '16000000-0000-0000-0000-000000000001');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('26000000-0000-0000-0000-0000000000a1', 'S11', '26000000-0000-0000-0000-0000000000a0', '16000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('16000000-0000-0000-0000-000000000002', '26000000-0000-0000-0000-0000000000a1', 'lider'),
  ('16000000-0000-0000-0000-000000000003', '26000000-0000-0000-0000-0000000000a1', 'membro'),
  ('16000000-0000-0000-0000-000000000004', '26000000-0000-0000-0000-0000000000a1', 'membro');
-- P > T1 (bloqueada, atrasada, resp Mia) ; T2 (aguardando Lia) ; T3 (concluída agora) ; T4 (aberta, prazo em 7 dias, resp Mia)
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('36000000-0000-0000-0000-000000000001', '26000000-0000-0000-0000-0000000000a1', 0, 'P', '16000000-0000-0000-0000-000000000002');
insert into public.itens (id, pai_id, nivel, nome, criado_por, status, motivo_bloqueio_html, aprovador_id, prazo) values
  ('36000000-0000-0000-0000-000000000002', '36000000-0000-0000-0000-000000000001', 1, 'T1', '16000000-0000-0000-0000-000000000002',
   'bloqueada', '<p>m</p>', null, current_date - 2),
  ('36000000-0000-0000-0000-000000000003', '36000000-0000-0000-0000-000000000001', 1, 'T2', '16000000-0000-0000-0000-000000000002',
   'aguardando_aprovacao', null, '16000000-0000-0000-0000-000000000002', null),
  ('36000000-0000-0000-0000-000000000004', '36000000-0000-0000-0000-000000000001', 1, 'T3', '16000000-0000-0000-0000-000000000002',
   'concluida', null, null, null),
  ('36000000-0000-0000-0000-000000000005', '36000000-0000-0000-0000-000000000001', 1, 'T4', '16000000-0000-0000-0000-000000000002',
   'a_fazer', null, null, current_date + 7);
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('36000000-0000-0000-0000-000000000002', '16000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000002'),
  ('36000000-0000-0000-0000-000000000005', '16000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000002'),
  ('36000000-0000-0000-0000-000000000005', '16000000-0000-0000-0000-000000000004', '16000000-0000-0000-0000-000000000002');

-- ---------------------------------------------------------------- carregar_inicial
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a13","role":"authenticated"}';
create temp table t_ini as select public.carregar_inicial() as j;
select is((select j #>> '{perfil,id}' from t_ini), '16000000-0000-0000-0000-000000000003', 'devolve o meu perfil');
select is((select (e ->> 'visivel')::boolean from t_ini, jsonb_array_elements(j -> 'setores') e
  where e ->> 'id' = '26000000-0000-0000-0000-0000000000a0'), false, 'setor ancestral vem como não visível (linha de decisão)');
select is((select count(*)::int from t_ini, jsonb_array_elements(j -> 'setores') e
  where e ->> 'id' = '26000000-0000-0000-0000-0000000000c0'), 0, 'setor sem relação não vem');
select is((select jsonb_array_length(j -> 'setores_administrados') from t_ini), 0, 'membro não administra setores');
select ok((select not exists (select 1 from jsonb_array_elements(j -> 'pessoas') e
  where e ->> 'id' = '16000000-0000-0000-0000-000000000004') from t_ini), 'pessoas desativadas não vêm');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a14","role":"authenticated"}';
select throws_ok('select public.carregar_inicial()', 'P0001', 'sem_permissao', 'perfil desativado recebe sem_permissao');

-- ---------------------------------------------------------------- painel e carga (Lia, líder de S)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a12","role":"authenticated"}';
create temp table t_pai as select public.resumo_painel(array['26000000-0000-0000-0000-0000000000a1']::uuid[]) as j;
select results_eq($$select (j->>'abertas')::int, (j->>'atrasadas')::int, (j->>'bloqueadas')::int,
  (j->>'aguardando')::int, (j->>'concluidas_mes')::int from t_pai$$,
  $$values (3, 1, 1, 1, 1)$$, 'KPIs do painel batem com a contagem de referência');
select is((select jsonb_array_length(j -> 'parados') from t_pai), 2, 'parados = bloqueadas + aguardando');
select throws_ok($$select public.resumo_painel(array['26000000-0000-0000-0000-0000000000c0']::uuid[])$$,
  'P0001', 'sem_permissao', 'líder não vê painel de setor que não administra');
select results_eq($$select perfil_id, qtd from public.carga_trabalho(array['26000000-0000-0000-0000-0000000000a1']::uuid[],
  current_date, current_date + 14) order by perfil_id$$,
  $$values ('16000000-0000-0000-0000-000000000003'::uuid, 1), ('16000000-0000-0000-0000-000000000004'::uuid, 1)$$,
  'carga conta itens abertos por responsável e semana');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a13","role":"authenticated"}';
select throws_ok($$select public.resumo_painel(array['26000000-0000-0000-0000-0000000000a1']::uuid[])$$,
  'P0001', 'sem_permissao', 'membro não tem painel');

-- ---------------------------------------------------------------- administração
select throws_ok($$select public.salvar_setor('{"nome":"Novo"}')$$, 'P0001', 'sem_permissao', 'membro não usa salvar_setor');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000a11","role":"authenticated"}';
select is((public.salvar_setor('{"nome":"Plataforma11","pai_id":"26000000-0000-0000-0000-0000000000a1"}')).pai_id,
  '26000000-0000-0000-0000-0000000000a1'::uuid, 'Adm cria setor com pai');
select throws_ok($$select public.salvar_setor('{"id":"26000000-0000-0000-0000-0000000000a0","pai_id":"26000000-0000-0000-0000-0000000000a1"}')$$,
  'P0001', 'ciclo_setor', 'mover setor para dentro de um filho dá ciclo_setor');
select is(jsonb_array_length(public.salvar_vinculos('16000000-0000-0000-0000-000000000003',
  '[{"setor_id":"26000000-0000-0000-0000-0000000000a1","papel":"lider"},{"setor_id":"26000000-0000-0000-0000-0000000000c0","papel":"membro"}]')),
  2, 'salvar_vinculos substitui a lista');
select is((select papel::text from public.vinculos where perfil_id = '16000000-0000-0000-0000-000000000003'
  and setor_id = '26000000-0000-0000-0000-0000000000a1'), 'lider', 'papel atualizado');
select is(jsonb_array_length(public.salvar_vinculos('16000000-0000-0000-0000-000000000003',
  '[{"setor_id":"26000000-0000-0000-0000-0000000000a1","papel":"membro"}]')), 1, 'vínculo removido sai da lista');
select is(public.reatribuir_itens('16000000-0000-0000-0000-000000000004', '16000000-0000-0000-0000-000000000003'), 1,
  'reatribui itens abertos da pessoa desativada');
select is((select array_agg(perfil_id) from public.item_responsaveis where item_id = '36000000-0000-0000-0000-000000000005'),
  array['16000000-0000-0000-0000-000000000003']::uuid[], 'sem duplicar quem já era responsável');
select throws_ok($$select public.reatribuir_itens('16000000-0000-0000-0000-000000000003', '16000000-0000-0000-0000-000000000004')$$,
  'P0001', 'nao_encontrado', 'não reatribui para pessoa desativada');

select * from finish();
rollback;
