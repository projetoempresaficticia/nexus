-- T-08 · Histórico (auditoria), fila de notificações, views e tempo real (SCHEMA.md; SEGURANCA.md §4–§4.1)

-- ---------------------------------------------------------------- historico
create table public.historico (
  id           bigint generated always as identity primary key,
  tabela       text not null,
  registro_id  uuid not null,
  perfil_id    uuid references public.perfis (id) on delete set null,
  acao         text not null check (acao in ('insert', 'update', 'delete')),
  campo        text,
  valor_antes  text,
  valor_depois text,
  criado_em    timestamptz not null default now()
);
create index historico_registro_idx on public.historico (tabela, registro_id, criado_em);
create index historico_perfil_idx on public.historico (perfil_id);

-- Uma linha por insert/delete; no update, uma linha por coluna alterada.
-- registro_id = id da linha (em vinculos, o perfil_id).
create function privado.registrar_historico()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_old   jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new   jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_linha jsonb := coalesce(v_new, v_old);
  v_id    uuid  := coalesce(v_linha ->> 'id', v_linha ->> 'perfil_id')::uuid;
  v_autor uuid  := privado.meu_perfil_id();
  k       text;
begin
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k <> 'atualizado_em' and (v_new -> k) is distinct from (v_old -> k) then
        insert into public.historico (tabela, registro_id, perfil_id, acao, campo, valor_antes, valor_depois)
        values (tg_table_name, v_id, v_autor, 'update', k, v_old ->> k, v_new ->> k);
      end if;
    end loop;
  else
    insert into public.historico (tabela, registro_id, perfil_id, acao, campo, valor_antes, valor_depois)
    values (tg_table_name, v_id, v_autor, lower(tg_op),
            case when tg_table_name = 'vinculos' then 'setor:' || (v_linha ->> 'setor_id') end,
            case when tg_op = 'DELETE' then v_linha ->> case when tg_table_name = 'vinculos' then 'papel' else 'nome' end end,
            case when tg_op = 'INSERT' then v_linha ->> case when tg_table_name = 'vinculos' then 'papel' else 'nome' end end);
  end if;
  return null;
end;
$$;
revoke all on function privado.registrar_historico() from public, anon, authenticated;

create trigger historico_itens after insert or update or delete on public.itens
  for each row execute function privado.registrar_historico();
create trigger historico_solicitacoes after insert or update or delete on public.solicitacoes
  for each row execute function privado.registrar_historico();
create trigger historico_vinculos after insert or update or delete on public.vinculos
  for each row execute function privado.registrar_historico();
create trigger historico_perfis after insert or update or delete on public.perfis
  for each row execute function privado.registrar_historico();

-- ---------------------------------------------------------------- notificacoes (fila de e-mails)
create table public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.tipo_notificacao not null,
  destinatario_id uuid not null references public.perfis (id) on delete cascade,
  item_id         uuid references public.itens (id) on delete cascade,
  dados           jsonb not null default '{}',
  criado_em       timestamptz not null default now(),
  enviado_em      timestamptz,
  tentativas      smallint not null default 0,
  erro            text
);
create index notificacoes_pendentes_idx on public.notificacoes (criado_em) where enviado_em is null;
create index notificacoes_destinatario_idx on public.notificacoes (destinatario_id);
create index notificacoes_item_idx on public.notificacoes (item_id);

-- Cria notificação, exceto para quem fez a ação (SCHEMA.md §notificacoes). Usada pelos RPCs.
create function privado.notificar(p_tipo public.tipo_notificacao, p_destinatario uuid, p_item uuid, p_dados jsonb)
returns void
language sql security definer
set search_path = ''
as $$
  insert into public.notificacoes (tipo, destinatario_id, item_id, dados)
  select p_tipo, p_destinatario, p_item, coalesce(p_dados, '{}')
  where p_destinatario is not null
    and p_destinatario is distinct from (select privado.meu_perfil_id());
$$;
revoke all on function privado.notificar(public.tipo_notificacao, uuid, uuid, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS
alter table public.historico    enable row level security;
alter table public.notificacoes enable row level security;
revoke all on public.historico, public.notificacoes from anon, authenticated;
grant select on public.historico to authenticated;
-- notificacoes: sem políticas para authenticated — só a Edge Function (service role) lê e marca envio.

create policy hist_select on public.historico for select to authenticated
  using ((select privado.eh_admin())
         or (tabela = 'itens' and registro_id in (select privado.itens_visiveis())));

-- ---------------------------------------------------------------- contexto: itens vistos só como caminho
-- Ancestrais do que me envolve que não são meus nem do meu setor administrado (SEGURANCA.md §2.1 caso 4).
create function privado.itens_contexto()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  with recursive
    donos(id) as (
      select r.item_id from public.item_responsaveis r where r.perfil_id = (select privado.meu_perfil_id())
      union
      select i.id from public.itens i where i.criado_por = (select privado.meu_perfil_id())
    ),
    abaixo(id) as (
      select id from donos
      union
      select f.id from public.itens f join abaixo a on f.pai_id = a.id
    ),
    base(id) as (
      select id from abaixo
      union
      select e.id from privado.itens_envolvidos() as e(id)
    ),
    acima(id) as (
      select p.pai_id from public.itens p join base b on p.id = b.id where p.pai_id is not null
      union
      select p.pai_id from public.itens p join acima a on p.id = a.id where p.pai_id is not null
    )
  select id from acima
  except select id from base
  except select i.id from public.itens i where i.setor_id in (select privado.setores_administrados());
$$;
revoke all on function privado.itens_contexto() from public, anon;
grant execute on function privado.itens_contexto() to authenticated;

-- ---------------------------------------------------------------- views (security_invoker: respeitam a RLS)
create view public.vw_itens with (security_invoker = true) as
select
  i.*,
  coalesce((select array_agg(r.perfil_id order by r.criado_em) from public.item_responsaveis r where r.item_id = i.id),
           '{}'::uuid[]) as responsaveis,
  case i.nivel
    when 0 then i.id
    when 1 then i.pai_id
    else (select t.pai_id from public.itens t where t.id = i.pai_id)
  end as projeto_id,
  array_remove(array[
    case when exists (select 1 from public.item_responsaveis r
                      where r.item_id = i.id and r.perfil_id = (select privado.meu_perfil_id())) then 'responsavel' end,
    case when i.criado_por = (select privado.meu_perfil_id()) then 'criador' end,
    case when i.aprovador_id = (select privado.meu_perfil_id()) then 'aprovador' end,
    case when exists (select 1 from public.solicitacoes s where s.item_id = i.id
                      and (select privado.meu_perfil_id()) in (s.de_id, s.para_id)) then 'solicitacao' end,
    case when exists (select 1 from public.mencoes m join public.comentarios c on c.id = m.comentario_id
                      where c.item_id = i.id and m.perfil_id = (select privado.meu_perfil_id())) then 'mencao' end,
    case when i.id in (select privado.itens_contexto()) then 'contexto' end
  ], null) as meu_envolvimento,
  (i.prazo < (now() at time zone 'Europe/Lisbon')::date and i.status <> 'concluida') as atrasado,
  case when i.parado_desde is not null
       then (now() at time zone 'Europe/Lisbon')::date - (i.parado_desde at time zone 'Europe/Lisbon')::date
  end as dias_parado,
  (select count(*)::int from public.itens f where f.pai_id = i.id) as qtd_filhos,
  (select count(*)::int from public.comentarios c where c.item_id = i.id) as qtd_comentarios,
  (select count(*)::int from public.anexos a where a.item_id = i.id) as qtd_anexos,
  (select count(*)::int from public.solicitacoes s where s.item_id = i.id and s.status = 'pendente') as solicitacoes_pendentes
from public.itens i;

-- Uma linha por (item concluído × responsável). dias_parado_total vem dos períodos registados no histórico.
create view public.vw_produtividade with (security_invoker = true) as
select
  i.id as item_id,
  i.setor_id,
  r.perfil_id,
  i.nome,
  i.nivel,
  i.inicio,
  i.prazo,
  i.concluido_em,
  (i.concluido_em at time zone 'Europe/Lisbon')::date - coalesce(i.inicio, (i.criado_em at time zone 'Europe/Lisbon')::date)
    as dias_ciclo,
  (i.prazo is null or (i.concluido_em at time zone 'Europe/Lisbon')::date <= i.prazo) as no_prazo,
  coalesce((
    select sum(extract(epoch from (h.criado_em - h.valor_antes::timestamptz)) / 86400)
    from public.historico h
    where h.tabela = 'itens' and h.registro_id = i.id and h.campo = 'parado_desde'
      and h.valor_antes is not null and h.valor_depois is null
  ), 0)::numeric(10, 1) as dias_parado_total
from public.itens i
join public.item_responsaveis r on r.item_id = i.id
where i.status = 'concluida';

revoke all on public.vw_itens, public.vw_produtividade from anon, authenticated;
grant select on public.vw_itens, public.vw_produtividade to authenticated;

-- ---------------------------------------------------------------- tempo real (SCHEMA.md §Tempo real)
-- replica identity full: o UPDATE chega com a linha inteira; o Realtime aplica a RLS de cada assinante.
alter table public.itens                 replica identity full;
alter table public.item_responsaveis     replica identity full;
alter table public.checklist_itens       replica identity full;
alter table public.dependencias          replica identity full;
alter table public.solicitacoes          replica identity full;
alter table public.solicitacao_mensagens replica identity full;
alter table public.comentarios           replica identity full;
alter table public.anexos                replica identity full;

alter publication supabase_realtime add table
  public.itens, public.item_responsaveis, public.checklist_itens, public.dependencias,
  public.solicitacoes, public.solicitacao_mensagens, public.comentarios, public.anexos;
