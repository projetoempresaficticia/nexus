-- T-09 · RPCs de itens (API.md §RPCs; FLUXOS.md §1, §4, §5)
-- Padrão: security definer + search_path vazio; a 1.ª coisa é validar permissão; erros P0001 com código.

-- ---------------------------------------------------------------- auxiliares
-- Perfil pode ser responsável num setor: vínculo direto, ou líder de um setor acima.
create function privado.perfil_no_setor(p_perfil uuid, p_setor uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.vinculos v
    join public.perfis p on p.id = v.perfil_id and p.ativo
    where v.perfil_id = p_perfil
      and (v.setor_id = p_setor
           or (v.papel = 'lider' and p_setor in (select d.id from privado.setores_descendentes(v.setor_id) as d(id))))
  );
$$;

-- Substitui a lista de responsáveis e notifica quem entrou. Chamada só por RPCs que já validaram permissão.
create function privado.gravar_responsaveis(p_item uuid, p_perfis uuid[])
returns uuid[]
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item  public.itens%rowtype;
  v_novos uuid[] := coalesce((select array_agg(distinct x) from unnest(p_perfis) as x where x is not null), '{}');
  v_p     uuid;
begin
  select * into v_item from public.itens where id = p_item;
  foreach v_p in array v_novos loop
    if not privado.perfil_no_setor(v_p, v_item.setor_id) then
      raise exception using errcode = 'P0001', message = 'responsavel_fora_do_setor';
    end if;
  end loop;

  delete from public.item_responsaveis where item_id = p_item and perfil_id <> all (v_novos);

  foreach v_p in array v_novos loop
    if not exists (select 1 from public.item_responsaveis where item_id = p_item and perfil_id = v_p) then
      insert into public.item_responsaveis (item_id, perfil_id, atribuido_por)
      values (p_item, v_p, (select privado.meu_perfil_id()));
      perform privado.notificar('atribuicao', v_p, p_item, jsonb_build_object('nome', v_item.nome));
    end if;
  end loop;

  return coalesce((select array_agg(perfil_id order by criado_em) from public.item_responsaveis where item_id = p_item), '{}');
end;
$$;

revoke all on function privado.perfil_no_setor(uuid, uuid), privado.gravar_responsaveis(uuid, uuid[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------- criar_item
-- Sem pai: precisa de vínculo no setor (ou administrá-lo). Com pai: ver o pai e ser do setor dele.
create function public.criar_item(p jsonb)
returns public.vw_itens
language plpgsql security definer
set search_path = ''
as $$
declare
  v_eu    uuid := privado.meu_perfil_id();
  v_pai   public.itens%rowtype;
  v_setor uuid := nullif(p ->> 'setor_id', '')::uuid;
  v_id    uuid;
  v_linha public.vw_itens;
begin
  if v_eu is null then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  if nullif(p ->> 'pai_id', '') is not null then
    select * into v_pai from public.itens where id = (p ->> 'pai_id')::uuid;
    if not found or not privado.pode_ver_item(v_pai.id) then
      raise exception using errcode = 'P0001', message = 'nao_encontrado';
    end if;
    v_setor := v_pai.setor_id;
  elsif v_setor is null then
    raise exception using errcode = 'P0001', message = 'setor_obrigatorio';
  end if;

  if v_setor not in (select privado.setores_visiveis()) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  insert into public.itens (setor_id, pai_id, nivel, nome, descricao_html, prioridade, inicio, prazo, recorrencia, criado_por)
  values (
    v_setor,
    v_pai.id,
    (p ->> 'nivel')::smallint,
    p ->> 'nome',
    coalesce(p ->> 'descricao_html', ''),
    coalesce(nullif(p ->> 'prioridade', ''), 'media')::public.prioridade,
    nullif(p ->> 'inicio', '')::date,
    nullif(p ->> 'prazo', '')::date,
    nullif(p ->> 'recorrencia', '')::public.recorrencia,
    v_eu)
  returning id into v_id;

  if jsonb_typeof(p -> 'responsaveis') = 'array' then
    perform privado.gravar_responsaveis(v_id, array(select jsonb_array_elements_text(p -> 'responsaveis')::uuid));
  end if;

  select * into v_linha from public.vw_itens where id = v_id;
  return v_linha;
end;
$$;

-- ---------------------------------------------------------------- atualizar_item
-- Campos permitidos: nome, descricao_html, inicio, prazo, prioridade, recorrencia, ordem, pai_id
-- (pai_id: mover tarefa avulsa para um projeto do mesmo setor, ou tirá-la do projeto).
create function public.atualizar_item(p_id uuid, p_campos jsonb)
returns public.vw_itens
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item  public.itens%rowtype;
  v_alvo  public.itens%rowtype;
  v_linha public.vw_itens;
begin
  if not privado.pode_editar_item(p_id) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  select * into v_item from public.itens where id = p_id;

  if p_campos ? 'pai_id' and (p_campos ->> 'pai_id') is distinct from v_item.pai_id::text then
    if v_item.nivel <> 1 then
      raise exception using errcode = 'P0001', message = 'nivel_invalido';
    end if;
    if nullif(p_campos ->> 'pai_id', '') is not null then
      select * into v_alvo from public.itens where id = (p_campos ->> 'pai_id')::uuid;
      if not found or v_alvo.nivel <> 0 or not privado.pode_ver_item(v_alvo.id) then
        raise exception using errcode = 'P0001', message = 'nivel_invalido';
      end if;
      if v_alvo.setor_id <> v_item.setor_id and not privado.administra_setor(v_alvo.setor_id) then
        raise exception using errcode = 'P0001', message = 'sem_permissao';
      end if;
    end if;
  end if;

  update public.itens set
    nome           = case when p_campos ? 'nome' then p_campos ->> 'nome' else nome end,
    descricao_html = case when p_campos ? 'descricao_html' then coalesce(p_campos ->> 'descricao_html', '') else descricao_html end,
    inicio         = case when p_campos ? 'inicio' then nullif(p_campos ->> 'inicio', '')::date else inicio end,
    prazo          = case when p_campos ? 'prazo' then nullif(p_campos ->> 'prazo', '')::date else prazo end,
    prioridade     = case when p_campos ? 'prioridade' then (p_campos ->> 'prioridade')::public.prioridade else prioridade end,
    recorrencia    = case when p_campos ? 'recorrencia' then nullif(p_campos ->> 'recorrencia', '')::public.recorrencia else recorrencia end,
    ordem          = case when p_campos ? 'ordem' then (p_campos ->> 'ordem')::integer else ordem end,
    pai_id         = case when p_campos ? 'pai_id' then nullif(p_campos ->> 'pai_id', '')::uuid else pai_id end
  where id = p_id;

  select * into v_linha from public.vw_itens where id = p_id;
  return v_linha;
end;
$$;

-- ---------------------------------------------------------------- definir_responsaveis
create function public.definir_responsaveis(p_item uuid, p_perfis uuid[])
returns uuid[]
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.pode_editar_item(p_item) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  return privado.gravar_responsaveis(p_item, p_perfis);
end;
$$;

-- ---------------------------------------------------------------- mudar_status (+ recorrência)
-- Próxima data: soma o intervalo até ficar >= hoje (Lisboa). FLUXOS.md §4.
create function privado.proxima_data(p_base date, p_rec public.recorrencia)
returns date
language plpgsql immutable
set search_path = ''
as $$
declare
  v_passo interval := case p_rec
    when 'diaria' then interval '1 day'   when 'semanal' then interval '7 days'
    when 'quinzenal' then interval '14 days' when 'mensal' then interval '1 month'
    else interval '1 year' end;
  v_n    integer := 1;
  v_hoje date := (now() at time zone 'Europe/Lisbon')::date;
begin
  while (p_base + v_n * v_passo)::date < v_hoje loop
    v_n := v_n + 1;
  end loop;
  return (p_base + v_n * v_passo)::date;
end;
$$;
revoke all on function privado.proxima_data(date, public.recorrencia) from public, anon, authenticated;

create function public.mudar_status(p_id uuid, p_status public.status_item,
                                    p_motivo_html text default null, p_aprovador_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item  public.itens%rowtype;
  v_base  date;
  v_prazo date;
  v_novo  uuid;
  v_ret   jsonb;
begin
  if not privado.pode_editar_item(p_id) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  if p_status = 'bloqueada' and length(trim(coalesce(p_motivo_html, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'motivo_obrigatorio';
  end if;
  if p_status = 'aguardando_aprovacao'
     and not exists (select 1 from public.perfis where id = p_aprovador_id and ativo) then
    raise exception using errcode = 'P0001', message = 'aprovador_obrigatorio';
  end if;

  update public.itens set
    status               = p_status,
    motivo_bloqueio_html = case when p_status = 'bloqueada' then p_motivo_html end,
    aprovador_id         = case when p_status = 'aguardando_aprovacao' then p_aprovador_id end
  where id = p_id
  returning * into v_item;

  -- Concluir item recorrente: nasce a próxima ocorrência; a concluída perde a recorrência.
  if p_status = 'concluida' and v_item.recorrencia is not null then
    v_base  := coalesce(v_item.prazo, (now() at time zone 'Europe/Lisbon')::date);
    v_prazo := privado.proxima_data(v_base, v_item.recorrencia);

    insert into public.itens (setor_id, pai_id, nivel, nome, descricao_html, prioridade, inicio, prazo, recorrencia, ordem, criado_por)
    values (v_item.setor_id, v_item.pai_id, v_item.nivel, v_item.nome, v_item.descricao_html, v_item.prioridade,
            v_item.inicio + (v_prazo - v_base), v_prazo, v_item.recorrencia, v_item.ordem, privado.meu_perfil_id())
    returning id into v_novo;

    insert into public.item_responsaveis (item_id, perfil_id, atribuido_por)
    select v_novo, r.perfil_id, privado.meu_perfil_id() from public.item_responsaveis r where r.item_id = p_id;
    insert into public.checklist_itens (item_id, texto, feito, ordem)
    select v_novo, c.texto, false, c.ordem from public.checklist_itens c where c.item_id = p_id;

    update public.itens set recorrencia = null where id = p_id;
  end if;

  select jsonb_build_object(
    'item', (select to_jsonb(v) from public.vw_itens v where v.id = p_id),
    'novo_item_recorrente', (select to_jsonb(v) from public.vw_itens v where v.id = v_novo))
  into v_ret;
  return v_ret;
end;
$$;

-- ---------------------------------------------------------------- exclusão em cascata (FLUXOS.md §5)
create function public.contar_descendentes(p_id uuid)
returns integer
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not privado.pode_ver_item(p_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  return (
    with recursive abaixo(id) as (
      select f.id from public.itens f where f.pai_id = p_id
      union all
      select f.id from public.itens f join abaixo a on f.pai_id = a.id
    )
    select count(*)::int from abaixo);
end;
$$;

-- Líder/Adm do setor apaga qualquer item; o criador só apaga o seu item se ele não tiver filhos
-- (⚠️ A CONFIRMAR em SEGURANCA.md §3). Devolve os caminhos do Storage para a limpeza (T-23).
create function public.excluir_item(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_item      public.itens%rowtype;
  v_apagados  integer;
  v_caminhos  text[];
begin
  select * into v_item from public.itens where id = p_id;
  if not found or not privado.pode_ver_item(p_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if not (privado.administra_setor(v_item.setor_id)
          or (v_item.criado_por = privado.meu_perfil_id()
              and not exists (select 1 from public.itens f where f.pai_id = p_id))) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  with recursive arvore(id) as (
    select p_id
    union all
    select f.id from public.itens f join arvore a on f.pai_id = a.id
  )
  select (select count(*)::int from arvore),
         coalesce((select array_agg(an.caminho) from public.anexos an
                   where an.item_id in (select id from arvore) and an.caminho is not null), '{}')
  into v_apagados, v_caminhos;

  delete from public.itens where id = p_id;
  return jsonb_build_object('apagados', v_apagados, 'caminhos_storage', to_jsonb(v_caminhos));
end;
$$;

-- ---------------------------------------------------------------- dependências
create function public.definir_dependencia(p_item uuid, p_depende_de uuid, p_ligar boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.pode_editar_item(p_item) or not privado.pode_ver_item(p_depende_de) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  if p_ligar then
    insert into public.dependencias (item_id, depende_de_id) values (p_item, p_depende_de)
    on conflict do nothing;
  else
    delete from public.dependencias where item_id = p_item and depende_de_id = p_depende_de;
  end if;
end;
$$;

-- ---------------------------------------------------------------- permissões
revoke all on function
  public.criar_item(jsonb), public.atualizar_item(uuid, jsonb), public.definir_responsaveis(uuid, uuid[]),
  public.mudar_status(uuid, public.status_item, text, uuid), public.contar_descendentes(uuid),
  public.excluir_item(uuid), public.definir_dependencia(uuid, uuid, boolean)
  from public, anon;
grant execute on function
  public.criar_item(jsonb), public.atualizar_item(uuid, jsonb), public.definir_responsaveis(uuid, uuid[]),
  public.mudar_status(uuid, public.status_item, text, uuid), public.contar_descendentes(uuid),
  public.excluir_item(uuid), public.definir_dependencia(uuid, uuid, boolean)
  to authenticated;
