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

-- ---------------------------------------------------------------- triggers de itens
-- Antes de gravar: nível e setor vêm do pai; carimbos de status; atualizado_em.
create function privado.itens_antes_gravar()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_pai public.itens%rowtype;
begin
  if new.pai_id is not null then
    select * into v_pai from public.itens where id = new.pai_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'nao_encontrado';
    end if;
    -- tarefa só dentro de projeto; subtarefa só dentro de tarefa
    if new.nivel is distinct from v_pai.nivel + 1 then
      raise exception using errcode = 'P0001', message = 'nivel_invalido';
    end if;
    new.setor_id := v_pai.setor_id;
  elsif new.nivel = 2 then
    raise exception using errcode = 'P0001', message = 'nivel_invalido';
  end if;

  if new.setor_id is null then
    raise exception using errcode = 'P0001', message = 'setor_obrigatorio';
  end if;

  if tg_op = 'UPDATE' then
    if new.nivel <> old.nivel then
      raise exception using errcode = 'P0001', message = 'nivel_invalido';
    end if;
    new.atualizado_em := now();
  end if;

  -- parado_desde: entra em bloqueada/aguardando → agora; sai → nulo (FLUXOS.md §1)
  if new.status in ('bloqueada', 'aguardando_aprovacao') then
    if tg_op = 'INSERT' or old.status not in ('bloqueada', 'aguardando_aprovacao') then
      new.parado_desde := coalesce(new.parado_desde, now());
    end if;
  else
    new.parado_desde := null;
  end if;

  -- concluido_em: concluir → agora; reabrir → nulo
  if new.status = 'concluida' then
    if tg_op = 'INSERT' then
      new.concluido_em := coalesce(new.concluido_em, now());
    elsif old.status <> 'concluida' then
      new.concluido_em := now();
    end if;
  else
    new.concluido_em := null;
  end if;

  return new;
end;
$$;

create trigger itens_antes_gravar
  before insert or update on public.itens
  for each row execute function privado.itens_antes_gravar();

-- Depois de mudar o setor (ex.: tarefa avulsa movida para projeto de outro setor), os filhos acompanham.
create function privado.itens_propagar_setor()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.itens set setor_id = new.setor_id
  where pai_id = new.id and setor_id <> new.setor_id;
  return null;
end;
$$;

create trigger itens_propagar_setor
  after update of setor_id on public.itens
  for each row when (new.setor_id is distinct from old.setor_id)
  execute function privado.itens_propagar_setor();

-- Dependências: impede ciclo (A espera B e B espera A, direta ou indiretamente).
create function privado.dependencias_impede_ciclo()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    with recursive cadeia(id) as (
      select d.depende_de_id from public.dependencias d where d.item_id = new.depende_de_id
      union
      select d.depende_de_id from public.dependencias d join cadeia c on d.item_id = c.id
    )
    select 1 from cadeia where id = new.item_id
  ) or new.depende_de_id = new.item_id then
    raise exception using errcode = 'P0001', message = 'ciclo_dependencia';
  end if;
  return new;
end;
$$;

create trigger dependencias_impede_ciclo
  before insert or update on public.dependencias
  for each row execute function privado.dependencias_impede_ciclo();

revoke all on function privado.itens_antes_gravar(), privado.itens_propagar_setor(),
  privado.dependencias_impede_ciclo() from public, anon, authenticated;
