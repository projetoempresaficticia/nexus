-- T-06 · Itens (projeto/tarefa/subtarefa), responsáveis, checklist e dependências (SCHEMA.md; SEGURANCA.md §2.1)
-- Erros de regra: errcode P0001 + código na mensagem (API.md).

-- ---------------------------------------------------------------- ajuste T-05: erro no padrão da API
create or replace function privado.setores_impede_ciclo()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.pai_id is not null
     and new.pai_id in (select d.id from privado.setores_descendentes(new.id) as d(id)) then
    raise exception using errcode = 'P0001', message = 'ciclo_setor';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- tabelas
create table public.itens (
  id                   uuid primary key default gen_random_uuid(),
  setor_id             uuid not null references public.setores (id),
  pai_id               uuid references public.itens (id) on delete cascade,
  nivel                smallint not null check (nivel between 0 and 2),
  nome                 text not null check (length(trim(nome)) between 1 and 200),
  descricao_html       text not null default '',
  status               public.status_item not null default 'a_fazer',
  prioridade           public.prioridade not null default 'media',
  inicio               date,
  prazo                date,
  motivo_bloqueio_html text,
  aprovador_id         uuid references public.perfis (id),
  parado_desde         timestamptz,
  recorrencia          public.recorrencia,
  ordem                integer not null default 0,
  concluido_em         timestamptz,
  criado_por           uuid not null references public.perfis (id),
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),
  legacy_id            text unique,
  constraint itens_projeto_sem_pai    check (nivel <> 0 or pai_id is null),
  constraint itens_subtarefa_com_pai  check (nivel <> 2 or pai_id is not null),
  constraint itens_prazo_apos_inicio  check (prazo is null or inicio is null or prazo >= inicio),
  constraint itens_motivo_bloqueio    check (status <> 'bloqueada' or length(trim(coalesce(motivo_bloqueio_html, ''))) > 0),
  constraint itens_aprovador          check (status <> 'aguardando_aprovacao' or aprovador_id is not null),
  constraint itens_recorrencia_nivel  check (recorrencia is null or nivel > 0)
);
create index itens_setor_status_idx on public.itens (setor_id, status);
create index itens_pai_id_idx       on public.itens (pai_id);
create index itens_criado_por_idx   on public.itens (criado_por);
create index itens_aprovador_id_idx on public.itens (aprovador_id);
create index itens_prazo_aberto_idx on public.itens (prazo) where status <> 'concluida';

create table public.item_responsaveis (
  item_id       uuid not null references public.itens (id) on delete cascade,
  perfil_id     uuid not null references public.perfis (id),
  atribuido_por uuid not null references public.perfis (id),
  criado_em     timestamptz not null default now(),
  primary key (item_id, perfil_id)
);
create index item_responsaveis_perfil_item_idx on public.item_responsaveis (perfil_id, item_id);
create index item_responsaveis_atribuido_por_idx on public.item_responsaveis (atribuido_por);

create table public.checklist_itens (
  id      uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.itens (id) on delete cascade,
  texto   text not null check (length(trim(texto)) > 0),
  feito   boolean not null default false,
  ordem   integer not null default 0
);
create index checklist_itens_item_idx on public.checklist_itens (item_id, ordem);

create table public.dependencias (
  item_id       uuid not null references public.itens (id) on delete cascade,
  depende_de_id uuid not null references public.itens (id) on delete cascade,
  primary key (item_id, depende_de_id),
  constraint dependencias_diferentes check (item_id <> depende_de_id)
);
create index dependencias_depende_de_idx on public.dependencias (depende_de_id);
