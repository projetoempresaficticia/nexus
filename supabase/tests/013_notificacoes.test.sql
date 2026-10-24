-- T-36 · Autor das notificações e lembrete diário (US-30)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000dd1', 'ana36@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000dd2', 'bruno36@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000dd3', 'carla36@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, ativo) values
  ('1d000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000dd1', 'ana36@estudeemportugal.org', 'Ana', 'AR', true),
  ('1d000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000dd2', 'bruno36@estudeemportugal.org', 'Bruno', 'BC', true),
  ('1d000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000dd3', 'carla36@estudeemportugal.org', 'Carla', 'CD', false);
insert into public.setores (id, nome, criado_por) values
  ('2d000000-0000-0000-0000-0000000000aa', 'SA36', '1d000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1d000000-0000-0000-0000-000000000001', '2d000000-0000-0000-0000-0000000000aa', 'lider'),
  ('1d000000-0000-0000-0000-000000000002', '2d000000-0000-0000-0000-0000000000aa', 'membro'),
  ('1d000000-0000-0000-0000-000000000003', '2d000000-0000-0000-0000-0000000000aa', 'membro');
insert into public.itens (id, setor_id, nivel, nome, criado_por, prazo, status) values
  ('3d000000-0000-0000-0000-000000000001', '2d000000-0000-0000-0000-0000000000aa', 1, 'Amanhã',
   '1d000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/Lisbon')::date + 1, 'em_andamento'),
  ('3d000000-0000-0000-0000-000000000002', '2d000000-0000-0000-0000-0000000000aa', 1, 'Depois',
   '1d000000-0000-0000-0000-000000000001', (now() at time zone 'Europe/Lisbon')::date + 2, 'a_fazer');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('3d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001'),
  ('3d000000-0000-0000-0000-000000000001', '1d000000-0000-0000-0000-000000000003', '1d000000-0000-0000-0000-000000000001'),
  ('3d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000002', '1d000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------- autor gravado na hora
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000dd1","role":"authenticated"}';
select public.salvar_comentario(null, '3d000000-0000-0000-0000-000000000001', '<p>oi</p>');
reset role;
select is((select autor_id from public.notificacoes where tipo = 'comentario'
           and destinatario_id = '1d000000-0000-0000-0000-000000000002'),
  '1d000000-0000-0000-0000-000000000001'::uuid, 'notificação guarda quem fez a ação');
select is((select count(*)::int from public.notificacoes where tipo = 'comentario'
           and destinatario_id = '1d000000-0000-0000-0000-000000000001'), 0,
  'ninguém é avisado da própria ação');

-- ---------------------------------------------------------------- lembrete diário
select is(privado.enfileirar_lembretes(), 1, 'um lembrete: só quem é ativo e só o que vence amanhã');
select is((select destinatario_id from public.notificacoes where tipo = 'lembrete_prazo'),
  '1d000000-0000-0000-0000-000000000002'::uuid, 'vai para o responsável');
select is(privado.enfileirar_lembretes(), 0, 'rodar de novo no mesmo dia não repete');

update public.itens set status = 'concluida' where id = '3d000000-0000-0000-0000-000000000001';
delete from public.notificacoes where tipo = 'lembrete_prazo';
select is(privado.enfileirar_lembretes(), 0, 'concluído não gera lembrete');

select * from finish();
rollback;
