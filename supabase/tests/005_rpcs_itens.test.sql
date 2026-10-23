-- T-09 · RPCs de itens (US-07..US-14, US-34, US-35)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(29);

-- ---------------------------------------------------------------- dados
-- SA: Ana (líder), Bruno, Gabriela ; PED: Diogo
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'ana9@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000e2', 'bruno9@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000e3', 'gabriela9@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000e4', 'diogo9@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('14000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'ana9@estudeemportugal.org', 'Ana', 'AR'),
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e2', 'bruno9@estudeemportugal.org', 'Bruno', 'BC'),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e3', 'gabriela9@estudeemportugal.org', 'Gabriela', 'GL'),
  ('14000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000e4', 'diogo9@estudeemportugal.org', 'Diogo', 'DA');
insert into public.setores (id, nome, criado_por) values
  ('24000000-0000-0000-0000-0000000000aa', 'SA9', '14000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-0000000000bb', 'PED9', '14000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-0000000000aa', 'lider'),
  ('14000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-0000000000aa', 'membro'),
  ('14000000-0000-0000-0000-000000000003', '24000000-0000-0000-0000-0000000000aa', 'membro'),
  ('14000000-0000-0000-0000-000000000004', '24000000-0000-0000-0000-0000000000bb', 'membro');
-- Projeto P (de Ana, responsável Bruno)
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('34000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-0000000000aa', 0, 'P', '14000000-0000-0000-0000-000000000001');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('34000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000001');

select ok(not has_function_privilege('anon', 'public.criar_item(jsonb)', 'execute'), 'anon não chama RPCs');

-- ---------------------------------------------------------------- Bruno cria
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';

create temp table t_ids (nome text primary key, id uuid) on commit drop;
insert into t_ids select 'avulsa', (public.criar_item(
  '{"setor_id":"24000000-0000-0000-0000-0000000000aa","nivel":1,"nome":"Avulsa"}'::jsonb)).id;
select is((select pai_id from public.itens where id = (select id from t_ids where nome = 'avulsa')), null,
  'membro cria tarefa avulsa no seu setor');
select throws_ok($$select public.criar_item('{"setor_id":"24000000-0000-0000-0000-0000000000bb","nivel":0,"nome":"X"}')$$,
  'P0001', 'sem_permissao', 'membro não cria em setor sem vínculo');
select throws_ok($$select public.criar_item('{"nivel":1,"nome":"Sem setor"}')$$,
  'P0001', 'setor_obrigatorio', 'tarefa avulsa sem setor é recusada');
insert into t_ids select 'tarefa', (public.criar_item(
  '{"pai_id":"34000000-0000-0000-0000-000000000001","nivel":1,"nome":"Tarefa","responsaveis":["14000000-0000-0000-0000-000000000002"]}'::jsonb)).id;
select results_eq($$select nivel::int, setor_id from public.itens where id = (select id from t_ids where nome = 'tarefa')$$,
  $$values (1, '24000000-0000-0000-0000-0000000000aa'::uuid)$$, 'tarefa nasce com nível 1 e setor do projeto');
select throws_ok($$select public.criar_item('{"pai_id":"34000000-0000-0000-0000-000000000001","nivel":1,"nome":"Y",
  "responsaveis":["14000000-0000-0000-0000-000000000004"]}')$$,
  'P0001', 'responsavel_fora_do_setor', 'responsável sem vínculo no setor é recusado');
insert into t_ids select 'sub', (public.criar_item(jsonb_build_object(
  'pai_id', (select id from t_ids where nome = 'tarefa'), 'nivel', 2, 'nome', 'Sub'))).id;
select throws_ok(format($$select public.criar_item('{"pai_id":"%s","nivel":3,"nome":"Neto"}')$$, (select id from t_ids where nome = 'sub')),
  'P0001', 'nivel_invalido', 'subtarefa não tem filhos');

-- ---------------------------------------------------------------- responsáveis e notificações
select is(cardinality(public.definir_responsaveis((select id from t_ids where nome = 'tarefa'),
  array['14000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000003']::uuid[])), 2,
  'define dois responsáveis');
reset role;
select results_eq($$select destinatario_id from public.notificacoes
  where tipo = 'atribuicao' and item_id = (select id from t_ids where nome = 'tarefa')$$,
  array['14000000-0000-0000-0000-000000000003'::uuid], 'só quem entrou é notificado (não quem fez a ação)');
set local role authenticated;
select is(public.definir_responsaveis((select id from t_ids where nome = 'tarefa'),
  array['14000000-0000-0000-0000-000000000002']::uuid[]), array['14000000-0000-0000-0000-000000000002']::uuid[],
  'remover responsável');

-- ---------------------------------------------------------------- status
select throws_ok(format($$select public.mudar_status('%s', 'bloqueada')$$, (select id from t_ids where nome = 'tarefa')),
  'P0001', 'motivo_obrigatorio', 'bloquear sem motivo é recusado');
select throws_ok(format($$select public.mudar_status('%s', 'aguardando_aprovacao')$$, (select id from t_ids where nome = 'tarefa')),
  'P0001', 'aprovador_obrigatorio', 'aguardar aprovação sem aprovador é recusado');
select is(public.mudar_status((select id from t_ids where nome = 'tarefa'), 'bloqueada', '<p>falta x</p>') #>> '{item,status}',
  'bloqueada', 'bloqueia com motivo');
select isnt(public.mudar_status((select id from t_ids where nome = 'tarefa'), 'concluida') #>> '{item,concluido_em}', null,
  'concluir grava concluido_em');
select is(public.mudar_status((select id from t_ids where nome = 'tarefa'), 'a_fazer') #>> '{item,concluido_em}', null,
  'reabrir concluída para qualquer status limpa concluido_em');

-- ---------------------------------------------------------------- recorrência
insert into t_ids select 'rec', (public.criar_item(jsonb_build_object(
  'setor_id', '24000000-0000-0000-0000-0000000000aa', 'nivel', 1, 'nome', 'Semanal', 'recorrencia', 'semanal',
  'prazo', (current_date - 1)::text, 'responsaveis', jsonb_build_array('14000000-0000-0000-0000-000000000002')))).id;
insert into public.checklist_itens (item_id, texto, feito) values ((select id from t_ids where nome = 'rec'), 'passo', true);
insert into t_ids select 'rec2', ((public.mudar_status((select id from t_ids where nome = 'rec'), 'concluida')
  -> 'novo_item_recorrente') ->> 'id')::uuid;
select is((select prazo from public.itens where id = (select id from t_ids where nome = 'rec2')), current_date - 1 + 7,
  'próxima ocorrência semanal = prazo + 7 dias');
select is((select recorrencia from public.itens where id = (select id from t_ids where nome = 'rec')), null,
  'a concluída perde a recorrência');
select results_eq($$select feito from public.checklist_itens where item_id = (select id from t_ids where nome = 'rec2')$$,
  array[false], 'checklist copiada desmarcada');
select is((select cardinality(responsaveis) from public.vw_itens where id = (select id from t_ids where nome = 'rec2')), 1,
  'responsáveis copiados');
insert into t_ids select 'antiga', (public.criar_item(jsonb_build_object(
  'setor_id', '24000000-0000-0000-0000-0000000000aa', 'nivel', 1, 'nome', 'Antiga', 'recorrencia', 'semanal',
  'prazo', (current_date - 30)::text))).id;
select ok((select (public.mudar_status((select id from t_ids where nome = 'antiga'), 'concluida')
  #>> '{novo_item_recorrente,prazo}')::date between current_date and current_date + 6),
  'prazo muito no passado: próxima data é a primeira >= hoje');

-- ---------------------------------------------------------------- atualizar e mover
select is((public.atualizar_item((select id from t_ids where nome = 'tarefa'), '{"nome":"Tarefa renomeada"}')).nome,
  'Tarefa renomeada', 'responsável edita o título');
select is((public.atualizar_item((select id from t_ids where nome = 'avulsa'),
  '{"pai_id":"34000000-0000-0000-0000-000000000001"}')).pai_id, '34000000-0000-0000-0000-000000000001'::uuid,
  'tarefa avulsa movida para projeto do mesmo setor');
select throws_ok(format($$select public.atualizar_item('%s', '{"pai_id":"%s"}')$$,
  (select id from t_ids where nome = 'sub'), '34000000-0000-0000-0000-000000000001'),
  'P0001', 'nivel_invalido', 'só tarefa muda de projeto');
select is(public.contar_descendentes('34000000-0000-0000-0000-000000000001'), 3,
  'contar_descendentes conta tarefas e subtarefas');

-- ---------------------------------------------------------------- dependência
select public.definir_dependencia((select id from t_ids where nome = 'tarefa'), (select id from t_ids where nome = 'avulsa'), true);
select throws_ok(format($$select public.definir_dependencia('%s', '%s', true)$$,
  (select id from t_ids where nome = 'avulsa'), (select id from t_ids where nome = 'tarefa')),
  'P0001', 'ciclo_dependencia', 'dependência circular recusada');

-- ---------------------------------------------------------------- Diogo (outro setor) e exclusão
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e4","role":"authenticated"}';
select throws_ok(format($$select public.atualizar_item('%s', '{"nome":"x"}')$$, (select id from t_ids where nome = 'tarefa')),
  'P0001', 'sem_permissao', 'quem não pode editar recebe sem_permissao');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok(format($$select public.excluir_item('%s')$$, (select id from t_ids where nome = 'tarefa')),
  'P0001', 'sem_permissao', 'criador não exclui item com filhos');
select is((public.excluir_item((select id from t_ids where nome = 'sub')) ->> 'apagados')::int, 1,
  'criador exclui item sem filhos');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select is((public.excluir_item('34000000-0000-0000-0000-000000000001') ->> 'apagados')::int, 3,
  'líder exclui projeto em cascata (projeto + 2 tarefas)');
reset role;
select is_empty($$select 1 from public.itens where id = '34000000-0000-0000-0000-000000000001'
  or pai_id = '34000000-0000-0000-0000-000000000001'$$, 'nada sobra após a exclusão');

select * from finish();
rollback;
