-- T-45 · Só quem criou edita e exclui comentários, solicitações e mensagens
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(16);

-- ---------------------------------------------------------------- dados
-- SA: Ana (líder), Gabriela (membro, responsável por T) ; PED: Diogo
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009a1', 'ana45@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000009a3', 'gabriela45@estudeemportugal.org'),
  ('00000000-0000-0000-0000-0000000009a4', 'diogo45@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais) values
  ('19000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000009a1', 'ana45@estudeemportugal.org', 'Ana', 'AR'),
  ('19000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000009a3', 'gabriela45@estudeemportugal.org', 'Gabriela', 'GL'),
  ('19000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000009a4', 'diogo45@estudeemportugal.org', 'Diogo', 'DA');
insert into public.setores (id, nome, criado_por) values
  ('29000000-0000-0000-0000-0000000000aa', 'SA45', '19000000-0000-0000-0000-000000000001'),
  ('29000000-0000-0000-0000-0000000000bb', 'PED45', '19000000-0000-0000-0000-000000000001');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('19000000-0000-0000-0000-000000000001', '29000000-0000-0000-0000-0000000000aa', 'lider'),
  ('19000000-0000-0000-0000-000000000003', '29000000-0000-0000-0000-0000000000aa', 'membro'),
  ('19000000-0000-0000-0000-000000000004', '29000000-0000-0000-0000-0000000000bb', 'membro');
insert into public.itens (id, setor_id, nivel, nome, criado_por, status) values
  ('39000000-0000-0000-0000-000000000001', '29000000-0000-0000-0000-0000000000aa', 1, 'T', '19000000-0000-0000-0000-000000000001', 'em_andamento');
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('39000000-0000-0000-0000-000000000001', '19000000-0000-0000-0000-000000000003', '19000000-0000-0000-0000-000000000001');

create temp table t_ids (nome text, id uuid) on commit drop;
grant all on t_ids to authenticated;

-- ---------------------------------------------------------------- Gabriela pede uma ação a Diogo
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a3","role":"authenticated"}';
insert into t_ids select 'sol', (public.abrir_solicitacao('39000000-0000-0000-0000-000000000001',
  '19000000-0000-0000-0000-000000000004', 'acao', '<p>Enviar datas</p>') #>> '{solicitacao,id}')::uuid;
with m as (
  insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html)
  values ((select id from t_ids where nome = 'sol'), '19000000-0000-0000-0000-000000000003', '<p>Até sexta?</p>')
  returning id)
insert into t_ids select 'msg_g', id from m;

-- autor edita a solicitação; o motivo do item acompanha
select is(public.editar_solicitacao((select id from t_ids where nome = 'sol'), '<p>Enviar datas e horários</p>')
  #>> '{item,motivo_bloqueio_html}', '<p>Enviar datas e horários</p>', 'autor edita e o motivo do item acompanha');
select isnt((select editado_em from public.solicitacoes where id = (select id from t_ids where nome = 'sol')), null,
  'solicitação editada fica marcada');
select throws_ok(format($$select public.editar_solicitacao('%s', '  ')$$, (select id from t_ids where nome = 'sol')),
  'P0001', 'texto_obrigatorio', 'texto vazio é recusado');

-- autor edita a própria mensagem
update public.solicitacao_mensagens set texto_html = '<p>Até sexta, por favor?</p>'
  where id = (select id from t_ids where nome = 'msg_g');
select results_eq(format($$select texto_html from public.solicitacao_mensagens where id = '%s'$$, (select id from t_ids where nome = 'msg_g')),
  array['<p>Até sexta, por favor?</p>'], 'autor edita a própria mensagem');
select isnt((select editado_em from public.solicitacao_mensagens where id = (select id from t_ids where nome = 'msg_g')), null,
  'mensagem editada fica marcada');
select throws_ok(format($$update public.solicitacao_mensagens set autor_id = '19000000-0000-0000-0000-000000000004' where id = '%s'$$,
  (select id from t_ids where nome = 'msg_g')), '42501', null, 'não troca o autor da mensagem');

-- ---------------------------------------------------------------- Diogo (destinatário)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a4","role":"authenticated"}';
select throws_ok(format($$select public.editar_solicitacao('%s', '<p>outra</p>')$$, (select id from t_ids where nome = 'sol')),
  'P0001', 'sem_permissao', 'destinatário não edita a solicitação');
update public.solicitacao_mensagens set texto_html = '<p>hackeado</p>' where id = (select id from t_ids where nome = 'msg_g');
delete from public.solicitacao_mensagens where id = (select id from t_ids where nome = 'msg_g');
with m as (
  insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html)
  values ((select id from t_ids where nome = 'sol'), '19000000-0000-0000-0000-000000000004', '<p>Sim</p>')
  returning id)
insert into t_ids select 'msg_d', id from m;
delete from public.solicitacao_mensagens where id = (select id from t_ids where nome = 'msg_d');

-- ---------------------------------------------------------------- Ana (líder do setor do item)
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a1","role":"authenticated"}';
select throws_ok(format($$select public.editar_solicitacao('%s', '<p>outra</p>')$$, (select id from t_ids where nome = 'sol')),
  'P0001', 'sem_permissao', 'líder não edita solicitação de outra pessoa');
select throws_ok(format($$select public.cancelar_solicitacao('%s')$$, (select id from t_ids where nome = 'sol')),
  'P0001', 'sem_permissao', 'líder não exclui solicitação de outra pessoa');
delete from public.solicitacao_mensagens where id = (select id from t_ids where nome = 'msg_g');
insert into t_ids select 'com', (public.salvar_comentario(null, '39000000-0000-0000-0000-000000000001', '<p>Ok</p>')).id;

reset role;
select results_eq(format($$select texto_html from public.solicitacao_mensagens where id = '%s'$$, (select id from t_ids where nome = 'msg_g')),
  array['<p>Até sexta, por favor?</p>'], 'outra pessoa não edita nem apaga a mensagem');
select is((select count(*)::int from public.solicitacao_mensagens where id = (select id from t_ids where nome = 'msg_d')), 0,
  'quem escreveu apaga a própria mensagem');

-- ---------------------------------------------------------------- comentário da Ana
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a3","role":"authenticated"}';
select throws_ok(format($$select public.salvar_comentario('%s', '39000000-0000-0000-0000-000000000001', '<p>x</p>')$$,
  (select id from t_ids where nome = 'com')), 'P0001', 'sem_permissao', 'outra pessoa não edita o comentário');
delete from public.comentarios where id = (select id from t_ids where nome = 'com');
reset role;
select is((select count(*)::int from public.comentarios where id = (select id from t_ids where nome = 'com')), 1,
  'outra pessoa não apaga o comentário');

-- ---------------------------------------------------------------- autora exclui depois de respondida
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a4","role":"authenticated"}';
select lives_ok(format($$select public.responder_solicitacao('%s', 'resolvida')$$, (select id from t_ids where nome = 'sol')),
  'destinatário resolve');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000009a3","role":"authenticated"}';
select throws_ok(format($$select public.editar_solicitacao('%s', '<p>outra</p>')$$, (select id from t_ids where nome = 'sol')),
  'P0001', 'ja_respondida', 'respondida não se edita');
select lives_ok(format($$select public.cancelar_solicitacao('%s')$$, (select id from t_ids where nome = 'sol')),
  'autora exclui mesmo depois de respondida');

select * from finish();
rollback;
