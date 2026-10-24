-- T-33 · Usuários (US-03, US-04): cadastrar, desativar e reativar pessoas pelo Adm.
-- Em vez das Edge Functions previstas, são RPCs (DECISOES 2026-10-24): não é preciso criar conta no
-- Auth — o perfil liga-se ao login Google no primeiro acesso (trigger da T-12) — e perder o acesso é
-- imediato porque privado.meu_perfil_id() só devolve perfis ativos.

-- ---------------------------------------------------------------- cadastrar_usuario
-- p_vinculos: [{"setor_id": uuid, "papel": "lider"|"membro"}]. Iniciais calculadas do nome.
create function public.cadastrar_usuario(p_email text, p_nome text, p_vinculos jsonb default '[]')
returns public.perfis
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_nome   text := trim(coalesce(p_nome, ''));
  v_partes text[];
  v_iniciais text;
  v_perfil public.perfis%rowtype;
begin
  perform privado.exigir_admin();
  if v_email !~ '^[^@\s]+@estudeemportugal\.org$' then
    raise exception using errcode = 'P0001', message = 'email_invalido';
  end if;
  if length(v_nome) = 0 then
    raise exception using errcode = 'P0001', message = 'nome_obrigatorio';
  end if;
  if exists (select 1 from public.perfis where email = v_email::extensions.citext) then
    raise exception using errcode = 'P0001', message = 'email_ja_cadastrado';
  end if;

  -- "Ana Ribeiro" → AR; "Ana" → AN; "A" → AA
  v_partes := regexp_split_to_array(v_nome, '\s+');
  v_iniciais := upper(case when cardinality(v_partes) > 1
                           then left(v_partes[1], 1) || left(v_partes[cardinality(v_partes)], 1)
                           else rpad(left(v_partes[1], 2), 2, left(v_partes[1], 1)) end);
  insert into public.perfis (email, nome, iniciais) values (v_email, v_nome, v_iniciais)
  returning * into v_perfil;

  insert into public.vinculos (perfil_id, setor_id, papel)
  select v_perfil.id, (e ->> 'setor_id')::uuid, (e ->> 'papel')::public.papel_setor
  from jsonb_array_elements(coalesce(p_vinculos, '[]')) as e;

  perform privado.notificar('boas_vindas', v_perfil.id, null, jsonb_build_object('nome', v_perfil.nome));
  return v_perfil;
end;
$$;

-- ---------------------------------------------------------------- desativar / reativar
-- Mantém o histórico (nada é apagado). Devolve os itens abertos da pessoa para reatribuir.
create function public.desativar_usuario(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  perform privado.exigir_admin();
  if p_id = privado.meu_perfil_id() then
    raise exception using errcode = 'P0001', message = 'nao_desativa_a_si';
  end if;
  update public.perfis set ativo = false, desativado_em = now() where id = p_id and ativo;
  if not found and not exists (select 1 from public.perfis where id = p_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object('id', i.id, 'nome', i.nome, 'nivel', i.nivel,
                                        'setor_id', i.setor_id, 'prazo', i.prazo, 'status', i.status)
                     order by i.prazo nulls last, i.nome)
    from public.itens i
    join public.item_responsaveis r on r.item_id = i.id
    where r.perfil_id = p_id and i.status <> 'concluida'), '[]');
end;
$$;

create function public.reativar_usuario(p_id uuid)
returns public.perfis
language plpgsql security definer
set search_path = ''
as $$
declare
  v_perfil public.perfis%rowtype;
begin
  perform privado.exigir_admin();
  update public.perfis set ativo = true, desativado_em = null where id = p_id
  returning * into v_perfil;
  if not found then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  return v_perfil;
end;
$$;

revoke all on function public.cadastrar_usuario(text, text, jsonb), public.desativar_usuario(uuid),
  public.reativar_usuario(uuid) from public, anon;
grant execute on function public.cadastrar_usuario(text, text, jsonb), public.desativar_usuario(uuid),
  public.reativar_usuario(uuid) to authenticated;

-- ---------------------------------------------------------------- nomes de quem saiu (US-04)
-- Comentários, histórico e solicitações antigas continuam a mostrar o nome: só id, nome e iniciais.
create function public.pessoas_inativas()
returns table (id uuid, nome text, iniciais text)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nome, p.iniciais from public.perfis p
  where not p.ativo and (select privado.meu_perfil_id()) is not null
  order by p.nome;
$$;
revoke all on function public.pessoas_inativas() from public, anon;
grant execute on function public.pessoas_inativas() to authenticated;
