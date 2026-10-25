-- T-65 · Categorias de e-mail (uma por tipo de aviso) e "conta de teste" (só o Adm marca)
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f65', 'ana65@estudeemportugal.org'),
  ('00000000-0000-0000-0000-000000000f66', 'adm65@estudeemportugal.org');
insert into public.perfis (id, auth_id, email, nome, iniciais, is_admin) values
  ('1a000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000f65', 'ana65@estudeemportugal.org', 'Ana', 'AN', false),
  ('1a000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000f66', 'adm65@estudeemportugal.org', 'Adm', 'AD', true);

select ok(not (select conta_teste from public.perfis where id = '1a000000-0000-0000-0000-000000000001'),
  'por padrão, ninguém é conta de teste');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000f65","role":"authenticated"}';

select lives_ok($$update public.perfis set
    notif_atribuicao = false, notif_bloqueios = false, notif_aprovacoes = false,
    notif_solicitacoes = false, notif_mencoes_comentarios = false, notif_resumo_semanal = false
  where id = '1a000000-0000-0000-0000-000000000001'$$,
  'Ana desliga as próprias 6 categorias de e-mail de uma vez');
select throws_ok($$update public.perfis set conta_teste = true where id = '1a000000-0000-0000-0000-000000000001'$$,
  'P0001', 'sem_permissao', 'Ana não pode se marcar como conta de teste');

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000f66","role":"authenticated"}';

select lives_ok($$update public.perfis set conta_teste = true where id = '1a000000-0000-0000-0000-000000000001'$$,
  'o Adm marca a conta de outra pessoa como teste');
select is((select conta_teste from public.perfis where id = '1a000000-0000-0000-0000-000000000001'), true,
  'marcação ficou salva');
select lives_ok($$update public.perfis set notif_atribuicao = true where id = '1a000000-0000-0000-0000-000000000001'$$,
  'o Adm também liga a categoria de outra pessoa');

reset role;
select is((select array[notif_bloqueios, notif_aprovacoes, notif_solicitacoes, notif_mencoes_comentarios]
           from public.perfis where id = '1a000000-0000-0000-0000-000000000002'),
  array[true, true, true, true], 'quem nunca mexeu continua com as 6 categorias ligadas');
select ok(not exists (select 1 from information_schema.columns
                       where table_schema = 'public' and table_name = 'perfis'
                         and column_name = 'receber_email_notificacoes'),
  'o interruptor único (T-59) saiu da tabela');

select * from finish();
rollback;
