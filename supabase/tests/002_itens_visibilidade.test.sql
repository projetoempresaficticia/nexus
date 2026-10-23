-- T-06 · Itens: regras de nível/setor, carimbos de status e "só o que me envolve" (US-07..12, US-34..36)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(32);

-- ---------------------------------------------------------------- pessoas e setores
-- SA = Sucesso do Aluno (sub-setor SA1); PED = Pedagógico
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'ana@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000b2', 'bruno@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000b3', 'gabriela@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000b4', 'diogo@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'ana@estudeemportugal.org', 'Ana', 'AR'),
  ('11000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b2', 'bruno@estudeemportugal.org', 'Bruno', 'BC'),
  ('11000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000b3', 'gabriela@estudeemportugal.org', 'Gabriela', 'GL'),
  ('11000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000b4', 'diogo@estudeemportugal.org', 'Diogo', 'DA');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('21000000-0000-0000-0000-0000000000aa', 'Sucesso do Aluno', null, '11000000-0000-0000-0000-000000000001'),
  ('21000000-0000-0000-0000-0000000000bb', 'Pedagógico', null, '11000000-0000-0000-0000-000000000001');
insert into public.setores (id, nome, pai_id, criado_por) values
  ('21000000-0000-0000-0000-0000000000a1', 'SA1', '21000000-0000-0000-0000-0000000000aa', '11000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000aa', 'lider'),
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000aa', 'membro'),
  ('11000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-0000000000aa', 'membro'),
  ('11000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-0000000000bb', 'membro');

-- ---------------------------------------------------------------- itens (como postgres)
-- P1 (resp Bruno) > T1 > S1        → Bruno vê tudo (descendentes do que é responsável)
-- P2 (resp Gabriela) > T3 (resp Bruno) > S3 ; P2 > T4 (aguarda aprovação de Diogo)
--                                   → Bruno vê T3, S3 e P2 (contexto), não T4; Diogo vê T4 e P2
-- P3 (resp Gabriela)                → Bruno não vê
-- AV tarefa avulsa criada por Bruno ; X projeto no sub-setor SA1
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-0000000000aa', null, 0, 'P1', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-0000000000aa', null, 0, 'P2', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-0000000000aa', null, 0, 'P3', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-0000000000aa', null, 1, 'AV', '11000000-0000-0000-0000-000000000002'),
  ('31000000-0000-0000-0000-00000000000a', '21000000-0000-0000-0000-0000000000a1', null, 0, 'X',  '11000000-0000-0000-0000-000000000001');
-- T1 recebe o setor errado de propósito: o trigger deve trocar pelo setor do pai
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('31000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-0000000000bb', '31000000-0000-0000-0000-000000000001', 1, 'T1', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000005', null, '31000000-0000-0000-0000-000000000004', 1, 'T3', '11000000-0000-0000-0000-000000000001');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por, status, aprovador_id) values
  ('31000000-0000-0000-0000-000000000007', null, '31000000-0000-0000-0000-000000000004', 1, 'T4', '11000000-0000-0000-0000-000000000001',
   'aguardando_aprovacao', '11000000-0000-0000-0000-000000000004');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('31000000-0000-0000-0000-000000000003', null, '31000000-0000-0000-0000-000000000002', 2, 'S1', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000006', null, '31000000-0000-0000-0000-000000000005', 2, 'S3', '11000000-0000-0000-0000-000000000001');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001');

-- ---------------------------------------------------------------- estrutura e privilégios
select ok((select relrowsecurity from pg_class where oid = 'public.itens'::regclass), 'RLS ligada em itens');
select ok(not has_table_privilege('authenticated', 'public.itens', 'insert'), 'itens só se criam por RPC');
select ok(not has_table_privilege('anon', 'public.itens', 'select'), 'anon não lê itens');

-- ---------------------------------------------------------------- regras de gravação
select is((select setor_id from public.itens where id = '31000000-0000-0000-0000-000000000002'),
  '21000000-0000-0000-0000-0000000000aa'::uuid, 'tarefa herda o setor do projeto');
select throws_ok($$insert into public.itens (setor_id, pai_id, nivel, nome, criado_por)
  values (null, '31000000-0000-0000-0000-000000000001', 2, 'nível errado', '11000000-0000-0000-0000-000000000001')$$,
  'P0001', 'nivel_invalido', 'filho de projeto tem de ser tarefa');
select throws_ok($$insert into public.itens (setor_id, pai_id, nivel, nome, criado_por)
  values (null, '31000000-0000-0000-0000-000000000003', 3, 'neto de subtarefa', '11000000-0000-0000-0000-000000000001')$$,
  'P0001', 'nivel_invalido', 'subtarefa não tem filhos');
select throws_ok($$insert into public.itens (setor_id, pai_id, nivel, nome, criado_por)
  values (null, '31000000-0000-0000-0000-000000000001', 0, 'projeto com pai', '11000000-0000-0000-0000-000000000001')$$,
  'P0001', 'nivel_invalido', 'projeto não tem pai');
select throws_ok($$insert into public.itens (setor_id, pai_id, nivel, nome, criado_por)
  values ('21000000-0000-0000-0000-0000000000aa', null, 2, 'subtarefa solta', '11000000-0000-0000-0000-000000000001')$$,
  'P0001', 'nivel_invalido', 'subtarefa precisa de tarefa');
select throws_ok($$update public.itens set status = 'bloqueada' where id = '31000000-0000-0000-0000-000000000009'$$,
  '23514', null, 'bloquear exige motivo');
select throws_ok($$update public.itens set status = 'aguardando_aprovacao' where id = '31000000-0000-0000-0000-000000000009'$$,
  '23514', null, 'aguardar aprovação exige aprovador');
select throws_ok($$update public.itens set inicio = '2026-11-10', prazo = '2026-11-01' where id = '31000000-0000-0000-0000-000000000009'$$,
  '23514', null, 'prazo não pode ser antes do início');
update public.itens set status = 'concluida' where id = '31000000-0000-0000-0000-000000000009';
select isnt((select concluido_em from public.itens where id = '31000000-0000-0000-0000-000000000009'), null, 'concluir grava concluido_em');
update public.itens set status = 'em_andamento' where id = '31000000-0000-0000-0000-000000000009';
select is((select concluido_em from public.itens where id = '31000000-0000-0000-0000-000000000009'), null, 'reabrir limpa concluido_em');
update public.itens set status = 'bloqueada', motivo_bloqueio_html = '<p>falta doc</p>' where id = '31000000-0000-0000-0000-000000000009';
select isnt((select parado_desde from public.itens where id = '31000000-0000-0000-0000-000000000009'), null, 'bloquear grava parado_desde');
update public.itens set status = 'a_fazer' where id = '31000000-0000-0000-0000-000000000009';
select is((select parado_desde from public.itens where id = '31000000-0000-0000-0000-000000000009'), null, 'desbloquear limpa parado_desde');
insert into public.dependencias (item_id, depende_de_id) values
  ('31000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000005');
select throws_ok($$insert into public.dependencias (item_id, depende_de_id)
  values ('31000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000002')$$,
  'P0001', 'ciclo_dependencia', 'dependência circular é recusada');

-- ---------------------------------------------------------------- Bruno (Membro de SA)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select set_eq('select id from public.itens', $$values
  ('31000000-0000-0000-0000-000000000001'::uuid), ('31000000-0000-0000-0000-000000000002'), ('31000000-0000-0000-0000-000000000003'),
  ('31000000-0000-0000-0000-000000000004'), ('31000000-0000-0000-0000-000000000005'), ('31000000-0000-0000-0000-000000000006'),
  ('31000000-0000-0000-0000-000000000009')$$,
  'Membro vê só o que o envolve, os descendentes e o caminho — não T4, P3 nem X');
select ok(privado.pode_editar_item('31000000-0000-0000-0000-000000000001'), 'responsável edita o item');
select ok(not privado.pode_editar_item('31000000-0000-0000-0000-000000000004'), 'item visto só como contexto não é editável');
select lives_ok($$insert into public.checklist_itens (item_id, texto) values ('31000000-0000-0000-0000-000000000005', 'passo')$$,
  'responsável adiciona passo de checklist');
select throws_ok($$insert into public.checklist_itens (item_id, texto) values ('31000000-0000-0000-0000-000000000004', 'passo')$$,
  '42501', null, 'não adiciona checklist em item de contexto');
select is_empty($$select 1 from public.item_responsaveis where item_id = '31000000-0000-0000-0000-000000000007'$$,
  'não vê responsáveis de item invisível');
select throws_ok($$insert into public.itens (setor_id, nivel, nome, criado_por)
  values ('21000000-0000-0000-0000-0000000000aa', 1, 'direto', '11000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'não cria item direto na tabela');
select throws_ok($$update public.itens set nome = 'x' where id = '31000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'não altera item direto na tabela');
select lives_ok($$insert into public.dependencias (item_id, depende_de_id)
  values ('31000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000001')$$,
  'cria dependência entre itens que vê');
select throws_ok($$insert into public.dependencias (item_id, depende_de_id)
  values ('31000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000008')$$,
  '42501', null, 'não cria dependência para item que não vê');

-- ---------------------------------------------------------------- Diogo (outro setor, aprovador)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b4","role":"authenticated"}';
select set_eq('select id from public.itens',
  $$values ('31000000-0000-0000-0000-000000000004'::uuid), ('31000000-0000-0000-0000-000000000007')$$,
  'aprovador de outro setor vê o item e o caminho, nada mais');

-- ---------------------------------------------------------------- Ana (Líder de SA)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
select results_eq('select count(*)::int from public.itens', array[10], 'Líder vê todos os itens do setor e sub-setores');
select ok(privado.pode_editar_item('31000000-0000-0000-0000-000000000007'), 'Líder edita qualquer item do setor');

-- ---------------------------------------------------------------- remover responsável tira a visão
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select ok(privado.pode_ver_item('31000000-0000-0000-0000-000000000008'), 'Gabriela vê P3 enquanto é responsável');
reset role;
delete from public.item_responsaveis
  where item_id = '31000000-0000-0000-0000-000000000008' and perfil_id = '11000000-0000-0000-0000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select ok(not privado.pode_ver_item('31000000-0000-0000-0000-000000000008'), 'retirada de responsável, deixa de ver P3');

-- ---------------------------------------------------------------- mover tarefa avulsa para projeto de outro setor
reset role;
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('31000000-0000-0000-0000-00000000000b', '21000000-0000-0000-0000-0000000000bb', null, 1, 'Avulsa PED', '11000000-0000-0000-0000-000000000004');
insert into public.itens (id, setor_id, pai_id, nivel, nome, criado_por) values
  ('31000000-0000-0000-0000-00000000000c', null, '31000000-0000-0000-0000-00000000000b', 2, 'Sub PED', '11000000-0000-0000-0000-000000000004');
update public.itens set pai_id = '31000000-0000-0000-0000-000000000001' where id = '31000000-0000-0000-0000-00000000000b';
select is((select setor_id from public.itens where id = '31000000-0000-0000-0000-00000000000c'),
  '21000000-0000-0000-0000-0000000000aa'::uuid, 'ao mover a tarefa para o projeto, as subtarefas acompanham o setor');

select * from finish();
rollback;
