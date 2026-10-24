-- T-51b · Pedido do Germano (2026-10-24): o líder também renomeia, move, desativa e exclui os
-- subsetores que estão ABAIXO dele — nunca o próprio setor nem os de cima.
-- Regra: pode mexer no setor S se administra o setor de cima de S (S é estritamente abaixo de um setor
-- que lidera). Ao mover, o novo setor de cima também tem de ser um que administra (não sobe acima
-- dele nem vira setor principal). O Adm continua podendo tudo.

create function privado.pode_editar_setor(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select privado.eh_admin()
      or exists (select 1 from public.setores s
                 where s.id = p_id and s.pai_id is not null and privado.administra_setor(s.pai_id));
$$;
revoke all on function privado.pode_editar_setor(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- salvar_setor (só alteração muda)
-- Criar continua por insert direto (RLS: Adm em qualquer lugar, líder abaixo do que administra).
create or replace function public.salvar_setor(p jsonb)
returns public.setores
language plpgsql security definer
set search_path = ''
as $$
declare
  v_setor  public.setores;
  v_id     uuid := nullif(p ->> 'id', '')::uuid;
  v_novo_pai uuid := nullif(p ->> 'pai_id', '')::uuid;
begin
  if v_id is null then
    perform privado.exigir_admin();
    insert into public.setores (nome, pai_id, ativo, criado_por)
    values (p ->> 'nome', v_novo_pai, coalesce((p ->> 'ativo')::boolean, true), privado.meu_perfil_id())
    returning * into v_setor;
    return v_setor;
  end if;

  if not exists (select 1 from public.setores where id = v_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if not privado.pode_editar_setor(v_id) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  -- Líder: o destino precisa de ser um setor que administra (nunca acima dele nem setor principal)
  if p ? 'pai_id' and not privado.eh_admin()
     and (v_novo_pai is null or not privado.administra_setor(v_novo_pai)) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  update public.setores set
    nome   = case when p ? 'nome' then p ->> 'nome' else nome end,
    pai_id = case when p ? 'pai_id' then v_novo_pai else pai_id end,
    ativo  = case when p ? 'ativo' then (p ->> 'ativo')::boolean else ativo end
  where id = v_id
  returning * into v_setor;
  return v_setor;
end;
$$;

-- ---------------------------------------------------------------- excluir_setor
create or replace function public.excluir_setor(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.setores where id = p_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if not privado.pode_editar_setor(p_id) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  if exists (select 1 from public.setores where pai_id = p_id) then
    raise exception using errcode = 'P0001', message = 'setor_com_subsetores';
  end if;
  if exists (select 1 from public.itens where setor_id = p_id) then
    raise exception using errcode = 'P0001', message = 'setor_com_itens';
  end if;
  if exists (select 1 from public.vinculos where setor_id = p_id) then
    raise exception using errcode = 'P0001', message = 'setor_com_pessoas';
  end if;
  delete from public.setores where id = p_id;
end;
$$;
