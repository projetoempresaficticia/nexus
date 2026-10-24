-- T-07 · Solicitações, mensagens, comentários, menções, anexos e Storage (US-15..US-20, US-36)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(24);

-- ---------------------------------------------------------------- dados
-- SA: Ana (líder), Bruno, Gabriela ; PED: Diogo, Eva
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'ana@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000c2', 'bruno@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000c3', 'gabriela@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000c4', 'diogo@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000c5', 'eva@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'ana@estudeemportugal.org', 'Ana', 'AR'),
  ('12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'bruno@estudeemportugal.org', 'Bruno', 'BC'),
  ('12000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c3', 'gabriela@estudeemportugal.org', 'Gabriela', 'GL'),
  ('12000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000c4', 'diogo@estudeemportugal.org', 'Diogo', 'DA'),
  ('12000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000c5', 'eva@estudeemportugal.org', 'Eva', 'EV');
insert into public.setores (id, nome, criado_por) values
  ('22000000-0000-0000-0000-0000000000aa', 'Sucesso do Aluno', '12000000-0000-0000-0000-000000000001'),
  ('22000000-0000-0000-0000-0000000000bb', 'Pedagógico', '12000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-0000000000aa', 'lider'),
  ('12000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-0000000000aa', 'membro'),
  ('12000000-0000-0000-0000-000000000003', '22000000-0000-0000-0000-0000000000aa', 'membro'),
  ('12000000-0000-0000-0000-000000000004', '22000000-0000-0000-0000-0000000000bb', 'membro'),
  ('12000000-0000-0000-0000-000000000005', '22000000-0000-0000-0000-0000000000bb', 'membro');
-- P > T (resp Gabriela). Gabriela pede uma ação a Diogo em T. Bruno e Eva sem envolvimento.
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-0000000000aa', null, 0, 'P', '12000000-0000-0000-0000-000000000001');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('32000000-0000-0000-0000-000000000002', null, '32000000-0000-0000-0000-000000000001', 1, 'T', '12000000-0000-0000-0000-000000000001');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('32000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000001');
insert into public.solicitacoes (id, item_id, de_id, para_id, tipo, texto_html) values
  ('42000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002',
   '12000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000004', 'acao', '<p>Enviar datas</p>');
insert into storage.objects (bucket_id, name, owner_id) values
  ('anexos', '22000000-0000-0000-0000-0000000000aa/32000000-0000-0000-0000-000000000002/arquivo.pdf', '00000000-0000-0000-0000-0000000000c3');

-- ---------------------------------------------------------------- estrutura e regras de dados
select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.solicitacoes'::regclass, 'public.solicitacao_mensagens'::regclass, 'public.comentarios'::regclass,
  'public.mencoes'::regclass, 'public.anexos'::regclass)), 'RLS ligada nas 5 tabelas');
select ok((select not public from storage.buckets where id = 'anexos'), 'bucket anexos é privado');
select throws_ok($$insert into public.solicitacoes (item_id, de_id, para_id, tipo, texto_html, status)
  values ('32000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003',
          '12000000-0000-0000-0000-000000000004', 'acao', '<p>x</p>', 'aprovada')$$,
  '23514', null, 'ação não pode ser "aprovada"');
select throws_ok($$insert into public.solicitacoes (item_id, de_id, para_id, tipo, texto_html)
  values ('32000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000003',
          '12000000-0000-0000-0000-000000000003', 'acao', '<p>x</p>')$$,
  '23514', null, 'não pede a si mesmo');
select throws_ok($$insert into public.anexos (item_id, nome, caminho, link_externo, enviado_por)
  values ('32000000-0000-0000-0000-000000000002', 'x', 'a/b/c', 'https://x', '12000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'anexo é arquivo OU link');
select throws_ok($$insert into public.anexos (item_id, nome, link_externo, enviado_por)
  values ('32000000-0000-0000-0000-000000000002', 'x', 'http://inseguro', '12000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'link externo só https');
select throws_ok($$insert into public.anexos (item_id, nome, caminho, tamanho_bytes, enviado_por)
  values ('32000000-0000-0000-0000-000000000002', 'x', 'a/b/c', 20971521, '12000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'anexo acima de 20 MB é recusado');

-- ---------------------------------------------------------------- Diogo (destinatário de outro setor)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}';
select set_eq('select id from public.itens',
  $$values ('32000000-0000-0000-0000-000000000001'::uuid), ('32000000-0000-0000-0000-000000000002')$$,
  'destinatário vê o item da solicitação e o caminho');
select results_eq('select count(*)::int from public.solicitacoes', array[1], 'destinatário vê a solicitação');
select lives_ok($$insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html)
  values ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000004', '<p>ok</p>')$$,
  'destinatário responde na conversa');
select throws_ok($$insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html)
  values ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', '<p>falso</p>')$$,
  '42501', null, 'não escreve mensagem em nome de outra pessoa');
select results_eq('select count(*)::int from storage.objects where bucket_id = ''anexos''', array[1],
  'destinatário vê o arquivo do item');

-- ---------------------------------------------------------------- Bruno (sem envolvimento)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select is_empty('select 1 from public.solicitacoes', 'sem envolvimento não vê a solicitação');
select throws_ok($$insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html)
  values ('42000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '<p>intruso</p>')$$,
  '42501', null, 'não escreve em solicitação que não vê');

-- ---------------------------------------------------------------- menção dá visibilidade
reset role;
insert into public.comentarios (id, item_id, autor_id, texto_html) values
  ('52000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000002',
   '12000000-0000-0000-0000-000000000003', '<p>@Bruno veja isto</p>');
insert into public.mencoes (comentario_id, perfil_id) values
  ('52000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated"}';
select ok(privado.pode_ver_item('32000000-0000-0000-0000-000000000002'), 'mencionado passa a ver o item');
select results_eq('select count(*)::int from public.comentarios', array[1], 'mencionado vê o comentário');
select lives_ok($$insert into public.anexos (item_id, nome, link_externo, enviado_por)
  values ('32000000-0000-0000-0000-000000000002', 'Drive', 'https://drive.google.com/x', '12000000-0000-0000-0000-000000000002')$$,
  'quem vê o item anexa link');
select throws_ok($$insert into public.anexos (item_id, nome, link_externo, enviado_por)
  values ('32000000-0000-0000-0000-000000000002', 'Drive', 'https://drive.google.com/y', '12000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'não anexa em nome de outra pessoa');
delete from public.comentarios where id = '52000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------- Eva (outro setor, sem envolvimento)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c5","role":"authenticated"}';
select is_empty('select 1 from public.anexos', 'sem envolvimento não vê anexos');
select is_empty('select 1 from storage.objects where bucket_id = ''anexos''', 'sem envolvimento não vê arquivos no Storage');

-- ---------------------------------------------------------------- apagar comentário
reset role;
select results_eq($$select count(*)::int from public.comentarios where id = '52000000-0000-0000-0000-000000000001'$$, array[1], 'não-autor não apaga comentário');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
delete from public.comentarios where id = '52000000-0000-0000-0000-000000000001';
reset role;
select results_eq($$select count(*)::int from public.comentarios where id = '52000000-0000-0000-0000-000000000001'$$, array[1], 'líder não apaga comentário de outra pessoa (T-45)');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
delete from public.comentarios where id = '52000000-0000-0000-0000-000000000001';
reset role;
select results_eq($$select count(*)::int from public.comentarios where id = '52000000-0000-0000-0000-000000000001'$$, array[0], 'autor apaga o próprio comentário');
select results_eq($$select count(*)::int from public.mencoes where comentario_id = '52000000-0000-0000-0000-000000000001'$$, array[0], 'menções vão junto com o comentário');

select * from finish();
rollback;
