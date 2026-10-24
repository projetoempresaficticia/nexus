-- T-52 · Anexos no Drive: drive_id só pela Edge Function; linha apagada → arquivo na fila da lixeira
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(10);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f52', 'ana52@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('15200000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000f52', 'ana52@estudeemportugal.org', 'Ana', 'AR');
insert into public.setores (id, nome, criado_por) values
  ('25200000-0000-0000-0000-0000000000aa', 'Setor52', '15200000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('15200000-0000-0000-0000-000000000001', '25200000-0000-0000-0000-0000000000aa', 'lider');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('35200000-0000-0000-0000-000000000001', '25200000-0000-0000-0000-0000000000aa', null, 0, 'P52', '15200000-0000-0000-0000-000000000001');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('35200000-0000-0000-0000-000000000002', null, '35200000-0000-0000-0000-000000000001', 1, 'T52', '15200000-0000-0000-0000-000000000001');

select has_column('public', 'anexos', 'drive_id', 'anexos.drive_id existe');
select ok((select relrowsecurity from pg_class where oid = 'public.anexos_drive_lixeira'::regclass),
  'RLS ligada na fila da lixeira');
select throws_ok($$insert into public.anexos (item_id, nome, drive_id, enviado_por)
  values ('35200000-0000-0000-0000-000000000002', 'x', 'drv-sem-link', '15200000-0000-0000-0000-000000000001')$$,
  '23514', null, 'drive_id sem link é recusado');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000f52","role":"authenticated"}';

select throws_ok($$insert into public.anexos (item_id, nome, link_externo, drive_id, enviado_por)
  values ('35200000-0000-0000-0000-000000000002', 'x', 'https://drive.google.com/file/d/outro/view', 'outro',
          '15200000-0000-0000-0000-000000000001')$$,
  'P0001', 'sem_permissao', 'pessoa não grava drive_id (só a Edge Function)');
select lives_ok($$insert into public.anexos (id, item_id, nome, link_externo, enviado_por)
  values ('45200000-0000-0000-0000-000000000001', '35200000-0000-0000-0000-000000000002', 'a.pdf',
          'https://drive.google.com/file/d/drv1/view', '15200000-0000-0000-0000-000000000001')$$,
  'pessoa grava a linha com o link');
select throws_ok('select * from public.anexos_drive_lixeira', '42501', null,
  'pessoa não lê a fila da lixeira');

-- A Edge Function (service_role) completa o drive_id
reset role;
set local role service_role;
select lives_ok($$update public.anexos set drive_id = 'drv1' where id = '45200000-0000-0000-0000-000000000001'$$,
  'service_role grava drive_id');
reset role;
insert into public.anexos (item_id, nome, link_externo, drive_id, enviado_por)
  values ('35200000-0000-0000-0000-000000000002', 'b.pdf', 'https://drive.google.com/file/d/drv2/view', 'drv2',
          '15200000-0000-0000-0000-000000000001');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000f52","role":"authenticated"}';
select lives_ok($$delete from public.anexos where id = '45200000-0000-0000-0000-000000000001'$$,
  'quem enviou remove o anexo');

reset role;
select is((select count(*)::int from public.anexos_drive_lixeira where drive_id = 'drv1'), 1,
  'arquivo removido entra na fila da lixeira');
delete from public.itens where id = '35200000-0000-0000-0000-000000000002';
select is((select count(*)::int from public.anexos_drive_lixeira where drive_id = 'drv2'), 1,
  'excluir o item manda os arquivos dele para a fila');

select * from finish();
rollback;
