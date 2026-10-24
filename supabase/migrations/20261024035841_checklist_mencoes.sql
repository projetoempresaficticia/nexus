-- T-47 · Pedido do Germano (2026-10-24): marcar pessoas com @ nos passos do checklist (US-40).
-- O texto do passo passa a aceitar a mesma marcação de menção do editor rico
-- (<span class="mention" data-uid="…">@Nome</span>); quem é marcado é avisado e passa a ver o item,
-- como numa menção em comentário.

comment on column public.checklist_itens.texto is
  'Texto do passo; pode ter menções <span class="mention" data-uid="uuid">@Nome</span> (sanitizado no navegador).';

create table public.checklist_mencoes (
  checklist_id uuid not null references public.checklist_itens (id) on delete cascade,
  perfil_id    uuid not null references public.perfis (id),
  primary key (checklist_id, perfil_id)
);
create index checklist_mencoes_perfil_idx on public.checklist_mencoes (perfil_id);

alter table public.checklist_mencoes enable row level security;
revoke all on public.checklist_mencoes from anon, authenticated;
grant select on public.checklist_mencoes to authenticated;
-- só leitura: quem grava é o trigger abaixo
create policy checklist_men_select on public.checklist_mencoes for select to authenticated
  using (exists (select 1 from public.checklist_itens c where c.id = checklist_id));

-- ---------------------------------------------------------------- menções a partir do texto
create function privado.checklist_sincronizar_mencoes()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_citados uuid[];
  v_novos   uuid[];
  v_p       uuid;
  v_nome    text;
begin
  select coalesce(array_agg(distinct p.id), '{}') into v_citados
  from regexp_matches(new.texto, 'data-uid="([0-9a-fA-F-]{36})"', 'g') as m(g)
  join public.perfis p on p.id = m.g[1]::uuid and p.ativo;

  select coalesce(array_agg(x), '{}') into v_novos
  from unnest(v_citados) as x
  where not exists (select 1 from public.checklist_mencoes where checklist_id = new.id and perfil_id = x);

  delete from public.checklist_mencoes where checklist_id = new.id and perfil_id <> all (v_citados);
  insert into public.checklist_mencoes (checklist_id, perfil_id) select new.id, x from unnest(v_novos) as x;

  select nome into v_nome from public.itens where id = new.item_id;
  foreach v_p in array v_novos loop
    perform privado.notificar('mencao', v_p, new.item_id,
      jsonb_build_object('nome', v_nome, 'checklist_id', new.id));
  end loop;
  return null;
end;
$$;
revoke all on function privado.checklist_sincronizar_mencoes() from public, anon, authenticated;

create trigger checklist_itens_mencoes
  after insert or update of texto on public.checklist_itens
  for each row execute function privado.checklist_sincronizar_mencoes();

-- ---------------------------------------------------------------- envolvimento: + menção no checklist
create or replace function privado.itens_envolvidos()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select r.item_id from public.item_responsaveis r
  where r.perfil_id = (select privado.meu_perfil_id())
  union
  select i.id from public.itens i
  where i.criado_por = (select privado.meu_perfil_id())
     or i.aprovador_id = (select privado.meu_perfil_id())
  union
  select s.item_id from public.solicitacoes s
  where s.de_id = (select privado.meu_perfil_id()) or s.para_id = (select privado.meu_perfil_id())
  union
  select c.item_id from public.mencoes m join public.comentarios c on c.id = m.comentario_id
  where m.perfil_id = (select privado.meu_perfil_id())
  union
  select c.item_id from public.checklist_mencoes m join public.checklist_itens c on c.id = m.checklist_id
  where m.perfil_id = (select privado.meu_perfil_id());
$$;

-- ---------------------------------------------------------------- vw_itens: 'mencao' também pelo checklist
create or replace view public.vw_itens with (security_invoker = true) as
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
                      where c.item_id = i.id and m.perfil_id = (select privado.meu_perfil_id()))
           or exists (select 1 from public.checklist_mencoes m join public.checklist_itens c on c.id = m.checklist_id
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
