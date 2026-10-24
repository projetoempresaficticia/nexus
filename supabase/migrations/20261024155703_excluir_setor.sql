-- T-51 · Excluir setor (pedido do Germano, 2026-10-24). Só o Adm e só setor VAZIO:
-- sem subsetores, sem itens (nem concluídos — o histórico conta) e sem pessoas vinculadas.
-- Setor com conteúdo se DESATIVA (salvar_setor), não se apaga. Sem este RPC, apagar direto
-- removeria em cascata os vínculos das pessoas sem aviso.

create function public.excluir_setor(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform privado.exigir_admin();
  if not exists (select 1 from public.setores where id = p_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
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

revoke all on function public.excluir_setor(uuid) from public, anon;
grant execute on function public.excluir_setor(uuid) to authenticated;
