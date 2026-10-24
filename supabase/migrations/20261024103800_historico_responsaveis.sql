-- T-35 · Histórico no item (US-32): a troca de responsável também entra no histórico do item.
-- Os responsáveis vivem em item_responsaveis (vários por item), que não tinha auditoria.
-- Linha gravada como tabela 'itens', campo 'responsaveis': entra (valor_depois) ou sai (valor_antes)
-- o perfil_id — assim a RLS de historico (itens visíveis) já cobre.

create function privado.registrar_responsavel()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_linha public.item_responsaveis := coalesce(new, old);
begin
  -- item apagado em cascata: não registra cada responsável
  if tg_op = 'DELETE' and not exists (select 1 from public.itens where id = v_linha.item_id) then
    return null;
  end if;
  insert into public.historico (tabela, registro_id, perfil_id, acao, campo, valor_antes, valor_depois)
  values ('itens', v_linha.item_id, privado.meu_perfil_id(), 'update', 'responsaveis',
          case when tg_op = 'DELETE' then v_linha.perfil_id::text end,
          case when tg_op = 'INSERT' then v_linha.perfil_id::text end);
  return null;
end;
$$;
revoke all on function privado.registrar_responsavel() from public, anon, authenticated;

create trigger historico_responsaveis after insert or delete on public.item_responsaveis
  for each row execute function privado.registrar_responsavel();
