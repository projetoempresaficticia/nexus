-- T-05 · RLS de perfis, setores e vínculos (SEGURANCA.md §2–§4; US-02, US-05)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(24);

-- ---------------------------------------------------------------- dados
-- Árvore: A > A1 > A1a ; B (raiz)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'adm@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000a2', 'lider.a@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000a3', 'membro.a1@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000a4', 'membro.b@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000a5', 'inativo@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000a6', 'sem.perfil@estudeemportugal.org');

insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin, ativo) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'adm@estudeemportugal.org', 'Adm', 'AD', true, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a2', 'lider.a@estudeemportugal.org', 'Líder A', 'LA', false, true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a3', 'membro.a1@estudeemportugal.org', 'Membro A1', 'MA', false, true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a4', 'membro.b@estudeemportugal.org', 'Membro B', 'MB', false, true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000a5', 'inativo@estudeemportugal.org', 'Inativo', 'IN', false, false);

insert into public.setores (id, nome, pai_id, criado_por) values
  ('20000000-0000-0000-0000-00000000000a', 'A', null, '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-00000000000b', 'B', null, '10000000-0000-0000-0000-000000000001');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('20000000-0000-0000-0000-0000000000a1', 'A1', '20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('20000000-0000-0000-0000-000000000a1a', 'A1a', '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000001');

insert into public.vinculos (perfil_id, setor_id, papel) values
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-00000000000a', 'lider'),
  ('10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-0000000000a1', 'membro'),
  ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000000b', 'membro'),
  ('10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-00000000000a', 'membro');

-- ---------------------------------------------------------------- estrutura e privilégios
select ok((select relrowsecurity from pg_class where oid = 'public.perfis'::regclass), 'RLS ligada em perfis');
select ok((select relrowsecurity from pg_class where oid = 'public.setores'::regclass), 'RLS ligada em setores');
select ok((select relrowsecurity from pg_class where oid = 'public.vinculos'::regclass), 'RLS ligada em vinculos');
select ok(not has_table_privilege('anon', 'public.perfis', 'select'), 'anon não lê perfis');
select ok(not has_function_privilege('anon', 'privado.setores_descendentes(uuid)', 'execute'), 'anon não executa funções privadas');
select throws_ok(
  $$insert into public.perfis (email, nome, iniciais) values ('alguem@gmail.com', 'Fora', 'FO')$$,
  '23514', null, 'e-mail fora de @estudeemportugal.org é recusado');

-- ---------------------------------------------------------------- Adm
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
select results_eq('select count(*)::int from public.setores', array[4], 'Adm vê todos os setores');
select lives_ok(
  $$insert into public.vinculos (perfil_id, setor_id, papel)
    values ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-0000000000a1', 'membro')$$,
  'Adm cria vínculo');
select throws_ok(
  $$update public.setores set pai_id = '20000000-0000-0000-0000-000000000a1a'
    where id = '20000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'setor não pode ficar abaixo de um sub-setor seu (ciclo)');

-- ---------------------------------------------------------------- Líder de A
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';
select set_eq('select id from public.setores',
  $$values ('20000000-0000-0000-0000-00000000000a'::uuid), ('20000000-0000-0000-0000-0000000000a1'),
           ('20000000-0000-0000-0000-000000000a1a')$$,
  'Líder vê o seu setor e todos os sub-setores, não B');
select ok(privado.administra_setor('20000000-0000-0000-0000-000000000a1a'), 'Líder administra sub-setor de 2.º nível');
select ok(not privado.administra_setor('20000000-0000-0000-0000-00000000000b'), 'Líder não administra B');
select lives_ok(
  $$insert into public.setores (nome, pai_id, criado_por)
    values ('Novo em A1', '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000002')$$,
  'Líder cria sub-setor abaixo do seu setor');
select throws_ok(
  $$insert into public.setores (nome, pai_id, criado_por)
    values ('Raiz nova', null, '10000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'Líder não cria setor na raiz');
select throws_ok(
  $$insert into public.setores (nome, pai_id, criado_por)
    values ('Em B', '20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'Líder não cria sub-setor fora do que administra');
select throws_ok(
  $$insert into public.vinculos (perfil_id, setor_id, papel)
    values ('10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000000a', 'membro')$$,
  '42501', null, 'Líder não gere vínculos (só Adm)');
update public.setores set pai_id = '20000000-0000-0000-0000-00000000000b'
  where id = '20000000-0000-0000-0000-0000000000a1';

-- ---------------------------------------------------------------- Membro de A1
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}';
select set_eq('select id from public.setores', array['20000000-0000-0000-0000-0000000000a1'::uuid],
  'Membro vê só o setor em que tem vínculo');
select results_eq('select count(*)::int from public.perfis', array[4], 'Membro vê só as pessoas ativas');
select throws_ok(
  $$insert into public.setores (nome, pai_id, criado_por)
    values ('X', '20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'Membro não cria setor');
update public.perfis set nome = 'Hackeado' where id = '10000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------- Inativo e sem perfil
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a5","role":"authenticated"}';
select is_empty('select 1 from public.setores', 'Perfil desativado não vê setores');
select is_empty('select 1 from public.perfis', 'Perfil desativado não vê pessoas');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}';
select is_empty('select 1 from public.setores', 'Conta sem perfil não vê nada');

-- ---------------------------------------------------------------- efeitos (como postgres)
reset role;
select results_eq(
  $$select pai_id from public.setores where id = '20000000-0000-0000-0000-0000000000a1'$$,
  array['20000000-0000-0000-0000-00000000000a'::uuid], 'Líder não consegue mover setor (update ignorado)');
select results_eq(
  $$select nome from public.perfis where id = '10000000-0000-0000-0000-000000000002'$$,
  array['Líder A'], 'Membro não altera perfil de outra pessoa');

select * from finish();
rollback;
