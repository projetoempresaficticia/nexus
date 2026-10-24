-- T-33 · Cadastrar, desativar e reativar pessoas (US-03, US-04)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(15);

-- Adm (sem setor), Ana (líder SA), Bruno (membro SA, responsável por T)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000bb0', 'adm33@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000bb1', 'ana33@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000bb2', 'bruno33@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin) values
  ('1b000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000bb0', 'adm33@estudeemportugal.org', 'Adm', 'AD', true),
  ('1b000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000bb1', 'ana33@estudeemportugal.org', 'Ana', 'AR', false),
  ('1b000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000bb2', 'bruno33@estudeemportugal.org', 'Bruno Costa', 'BC', false);
insert into public.setores (id, nome, criado_por) values
  ('2b000000-0000-0000-0000-0000000000aa', 'SA33', '1b000000-0000-0000-0000-000000000000');
insert into public.vinculos (perfil_id, setor_id, papel) values
  ('1b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-0000000000aa', 'lider'),
  ('1b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-0000000000aa', 'membro');
insert into public.itens (id, setor_id, nivel, nome, criado_por) values
  ('3b000000-0000-0000-0000-000000000001', '2b000000-0000-0000-0000-0000000000aa', 1, 'T', '1b000000-0000-0000-0000-000000000001'),
  ('3b000000-0000-0000-0000-000000000002', '2b000000-0000-0000-0000-0000000000aa', 1, 'Feita', '1b000000-0000-0000-0000-000000000001');
update public.itens set status = 'concluida' where id = '3b000000-0000-0000-0000-000000000002';
insert into public.item_responsaveis (item_id, perfil_id, atribuido_por) values
  ('3b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000001'),
  ('3b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000002', '1b000000-0000-0000-0000-000000000001');
insert into public.comentarios (item_id, autor_id, texto_html) values
  ('3b000000-0000-0000-0000-000000000001', '1b000000-0000-0000-0000-000000000002', '<p>Feito</p>');

-- ---------------------------------------------------------------- líder não é Adm
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb1","role":"authenticated"}';
select throws_ok($$select public.cadastrar_usuario('nova33@estudeemportugal.org', 'Nova Pessoa')$$,
  'P0001', 'sem_permissao', 'líder não cadastra');
select throws_ok($$select public.desativar_usuario('1b000000-0000-0000-0000-000000000002')$$,
  'P0001', 'sem_permissao', 'líder não desativa');

-- ---------------------------------------------------------------- Adm cadastra
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb0","role":"authenticated"}';
select is((public.cadastrar_usuario(' Nova33@EstudeEmPortugal.org ', 'Nova Pessoa Silva',
  '[{"setor_id":"2b000000-0000-0000-0000-0000000000aa","papel":"membro"}]')).iniciais, 'NS',
  'cadastra com iniciais do primeiro e último nome');
reset role;
select is((select email::text from public.perfis where nome = 'Nova Pessoa Silva'), 'nova33@estudeemportugal.org',
  'e-mail guardado em minúsculas');
select is((select count(*)::int from public.vinculos v join public.perfis p on p.id = v.perfil_id
           where p.nome = 'Nova Pessoa Silva'), 1, 'vínculo criado');
select is((select count(*)::int from public.notificacoes n join public.perfis p on p.id = n.destinatario_id
           where p.nome = 'Nova Pessoa Silva' and n.tipo = 'boas_vindas'), 1, 'boas-vindas pendente');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb0","role":"authenticated"}';
select throws_ok($$select public.cadastrar_usuario('NOVA33@estudeemportugal.org', 'Outra')$$,
  'P0001', 'email_ja_cadastrado', 'e-mail repetido é recusado');
select throws_ok($$select public.cadastrar_usuario('fulano@gmail.com', 'Fulano')$$,
  'P0001', 'email_invalido', 'só e-mails da empresa');
select is((public.cadastrar_usuario('ze33@estudeemportugal.org', 'Zé')).iniciais, 'ZÉ', 'nome de uma palavra');

-- ---------------------------------------------------------------- Adm desativa o Bruno
select is(jsonb_array_length(public.desativar_usuario('1b000000-0000-0000-0000-000000000002')), 1,
  'devolve só os itens abertos para reatribuir');
select throws_ok($$select public.desativar_usuario('1b000000-0000-0000-0000-000000000000')$$,
  'P0001', 'nao_desativa_a_si', 'Adm não se desativa');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb2","role":"authenticated"}';
select is(privado.meu_perfil_id(), null, 'desativado perde o acesso na hora');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb1","role":"authenticated"}';
select is((select nome from public.pessoas_inativas() where id = '1b000000-0000-0000-0000-000000000002'),
  'Bruno Costa', 'colegas ainda veem o nome de quem saiu');
select is((select count(*)::int from public.comentarios where autor_id = '1b000000-0000-0000-0000-000000000002'), 1,
  'comentários de quem saiu continuam');

-- ---------------------------------------------------------------- reativar
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000bb0","role":"authenticated"}';
select ok((public.reativar_usuario('1b000000-0000-0000-0000-000000000002')).ativo, 'Adm reativa');

select * from finish();
rollback;
