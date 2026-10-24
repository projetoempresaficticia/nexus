-- T-45 · Pedido do Germano (2026-10-24): comentários, solicitações e mensagens de solicitação
-- só podem ser editados e excluídos por quem os criou. O líder deixa de apagar comentário alheio
-- e de cancelar solicitação alheia (SEGURANCA.md §3 atualizado).

-- ---------------------------------------------------------------- comentários: só o autor apaga
drop policy com_delete on public.comentarios;
create policy com_delete on public.comentarios for delete to authenticated
  using (autor_id = (select privado.meu_perfil_id()));

-- ---------------------------------------------------------------- solicitações: "(editado)"
alter table public.solicitacoes add column editado_em timestamptz;

-- ---------------------------------------------------------------- mensagens: o autor edita e apaga
alter table public.solicitacao_mensagens add column editado_em timestamptz;

-- editado_em é carimbado aqui, não pelo navegador; o autor e a solicitação não mudam
create function privado.mensagem_antes_editar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.editado_em := now();
  new.autor_id := old.autor_id;
  new.solicitacao_id := old.solicitacao_id;
  new.criado_em := old.criado_em;
  return new;
end;
$$;
revoke all on function privado.mensagem_antes_editar() from public, anon, authenticated;
create trigger solicitacao_mensagens_antes_editar
  before update on public.solicitacao_mensagens
  for each row execute function privado.mensagem_antes_editar();

grant update (texto_html), delete on public.solicitacao_mensagens to authenticated;

create policy solic_msg_update on public.solicitacao_mensagens for update to authenticated
  using (autor_id = (select privado.meu_perfil_id()))
  with check (autor_id = (select privado.meu_perfil_id()));
create policy solic_msg_delete on public.solicitacao_mensagens for delete to authenticated
  using (autor_id = (select privado.meu_perfil_id()));

-- ---------------------------------------------------------------- editar_solicitacao
-- Só o autor e só enquanto pendente (depois de respondida, mudar a pergunta confundiria a conversa).
-- Se o item está bloqueado com o texto desta solicitação como motivo, o motivo acompanha.
create function public.editar_solicitacao(p_id uuid, p_texto_html text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sol   public.solicitacoes%rowtype;
  v_antes text;
begin
  select * into v_sol from public.solicitacoes where id = p_id;
  if not found or privado.meu_perfil_id() is null then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if v_sol.de_id <> privado.meu_perfil_id() then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  if v_sol.status <> 'pendente' then
    raise exception using errcode = 'P0001', message = 'ja_respondida';
  end if;
  if length(trim(coalesce(p_texto_html, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'texto_obrigatorio';
  end if;

  v_antes := v_sol.texto_html;
  update public.solicitacoes set texto_html = p_texto_html, editado_em = now() where id = p_id
  returning * into v_sol;
  update public.itens set motivo_bloqueio_html = p_texto_html
  where id = v_sol.item_id and status = 'bloqueada' and motivo_bloqueio_html = v_antes;

  return jsonb_build_object(
    'solicitacao', to_jsonb(v_sol),
    'item', (select to_jsonb(v) from public.vw_itens v where v.id = v_sol.item_id));
end;
$$;
revoke all on function public.editar_solicitacao(uuid, text) from public, anon;
grant execute on function public.editar_solicitacao(uuid, text) to authenticated;

-- ---------------------------------------------------------------- cancelar_solicitacao = excluir
-- Agora só o autor, em qualquer status; o item volta a andar se não sobrar pendente.
create or replace function public.cancelar_solicitacao(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sol public.solicitacoes%rowtype;
begin
  select * into v_sol from public.solicitacoes where id = p_id;
  if not found or privado.meu_perfil_id() is null then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if v_sol.de_id <> privado.meu_perfil_id() then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  delete from public.solicitacoes where id = p_id;
  perform privado.liberar_item_se_sem_pendentes(v_sol.item_id);
  return jsonb_build_object('item', (select to_jsonb(v) from public.vw_itens v where v.id = v_sol.item_id));
end;
$$;
