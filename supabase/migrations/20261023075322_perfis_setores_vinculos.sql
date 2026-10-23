-- T-05 · Tipos, perfis, setores, vínculos e funções de acesso (SCHEMA.md, SEGURANCA.md §2–§4)
-- Funções de permissão ficam no schema `privado` (não exposto na API): as políticas usam-nas,
-- mas ninguém as chama via REST/RPC.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------- tipos
create type public.papel_setor        as enum ('lider', 'membro');
create type public.status_item        as enum ('a_fazer', 'em_andamento', 'bloqueada', 'aguardando_aprovacao', 'concluida');
create type public.prioridade         as enum ('alta', 'media', 'baixa');
create type public.recorrencia        as enum ('diaria', 'semanal', 'quinzenal', 'mensal', 'anual');
create type public.tipo_solicitacao   as enum ('informacao', 'acao', 'aprovacao');
create type public.status_solicitacao as enum ('pendente', 'resolvida', 'aprovada', 'recusada');
create type public.tipo_notificacao   as enum ('boas_vindas', 'atribuicao', 'mencao', 'comentario',
                                               'solicitacao_recebida', 'solicitacao_respondida', 'lembrete_prazo');

-- ---------------------------------------------------------------- tabelas
create table public.perfis (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users (id) on delete set null,
  email         extensions.citext not null unique
                check (email::text ~* '^[^@\s]+@estudeemportugal\.org$'),
  nome          text not null check (length(trim(nome)) > 0),
  iniciais      text not null check (length(iniciais) between 2 and 3),
  is_admin      boolean not null default false,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  desativado_em timestamptz,
  legacy_id     text unique
);

create table public.setores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null check (length(trim(nome)) > 0),
  pai_id     uuid references public.setores (id) on delete restrict,
  ativo      boolean not null default true,
  criado_por uuid not null references public.perfis (id),
  criado_em  timestamptz not null default now(),
  legacy_id  text unique,
  constraint setores_pai_diferente check (pai_id <> id)
);
create index setores_pai_id_idx on public.setores (pai_id);
create index setores_criado_por_idx on public.setores (criado_por);

create table public.vinculos (
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  setor_id  uuid not null references public.setores (id) on delete cascade,
  papel     public.papel_setor not null,
  criado_em timestamptz not null default now(),
  primary key (perfil_id, setor_id)
);
create index vinculos_setor_id_idx on public.vinculos (setor_id);

-- ---------------------------------------------------------------- funções de acesso
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- Perfil ativo do usuário logado (null se não houver ou estiver desativado → todas as políticas falham).
create function privado.meu_perfil_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select p.id from public.perfis p
  where p.auth_id = (select auth.uid()) and p.ativo;
$$;

create function privado.eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_admin from public.perfis p where p.id = (select privado.meu_perfil_id())),
    false);
$$;

-- A raiz e todos os setores abaixo dela.
create function privado.setores_descendentes(raiz uuid)
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  with recursive arvore as (
    select s.id from public.setores s where s.id = raiz
    union
    select f.id from public.setores f join arvore a on f.pai_id = a.id
  )
  select id from arvore;
$$;

-- Admin: todos. Senão: descendentes (inclusive) dos setores em que é líder.
create function privado.setores_administrados()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select s.id from public.setores s where (select privado.eh_admin())
  union
  select d.id
  from public.vinculos v
  cross join lateral privado.setores_descendentes(v.setor_id) as d(id)
  where v.perfil_id = (select privado.meu_perfil_id()) and v.papel = 'lider';
$$;

-- Administrados ∪ setores com vínculo direto.
create function privado.setores_visiveis()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select id from privado.setores_administrados() as a(id)
  union
  select v.setor_id from public.vinculos v
  where v.perfil_id = (select privado.meu_perfil_id());
$$;

create function privado.administra_setor(s uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from privado.setores_administrados() as a(id) where a.id = s);
$$;

revoke all on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

-- ---------------------------------------------------------------- trigger anti-ciclo
create function privado.setores_impede_ciclo()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.pai_id is not null
     and new.pai_id in (select d.id from privado.setores_descendentes(new.id) as d(id)) then
    raise exception 'Um setor não pode ficar abaixo dele mesmo nem de um sub-setor seu'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
revoke all on function privado.setores_impede_ciclo() from public, anon, authenticated;

create trigger setores_impede_ciclo
  before insert or update of pai_id on public.setores
  for each row execute function privado.setores_impede_ciclo();
