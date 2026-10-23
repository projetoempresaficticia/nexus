-- T-08 · Histórico, notificações, vw_itens, vw_produtividade e tempo real (US-30, US-32, US-37)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(16);

-- ---------------------------------------------------------------- dados
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'lia@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000d2', 'rui@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000d3', 'teo@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('13000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1', 'lia@estudeemportugal.org', 'Lia', 'LI'),
  ('13000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000d2', 'rui@estudeemportugal.org', 'Rui', 'RU'),
  ('13000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000d3', 'teo@estudeemportugal.org', 'Teo', 'TE');
insert into public.setores (id, nome, criado_por) values
  ('23000000-0000-0000-0000-0000000000aa', 'Setor T08', '13000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('13000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-0000000000aa', 'lider'),
  ('13000000-0000-0000-0000-000000000002', '23000000-0000-0000-0000-0000000000aa', 'membro'),
  ('13000000-0000-0000-0000-000000000003', '23000000-0000-0000-0000-0000000000aa', 'membro');
-- P > T (resp Rui e Teo) > S ; P2 (sem Rui)
insert into public.itens (id, setor_id, nivel, nome, criado_por, prazo) values
  ('33000000-0000-0000-0000-000000000001', '23000000-0000-0000-0000-0000000000aa', 0, 'P', '13000000-0000-0000-0000-000000000001', null),
  ('33000000-0000-0000-0000-000000000004', '23000000-0000-0000-0000-0000000000aa', 0, 'P2', '13000000-0000-0000-0000-000000000001', null);
insert into public.itens (id, pai_id, nivel, nome, criado_por, prazo) values
  ('33000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000001', 1, 'T', '13000000-0000-0000-0000-000000000001', '2020-01-01');
insert into public.itens (id, pai_id, nivel, nome, criado_por) values
  ('33000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000002', 2, 'S', '13000000-0000-0000-0000-000000000001');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('33000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000001'),
  ('33000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', '13000000-0000-0000-0000-000000000001');

-- Lia renomeia T (como postgres, mas com a sessão de Lia → autor registado)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
update public.itens set nome = 'T renomeada' where id = '33000000-0000-0000-0000-000000000002';
reset request.jwt.claims;

-- ---------------------------------------------------------------- histórico
select results_eq($$select acao from public.historico where registro_id = '33000000-0000-0000-0000-000000000002' and acao = 'insert'$$,
  array['insert'], 'criar item fica no histórico');
select results_eq($$select valor_antes || ' → ' || valor_depois from public.historico
  where registro_id = '33000000-0000-0000-0000-000000000002' and campo = 'nome'$$,
  array['T → T renomeada'], 'mudança de campo guarda antes e depois');
select results_eq($$select perfil_id from public.historico
  where registro_id = '33000000-0000-0000-0000-000000000002' and campo = 'nome'$$,
  array['13000000-0000-0000-0000-000000000001'::uuid], 'histórico guarda quem fez');
select is_empty($$select 1 from public.historico where registro_id = '33000000-0000-0000-0000-000000000002' and campo = 'atualizado_em'$$,
  'atualizado_em não polui o histórico');

-- ---------------------------------------------------------------- notificações e realtime
select ok(not has_table_privilege('authenticated', 'public.notificacoes', 'select'), 'app não lê a fila de notificações');
select ok((select bool_and(exists (select 1 from pg_publication_tables p
  where p.pubname = 'supabase_realtime' and p.schemaname = 'public' and p.tablename = t))
  from unnest(array['itens','item_responsaveis','checklist_itens','dependencias','solicitacoes',
                    'solicitacao_mensagens','comentarios','anexos']) as t), 'as 8 tabelas estão no Realtime');
select ok((select relreplident = 'f' from pg_class where oid = 'public.itens'::regclass), 'itens com replica identity full');

-- ---------------------------------------------------------------- vw_itens como Rui (responsável de T)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select set_eq($$select id from public.vw_itens where setor_id = '23000000-0000-0000-0000-0000000000aa'$$,
  $$values ('33000000-0000-0000-0000-000000000001'::uuid), ('33000000-0000-0000-0000-000000000002'), ('33000000-0000-0000-0000-000000000003')$$,
  'vw_itens respeita a RLS (não mostra P2)');
select is((select meu_envolvimento from public.vw_itens where id = '33000000-0000-0000-0000-000000000002'),
  array['responsavel'], 'envolvimento de responsável');
select is((select meu_envolvimento from public.vw_itens where id = '33000000-0000-0000-0000-000000000001'),
  array['contexto'], 'projeto aparece como contexto');
select is((select meu_envolvimento from public.vw_itens where id = '33000000-0000-0000-0000-000000000003'),
  '{}'::text[], 'subtarefa da minha tarefa: visível, sem envolvimento direto');
select results_eq($$select cardinality(responsaveis) from public.vw_itens where id = '33000000-0000-0000-0000-000000000002'$$,
  array[2], 'vários responsáveis em responsaveis[]');
select results_eq($$select projeto_id from public.vw_itens where id = '33000000-0000-0000-0000-000000000003'$$,
  array['33000000-0000-0000-0000-000000000001'::uuid], 'subtarefa sabe o seu projeto');
select results_eq($$select atrasado from public.vw_itens where id = '33000000-0000-0000-0000-000000000002'$$,
  array[true], 'prazo vencido e aberto = atrasado');
select is_empty($$select 1 from public.historico where registro_id = '33000000-0000-0000-0000-000000000004'$$,
  'não vê histórico de item que não vê');

-- ---------------------------------------------------------------- vw_produtividade
reset role;
update public.itens set status = 'concluida' where id = '33000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select results_eq($$select count(*)::int from public.vw_produtividade where item_id = '33000000-0000-0000-0000-000000000002'$$,
  array[2], 'item concluído conta para cada responsável');

select * from finish();
rollback;
