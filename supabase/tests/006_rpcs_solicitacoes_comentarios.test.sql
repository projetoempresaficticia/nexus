-- T-10 · RPCs de solicitações e comentários (US-15, US-16, US-18, US-19)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(25);

-- ---------------------------------------------------------------- dados
-- SA: Ana (líder), Bruno, Gabriela ; PED: Diogo ; FIN: Eva
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'ana10@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000f2', 'bruno10@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000f3', 'gabriela10@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000f4', 'diogo10@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000000f5', 'eva10@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('15000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000f1', 'ana10@estudeemportugal.org', 'Ana', 'AR'),
  ('15000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000f2', 'bruno10@estudeemportugal.org', 'Bruno', 'BC'),
  ('15000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000f3', 'gabriela10@estudeemportugal.org', 'Gabriela', 'GL'),
  ('15000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000f4', 'diogo10@estudeemportugal.org', 'Diogo', 'DA'),
  ('15000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-0000000000f5', 'eva10@estudeemportugal.org', 'Eva', 'EV');
insert into public.setores (id, nome, criado_por) values
  ('25000000-0000-0000-0000-0000000000aa', 'SA10', '15000000-0000-0000-0000-000000000001'),
  ('25000000-0000-0000-0000-0000000000bb', 'PED10', '15000000-0000-0000-0000-000000000001'),
  ('25000000-0000-0000-0000-0000000000cc', 'FIN10', '15000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('15000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-0000000000aa', 'lider'),
  ('15000000-0000-0000-0000-000000000002', '25000000-0000-0000-0000-0000000000aa', 'membro'),
  ('15000000-0000-0000-0000-000000000003', '25000000-0000-0000-0000-0000000000aa', 'membro'),
  ('15000000-0000-0000-0000-000000000004', '25000000-0000-0000-0000-0000000000bb', 'membro'),
  ('15000000-0000-0000-0000-000000000005', '25000000-0000-0000-0000-0000000000cc', 'membro');
-- P > T (em andamento, resp Gabriela) ; P > T2 (resp Gabriela)
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('35000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-0000000000aa', 0, 'P', '15000000-0000-0000-0000-000000000001');
insert into public.itens (id, pai_id, nivel, nome, criado_por, status) values
  ('35000000-0000-0000-0000-000000000002', '35000000-0000-0000-0000-000000000001', 1, 'T', '15000000-0000-0000-0000-000000000001', 'em_andamento'),
  ('35000000-0000-0000-0000-000000000003', '35000000-0000-0000-0000-000000000001', 1, 'T2', '15000000-0000-0000-0000-000000000001', 'em_andamento');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('35000000-0000-0000-0000-000000000002', '15000000-0000-0000-0000-000000000003', '15000000-0000-0000-0000-000000000001'),
  ('35000000-0000-0000-0000-000000000003', '15000000-0000-0000-0000-000000000003', '15000000-0000-0000-0000-000000000001');

create temp table t_sol (nome text primary key, id uuid) on commit drop;
grant all on t_sol to authenticated;

-- ---------------------------------------------------------------- abrir (Gabriela pede ação e informação a Diogo em T)
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
insert into t_sol select 'acao', (public.abrir_solicitacao('35000000-0000-0000-0000-000000000002',
  '15000000-0000-0000-0000-000000000004', 'acao', '<p>Enviar datas</p>') #>> '{solicitacao,id}')::uuid;
select results_eq($$select status::text, motivo_bloqueio_html from public.itens where id = '35000000-0000-0000-0000-000000000002'$$,
  $$values ('bloqueada', '<p>Enviar datas</p>')$$, 'ação bloqueia o item com o texto como motivo');
insert into t_sol select 'info', (public.abrir_solicitacao('35000000-0000-0000-0000-000000000002',
  '15000000-0000-0000-0000-000000000004', 'informacao', '<p>Qual sala?</p>') #>> '{solicitacao,id}')::uuid;
select is((select motivo_bloqueio_html from public.itens where id = '35000000-0000-0000-0000-000000000002'), '<p>Enviar datas</p>',
  'item já bloqueado mantém o primeiro motivo');
insert into t_sol select 'aprov', (public.abrir_solicitacao('35000000-0000-0000-0000-000000000003',
  '15000000-0000-0000-0000-000000000004', 'aprovacao', '<p>Aprova?</p>') #>> '{solicitacao,id}')::uuid;
select results_eq($$select status::text, aprovador_id from public.itens where id = '35000000-0000-0000-0000-000000000003'$$,
  $$values ('aguardando_aprovacao', '15000000-0000-0000-0000-000000000004'::uuid)$$, 'aprovação: item aguarda o destinatário');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f5","role":"authenticated"}';
select throws_ok($$select public.abrir_solicitacao('35000000-0000-0000-0000-000000000002',
  '15000000-0000-0000-0000-000000000004', 'acao', '<p>x</p>')$$, 'P0001', 'nao_encontrado', 'não abre solicitação em item que não vê');

reset role;
select results_eq($$select count(*)::int from public.notificacoes
  where tipo = 'solicitacao_recebida' and destinatario_id = '15000000-0000-0000-0000-000000000004'$$,
  array[3], 'destinatário recebe notificação a cada solicitação');
set local role authenticated;

-- ---------------------------------------------------------------- responder (Diogo)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f4","role":"authenticated"}';
select ok(privado.pode_ver_item('35000000-0000-0000-0000-000000000002'), 'destinatário de outro setor vê o item');
select ok(privado.pode_ver_item('35000000-0000-0000-0000-000000000001'), 'e vê o projeto como caminho');
select throws_ok(format($$select public.responder_solicitacao('%s', 'aprovada')$$, (select id from t_sol where nome = 'acao')),
  'P0001', 'resposta_invalida', 'não aprova uma solicitação de ação');
select is(public.responder_solicitacao((select id from t_sol where nome = 'acao'), 'resolvida', '<p>Enviei</p>')
  #>> '{item,status}', 'bloqueada', 'com outra pendente, o item continua bloqueado');
select throws_ok(format($$select public.responder_solicitacao('%s', 'resolvida')$$, (select id from t_sol where nome = 'acao')),
  'P0001', 'ja_respondida', 'não responde duas vezes');
select is(public.responder_solicitacao((select id from t_sol where nome = 'info'), 'resolvida')
  #>> '{item,status}', 'em_andamento', 'sem pendentes, o item volta a em andamento');
select is(public.responder_solicitacao((select id from t_sol where nome = 'aprov'), 'recusada', '<p>Sem verba</p>')
  #>> '{item,status}', 'em_andamento', 'recusada: item volta a em andamento');

reset role;
select ok(exists (select 1 from public.comentarios where item_id = '35000000-0000-0000-0000-000000000003'
  and texto_html like '%Aprovação recusada%'), 'recusa gera comentário automático');
select results_eq($$select count(*)::int from public.notificacoes
  where tipo = 'solicitacao_respondida' and destinatario_id = '15000000-0000-0000-0000-000000000003'$$,
  array[3], 'quem pediu é avisado de cada resposta');
select is((select count(*)::int from public.solicitacao_mensagens where solicitacao_id = (select id from t_sol where nome = 'acao')),
  1, 'mensagem da resposta fica na conversa');

-- ---------------------------------------------------------------- terceiro e cancelar
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
insert into t_sol select 'cancelar', (public.abrir_solicitacao('35000000-0000-0000-0000-000000000002',
  '15000000-0000-0000-0000-000000000004', 'acao', '<p>Outra</p>') #>> '{solicitacao,id}')::uuid;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select throws_ok(format($$select public.responder_solicitacao('%s', 'resolvida')$$, (select id from t_sol where nome = 'cancelar')),
  'P0001', 'sem_permissao', 'terceiro (nem destinatário nem líder) não responde');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f4","role":"authenticated"}';
select throws_ok(format($$select public.cancelar_solicitacao('%s')$$, (select id from t_sol where nome = 'cancelar')),
  'P0001', 'sem_permissao', 'destinatário não cancela');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
select is(public.cancelar_solicitacao((select id from t_sol where nome = 'cancelar')) #>> '{item,status}', 'em_andamento',
  'autor cancela e o item volta a andar');

-- ---------------------------------------------------------------- comentários
create temp table t_com (id uuid) on commit drop;
grant all on t_com to authenticated;
insert into t_com select (public.salvar_comentario(null, '35000000-0000-0000-0000-000000000002',
  '<p><span class="mention" data-uid="15000000-0000-0000-0000-000000000002">@Bruno</span> veja</p>')).id;
reset role;
select is((select count(*)::int from public.mencoes where comentario_id = (select id from t_com)), 1, 'menção gravada');
select results_eq($$select tipo::text from public.notificacoes where item_id = '35000000-0000-0000-0000-000000000002'
  and destinatario_id = '15000000-0000-0000-0000-000000000002'$$, array['mencao'], 'mencionado recebe notificação mencao');
select is_empty($$select 1 from public.notificacoes where tipo = 'comentario'
  and destinatario_id = '15000000-0000-0000-0000-000000000003'$$, 'autora responsável não é notificada do próprio comentário');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","role":"authenticated"}';
select ok(privado.pode_ver_item('35000000-0000-0000-0000-000000000002'), 'mencionado passa a ver o item');
select throws_ok(format($$select public.salvar_comentario('%s', '35000000-0000-0000-0000-000000000002', '<p>x</p>')$$,
  (select id from t_com)), 'P0001', 'sem_permissao', 'outra pessoa não edita o comentário');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f3","role":"authenticated"}';
select isnt((public.salvar_comentario((select id from t_com), '35000000-0000-0000-0000-000000000002', '<p>editado</p>')).editado_em,
  null, 'autor edita e editado_em é preenchido');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f5","role":"authenticated"}';
select throws_ok($$select public.salvar_comentario(null, '35000000-0000-0000-0000-000000000002', '<p>x</p>')$$,
  'P0001', 'nao_encontrado', 'não comenta em item que não vê');

select * from finish();
rollback;
