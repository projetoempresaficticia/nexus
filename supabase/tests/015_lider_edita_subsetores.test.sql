-- T-51b · Líder renomeia, move, desativa e exclui só os subsetores abaixo dele
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ff0', 'adm51b@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000ff1', 'lider51b@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin) values
  ('1f000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000ff0', 'adm51b@estudeemportugal.org', 'Adm', 'AD', true),
  ('1f000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000ff1', 'lider51b@estudeemportugal.org', 'Lia', 'LI', false);
-- Topo > Ped (líder: Lia) > A, B ; A > A1 ; Fora (outro ramo)
insert into public.setores (id, nome, pai_id, criado_por) values
  ('2f000000-0000-0000-0000-000000000000', 'Topo51b', null, '1f000000-0000-0000-0000-000000000000');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('2f000000-0000-0000-0000-0000000000aa', 'Ped51b', '2f000000-0000-0000-0000-000000000000', '1f000000-0000-0000-0000-000000000000'),
  ('2f000000-0000-0000-0000-0000000000ff', 'Fora51b', '2f000000-0000-0000-0000-000000000000', '1f000000-0000-0000-0000-000000000000');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('2f000000-0000-0000-0000-0000000000a1', 'A51b', '2f000000-0000-0000-0000-0000000000aa', '1f000000-0000-0000-0000-000000000000'),
  ('2f000000-0000-0000-0000-0000000000b1', 'B51b', '2f000000-0000-0000-0000-0000000000aa', '1f000000-0000-0000-0000-000000000000');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('2f000000-0000-0000-0000-0000000000a2', 'A1-51b', '2f000000-0000-0000-0000-0000000000a1', '1f000000-0000-0000-0000-000000000000');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1f000000-0000-0000-0000-000000000001', '2f000000-0000-0000-0000-0000000000aa', 'lider');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ff1","role":"authenticated"}';

select lives_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000a1","nome":"A renomeado"}')$$,
  'líder renomeia subsetor abaixo dele');
select lives_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000a2","pai_id":"2f000000-0000-0000-0000-0000000000b1"}')$$,
  'líder move um subsetor para outro abaixo dele');
select throws_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000a1","pai_id":"2f000000-0000-0000-0000-0000000000ff"}')$$,
  'P0001', 'sem_permissao', 'não move para fora do que administra');
select throws_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000a1","pai_id":""}')$$,
  'P0001', 'sem_permissao', 'não transforma em setor principal');
select throws_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000aa","nome":"Meu"}')$$,
  'P0001', 'sem_permissao', 'não mexe no próprio setor que lidera');
select throws_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000ff","nome":"X"}')$$,
  'P0001', 'sem_permissao', 'não mexe em setor de outro ramo');
select lives_ok($$select public.salvar_setor('{"id":"2f000000-0000-0000-0000-0000000000b1","ativo":false}')$$,
  'líder desativa subsetor abaixo dele');
select lives_ok($$select public.excluir_setor('2f000000-0000-0000-0000-0000000000a1')$$,
  'líder exclui subsetor vazio abaixo dele');
select throws_ok($$select public.excluir_setor('2f000000-0000-0000-0000-0000000000aa')$$,
  'P0001', 'sem_permissao', 'não exclui o próprio setor');

select * from finish();
rollback;
