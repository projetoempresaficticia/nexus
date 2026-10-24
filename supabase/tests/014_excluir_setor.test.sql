-- T-51 · Excluir setor: só o Adm e só setor vazio
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(7);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ee0', 'adm51@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000ee1', 'ana51@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin) values
  ('1e000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000ee0', 'adm51@estudeemportugal.org', 'Adm', 'AD', true),
  ('1e000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000ee1', 'ana51@estudeemportugal.org', 'Ana', 'AR', false);
-- Pai > Filho (vazio) ; Com itens ; Com pessoa
insert into public.setores (id, nome, pai_id, criado_por) values
  ('2e000000-0000-0000-0000-0000000000aa', 'Pai51', null, '1e000000-0000-0000-0000-000000000000'),
  ('2e000000-0000-0000-0000-0000000000ab', 'Filho51', '2e000000-0000-0000-0000-0000000000aa', '1e000000-0000-0000-0000-000000000000'),
  ('2e000000-0000-0000-0000-0000000000bb', 'ComItens51', null, '1e000000-0000-0000-0000-000000000000'),
  ('2e000000-0000-0000-0000-0000000000cc', 'ComPessoa51', null, '1e000000-0000-0000-0000-000000000000');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1e000000-0000-0000-0000-000000000001', '2e000000-0000-0000-0000-0000000000cc', 'lider');
insert into public.itens (setor_id, nivel, nome, criado_por) values
  ('2e000000-0000-0000-0000-0000000000bb', 1, 'T', '1e000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ee1","role":"authenticated"}';
select throws_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000cc')$$,
  'P0001', 'sem_permissao', 'líder não exclui setor');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ee0","role":"authenticated"}';
select throws_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000aa')$$,
  'P0001', 'setor_com_subsetores', 'com subsetores não exclui');
select throws_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000bb')$$,
  'P0001', 'setor_com_itens', 'com itens não exclui');
select throws_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000cc')$$,
  'P0001', 'setor_com_pessoas', 'com pessoas não exclui (não apaga vínculos sem aviso)');
select lives_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000ab')$$, 'setor vazio é excluído');
select lives_ok($$select public.excluir_setor('2e000000-0000-0000-0000-0000000000aa')$$,
  'sem o filho, o pai vazio também sai');

reset role;
select is((select count(*)::int from public.vinculos where setor_id = '2e000000-0000-0000-0000-0000000000cc'), 1,
  'vínculo continua lá');

select * from finish();
rollback;
