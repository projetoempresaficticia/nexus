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

revoke all on function public.criar_item(jsonb), public.atualizar_item(uuid, jsonb), public.definir_responsaveis(uuid, uuid[])
  from public, anon;
grant execute on function public.criar_item(jsonb), public.atualizar_item(uuid, jsonb), public.definir_responsaveis(uuid, uuid[])
  to authenticated;
