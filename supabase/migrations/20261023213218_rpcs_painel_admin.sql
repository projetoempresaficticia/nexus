-- T-11 · carregar_inicial, painel, carga de trabalho e RPCs de administração (API.md §RPCs)

-- ---------------------------------------------------------------- carregar_inicial
-- Tudo o que o shell precisa num só pedido (US-01, US-06, US-31).
-- setores: visíveis + ancestrais (só nome/pai, para a linha de decisão da Equipe), com `visivel`.
create function public.carregar_inicial()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_eu uuid := privado.meu_perfil_id();
begin
  if v_eu is null then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  return (
    with recursive
      visiveis(id) as (select privado.setores_visiveis()),
      arvore(id) as (
        select id from visiveis
        union
        select s.pai_id from public.setores s join arvore a on s.id = a.id where s.pai_id is not null
      )
    select jsonb_build_object(
      'perfil', (select to_jsonb(p) from public.perfis p where p.id = v_eu),
      'vinculos', coalesce((select jsonb_agg(jsonb_build_object('setor_id', v.setor_id, 'papel', v.papel))
                            from public.vinculos v where v.perfil_id = v_eu), '[]'),
      'setores', coalesce((select jsonb_agg(jsonb_build_object(
                             'id', s.id, 'nome', s.nome, 'pai_id', s.pai_id, 'ativo', s.ativo,
                             'visivel', s.id in (select id from visiveis))
                             order by s.nome)
                           from public.setores s where s.id in (select id from arvore)), '[]'),
      'pessoas', coalesce((select jsonb_agg(jsonb_build_object(
                             'id', p.id, 'nome', p.nome, 'iniciais', p.iniciais, 'email', p.email,
                             'vinculos', coalesce((select jsonb_agg(jsonb_build_object('setor_id', v.setor_id, 'papel', v.papel))
                                                   from public.vinculos v
                                                   where v.perfil_id = p.id and v.setor_id in (select id from arvore)), '[]'))
                             order by p.nome)
                           from public.perfis p where p.ativo), '[]'),
      'setores_administrados', coalesce((select jsonb_agg(a.id) from privado.setores_administrados() as a(id)), '[]')
    ));
end;
$$;

-- ---------------------------------------------------------------- painel (US-28) e carga (US-26)
create function privado.exigir_administrar(p_setores uuid[])
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_setores is null or cardinality(p_setores) = 0
     or exists (select 1 from unnest(p_setores) as s where s not in (select privado.setores_administrados())) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
end;
$$;
revoke all on function privado.exigir_administrar(uuid[]) from public, anon, authenticated;

-- KPIs contam tarefas e subtarefas (nível > 0). parados: bloqueados/aguardando, mais antigos primeiro.
create function public.resumo_painel(p_setores uuid[])
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
begin
  perform privado.exigir_administrar(p_setores);
  return (
    select jsonb_build_object(
      'abertas',        count(*) filter (where i.status <> 'concluida'),
      'atrasadas',      count(*) filter (where i.status <> 'concluida' and i.prazo < v_hoje),
      'bloqueadas',     count(*) filter (where i.status = 'bloqueada'),
      'aguardando',     count(*) filter (where i.status = 'aguardando_aprovacao'),
      'concluidas_mes', count(*) filter (where i.status = 'concluida'
                          and date_trunc('month', i.concluido_em at time zone 'Europe/Lisbon') = date_trunc('month', v_hoje::timestamp)),
      'parados', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', x.id, 'nome', x.nome, 'nivel', x.nivel, 'setor_id', x.setor_id, 'pai_id', x.pai_id,
                 'status', x.status, 'motivo_html', x.motivo_bloqueio_html, 'parado_desde', x.parado_desde,
                 'dias', v_hoje - (x.parado_desde at time zone 'Europe/Lisbon')::date,
                 'pendente_com', (select s.para_id from public.solicitacoes s
                                  where s.item_id = x.id and s.status = 'pendente' order by s.criado_em limit 1))
               order by x.parado_desde)
        from public.itens x
        where x.setor_id = any (p_setores) and x.status in ('bloqueada', 'aguardando_aprovacao')), '[]'))
    from public.itens i
    where i.setor_id = any (p_setores) and i.nivel > 0);
end;
$$;

-- Itens abertos por responsável e semana do prazo (segunda-feira).
create function public.carga_trabalho(p_setores uuid[], p_de date, p_ate date)
returns table (perfil_id uuid, semana date, qtd integer)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform privado.exigir_administrar(p_setores);
  return query
    select r.perfil_id, date_trunc('week', i.prazo)::date, count(*)::integer
    from public.itens i
    join public.item_responsaveis r on r.item_id = i.id
    where i.setor_id = any (p_setores) and i.nivel > 0 and i.status <> 'concluida'
      and i.prazo between p_de and p_ate
    group by 1, 2
    order by 2, 1;
end;
$$;

-- ---------------------------------------------------------------- administração (só Adm do sistema)
create function privado.exigir_admin()
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not privado.eh_admin() then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
end;
$$;
revoke all on function privado.exigir_admin() from public, anon, authenticated;

-- Cria (sem id) ou altera nome/pai/ativo de um setor. Ciclo → ciclo_setor (trigger).
create function public.salvar_setor(p jsonb)
returns public.setores
language plpgsql security definer
set search_path = ''
as $$
declare
  v_setor public.setores;
begin
  perform privado.exigir_admin();
  if nullif(p ->> 'id', '') is null then
    insert into public.setores (nome, pai_id, ativo, criado_por)
    values (p ->> 'nome', nullif(p ->> 'pai_id', '')::uuid, coalesce((p ->> 'ativo')::boolean, true), privado.meu_perfil_id())
    returning * into v_setor;
  else
    update public.setores set
      nome   = case when p ? 'nome' then p ->> 'nome' else nome end,
      pai_id = case when p ? 'pai_id' then nullif(p ->> 'pai_id', '')::uuid else pai_id end,
      ativo  = case when p ? 'ativo' then (p ->> 'ativo')::boolean else ativo end
    where id = (p ->> 'id')::uuid
    returning * into v_setor;
    if not found then
      raise exception using errcode = 'P0001', message = 'nao_encontrado';
    end if;
  end if;
  return v_setor;
end;
$$;

-- Substitui todos os vínculos da pessoa: p_vinculos = [{"setor_id": "...", "papel": "lider|membro"}].
create function public.salvar_vinculos(p_perfil_id uuid, p_vinculos jsonb)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  perform privado.exigir_admin();
  if not exists (select 1 from public.perfis where id = p_perfil_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;

  delete from public.vinculos v
  where v.perfil_id = p_perfil_id
    and v.setor_id not in (select (e ->> 'setor_id')::uuid from jsonb_array_elements(p_vinculos) as e);

  insert into public.vinculos (perfil_id, setor_id, papel)
  select p_perfil_id, (e ->> 'setor_id')::uuid, (e ->> 'papel')::public.papel_setor
  from jsonb_array_elements(p_vinculos) as e
  on conflict (perfil_id, setor_id) do update set papel = excluded.papel
  where public.vinculos.papel is distinct from excluded.papel;

  return coalesce((select jsonb_agg(jsonb_build_object('setor_id', setor_id, 'papel', papel))
                   from public.vinculos where perfil_id = p_perfil_id), '[]');
end;
$$;

-- Passa as responsabilidades de uma pessoa para outra (ex.: ao desativar). p_ids nulo = todos os itens abertos.
create function public.reatribuir_itens(p_de uuid, p_para uuid, p_ids uuid[] default null)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_qtd integer;
begin
  perform privado.exigir_admin();
  if not exists (select 1 from public.perfis where id = p_para and ativo) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;

  with alvo as (
    select r.item_id from public.item_responsaveis r
    join public.itens i on i.id = r.item_id
    where r.perfil_id = p_de
      and (p_ids is null and i.status <> 'concluida' or r.item_id = any (p_ids))
  ), novos as (
    insert into public.item_responsaveis (item_id, perfil_id, atribuido_por)
    select item_id, p_para, privado.meu_perfil_id() from alvo
    on conflict do nothing
  ), apagados as (
    delete from public.item_responsaveis r using alvo
    where r.item_id = alvo.item_id and r.perfil_id = p_de
    returning 1
  )
  select count(*)::integer into v_qtd from apagados;

  return v_qtd;
end;
$$;

-- ---------------------------------------------------------------- permissões
revoke all on function public.carregar_inicial(), public.resumo_painel(uuid[]), public.carga_trabalho(uuid[], date, date),
  public.salvar_setor(jsonb), public.salvar_vinculos(uuid, jsonb), public.reatribuir_itens(uuid, uuid, uuid[])
  from public, anon;
grant execute on function public.carregar_inicial(), public.resumo_painel(uuid[]), public.carga_trabalho(uuid[], date, date),
  public.salvar_setor(jsonb), public.salvar_vinculos(uuid, jsonb), public.reatribuir_itens(uuid, uuid, uuid[])
  to authenticated;
