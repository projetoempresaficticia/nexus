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
