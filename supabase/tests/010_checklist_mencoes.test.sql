-- T-47 · @menção nos passos do checklist (US-40)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(9);

-- SA: Ana (líder), Gabriela (responsável por T) ; PED: Diogo (sem envolvimento)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ab1', 'ana47@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000ab3', 'gabriela47@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000ab4', 'diogo47@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000ab1', 'ana47@estudeemportugal.org', 'Ana', 'AR'),
  ('1a000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000ab3', 'gabriela47@estudeemportugal.org', 'Gabriela', 'GL'),
  ('1a000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000ab4', 'diogo47@estudeemportugal.org', 'Diogo', 'DA');
insert into public.setores (id, nome, criado_por) values
  ('2a000000-0000-0000-0000-0000000000aa', 'SA47', '1a000000-0000-0000-0000-000000000001'),
  ('2a000000-0000-0000-0000-0000000000bb', 'PED47', '1a000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-0000000000aa', 'lider'),
  ('1a000000-0000-0000-0000-000000000003', '2a000000-0000-0000-0000-0000000000aa', 'membro'),
  ('1a000000-0000-0000-0000-000000000004', '2a000000-0000-0000-0000-0000000000bb', 'membro');
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('3a000000-0000-0000-0000-000000000001', '2a000000-0000-0000-0000-0000000000aa', 1, 'T', '1a000000-0000-0000-0000-000000000001');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('3a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000003', '1a000000-0000-0000-0000-000000000001');

select ok((select relrowsecurity from pg_class where oid = 'public.checklist_mencoes'::regclass),
  'RLS ligada em checklist_mencoes');

-- ---------------------------------------------------------------- Diogo ainda não vê
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ab4","role":"authenticated"}';
select ok(not privado.pode_ver_item('3a000000-0000-0000-0000-000000000001'), 'sem menção, Diogo não vê o item');

-- ---------------------------------------------------------------- Gabriela marca o Diogo num passo
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ab3","role":"authenticated"}';
insert into public.checklist_itens (id, item_id, texto) values ('4a000000-0000-0000-0000-000000000001',
  '3a000000-0000-0000-0000-000000000001',
  'Pedir a <span class="mention" data-uid="1a000000-0000-0000-0000-000000000004">@Diogo</span> as datas');
select throws_ok($$insert into public.checklist_mencoes (checklist_id, perfil_id) values
  ('4a000000-0000-0000-0000-000000000001', '1a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'ninguém grava menção direto');

reset role;
select is((select count(*)::int from public.checklist_mencoes where checklist_id = '4a000000-0000-0000-0000-000000000001'),
  1, 'menção gravada pelo trigger');
select is((select count(*)::int from public.notificacoes
           where destinatario_id = '1a000000-0000-0000-0000-000000000004' and tipo = 'mencao'), 1,
  'quem foi marcado é avisado');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ab4","role":"authenticated"}';
select ok(privado.pode_ver_item('3a000000-0000-0000-0000-000000000001'), 'marcado no passo passa a ver o item');
select is((select meu_envolvimento from public.vw_itens where id = '3a000000-0000-0000-0000-000000000001'),
  array['mencao'], 'envolvimento aparece como menção');

-- ---------------------------------------------------------------- editar o texto: tira a menção, sem novo aviso
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000ab3","role":"authenticated"}';
update public.checklist_itens set texto = 'Pedir as datas' where id = '4a000000-0000-0000-0000-000000000001';
reset role;
select is((select count(*)::int from public.checklist_mencoes where checklist_id = '4a000000-0000-0000-0000-000000000001'),
  0, 'tirar o @ do texto tira a menção');
select is((select count(*)::int from public.notificacoes
           where destinatario_id = '1a000000-0000-0000-0000-000000000004' and tipo = 'mencao'), 1,
  'editar não repete o aviso');

select * from finish();
rollback;
