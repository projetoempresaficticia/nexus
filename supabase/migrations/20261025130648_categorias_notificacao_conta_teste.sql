-- T-65 · Pedido do Germano (2026-10-25): a preferência de e-mail vira por categoria (não um só
-- interruptor), e o Adm marca quem é "conta de teste" — essas nunca recebem e-mail, não importa a
-- preferência. Mapeamento das categorias (confirmado com o Germano):
--   atribuição      → tipo='atribuicao'
--   bloqueios       → tipo='solicitacao_recebida' e dados.tipo em ('informacao','acao')
--   aprovações      → tipo='solicitacao_recebida' e dados.tipo='aprovacao'
--   solicitações    → tipo='solicitacao_respondida' (responderam a uma solicitação sua)
--   menções/coment. → tipo in ('mencao','comentario')
-- boas_vindas e lembrete_prazo continuam sempre ligados (não têm categoria própria no painel).

alter table public.perfis add column notif_atribuicao boolean not null default true;
alter table public.perfis add column notif_bloqueios boolean not null default true;
alter table public.perfis add column notif_aprovacoes boolean not null default true;
alter table public.perfis add column notif_solicitacoes boolean not null default true;
alter table public.perfis add column notif_mencoes_comentarios boolean not null default true;
alter table public.perfis add column notif_resumo_semanal boolean not null default true;
alter table public.perfis add column conta_teste boolean not null default false;

-- Quem já tinha desligado o interruptor único continua sem receber nenhuma categoria.
update public.perfis set
  notif_atribuicao = receber_email_notificacoes,
  notif_bloqueios = receber_email_notificacoes,
  notif_aprovacoes = receber_email_notificacoes,
  notif_solicitacoes = receber_email_notificacoes,
  notif_mencoes_comentarios = receber_email_notificacoes,
  notif_resumo_semanal = receber_email_notificacoes
where not receber_email_notificacoes;

alter table public.perfis drop column receber_email_notificacoes;

-- A trava (T-59): cada pessoa só mexe nas próprias categorias de e-mail, nunca em conta_teste
-- (isso é o Adm quem decide) nem nas colunas de identidade/papel.
create or replace function privado.perfis_antes_minha_preferencia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and not privado.eh_admin() and (
    new.email is distinct from old.email or new.nome is distinct from old.nome or
    new.iniciais is distinct from old.iniciais or new.is_admin is distinct from old.is_admin or
    new.ativo is distinct from old.ativo or new.auth_id is distinct from old.auth_id or
    new.criado_em is distinct from old.criado_em or new.desativado_em is distinct from old.desativado_em or
    new.legacy_id is distinct from old.legacy_id or new.conta_teste is distinct from old.conta_teste
  ) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  return new;
end;
$$;
