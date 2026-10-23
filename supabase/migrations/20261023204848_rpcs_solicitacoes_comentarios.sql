-- T-10 · RPCs de solicitações e comentários (API.md §RPCs; FLUXOS.md §2)

-- ---------------------------------------------------------------- auxiliar: item volta a andar
-- Sem solicitações pendentes, um item Bloqueado/Aguardando volta a Em andamento.
create function privado.liberar_item_se_sem_pendentes(p_item uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.solicitacoes where item_id = p_item and status = 'pendente') then
    update public.itens
    set status = 'em_andamento', motivo_bloqueio_html = null, aprovador_id = null
    where id = p_item and status in ('bloqueada', 'aguardando_aprovacao');
  end if;
end;
$$;
revoke all on function privado.liberar_item_se_sem_pendentes(uuid) from public, anon, authenticated;

create function privado.resposta_solicitacao(p_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'solicitacao', (select to_jsonb(s) from public.solicitacoes s where s.id = p_id),
    'item', (select to_jsonb(v) from public.vw_itens v
             where v.id = (select s.item_id from public.solicitacoes s where s.id = p_id)));
$$;
revoke all on function privado.resposta_solicitacao(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- abrir_solicitacao
-- Informação/Ação → item Bloqueado (motivo = texto), se ainda não estiver. Aprovação → Aguardando (aprovador = destinatário).
create function public.abrir_solicitacao(p_item_id uuid, p_para_id uuid, p_tipo public.tipo_solicitacao, p_texto_html text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_eu   uuid := privado.meu_perfil_id();
  v_item public.itens%rowtype;
  v_id   uuid;
begin
  if v_eu is null or not privado.pode_ver_item(p_item_id) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  if not exists (select 1 from public.perfis where id = p_para_id and ativo) then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;

  insert into public.solicitacoes (item_id, de_id, para_id, tipo, texto_html)
  values (p_item_id, v_eu, p_para_id, p_tipo, p_texto_html)
  returning id into v_id;

  select * into v_item from public.itens where id = p_item_id;
  if p_tipo = 'aprovacao' then
    update public.itens set status = 'aguardando_aprovacao', aprovador_id = p_para_id, motivo_bloqueio_html = null
    where id = p_item_id;
  elsif v_item.status <> 'bloqueada' then
    update public.itens set status = 'bloqueada', motivo_bloqueio_html = p_texto_html, aprovador_id = null
    where id = p_item_id;
  end if;

  perform privado.notificar('solicitacao_recebida', p_para_id, p_item_id,
    jsonb_build_object('nome', v_item.nome, 'tipo', p_tipo, 'solicitacao_id', v_id));
  return privado.resposta_solicitacao(v_id);
end;
$$;

-- ---------------------------------------------------------------- responder_solicitacao
create function public.responder_solicitacao(p_id uuid, p_resultado public.status_solicitacao, p_mensagem_html text default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_eu    uuid := privado.meu_perfil_id();
  v_sol   public.solicitacoes%rowtype;
  v_setor uuid;
begin
  select * into v_sol from public.solicitacoes where id = p_id;
  if not found or v_eu is null then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  select setor_id into v_setor from public.itens where id = v_sol.item_id;
  if v_sol.para_id <> v_eu and not privado.administra_setor(v_setor) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  if v_sol.status <> 'pendente' then
    raise exception using errcode = 'P0001', message = 'ja_respondida';
  end if;
  if (v_sol.tipo = 'aprovacao' and p_resultado not in ('aprovada', 'recusada'))
     or (v_sol.tipo <> 'aprovacao' and p_resultado <> 'resolvida') then
    raise exception using errcode = 'P0001', message = 'resposta_invalida';
  end if;

  if length(trim(coalesce(p_mensagem_html, ''))) > 0 then
    insert into public.solicitacao_mensagens (solicitacao_id, autor_id, texto_html) values (p_id, v_eu, p_mensagem_html);
  end if;
  update public.solicitacoes set status = p_resultado, respondido_em = now() where id = p_id;

  perform privado.liberar_item_se_sem_pendentes(v_sol.item_id);
  if p_resultado = 'recusada' then
    insert into public.comentarios (item_id, autor_id, texto_html)
    values (v_sol.item_id, v_eu, '<p><b>Aprovação recusada.</b></p>' || coalesce(p_mensagem_html, ''));
  end if;

  perform privado.notificar('solicitacao_respondida', v_sol.de_id, v_sol.item_id,
    jsonb_build_object('resultado', p_resultado, 'solicitacao_id', p_id));
  return privado.resposta_solicitacao(p_id);
end;
$$;

-- ---------------------------------------------------------------- cancelar_solicitacao
-- Autor (pendente) ou líder/adm do setor apaga a solicitação; o item volta a andar se não sobrar pendente.
create function public.cancelar_solicitacao(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sol   public.solicitacoes%rowtype;
  v_setor uuid;
begin
  select * into v_sol from public.solicitacoes where id = p_id;
  if not found or privado.meu_perfil_id() is null then
    raise exception using errcode = 'P0001', message = 'nao_encontrado';
  end if;
  select setor_id into v_setor from public.itens where id = v_sol.item_id;
  if not ((v_sol.de_id = privado.meu_perfil_id() and v_sol.status = 'pendente')
          or privado.administra_setor(v_setor)) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;

  delete from public.solicitacoes where id = p_id;
  perform privado.liberar_item_se_sem_pendentes(v_sol.item_id);
  return jsonb_build_object('item', (select to_jsonb(v) from public.vw_itens v where v.id = v_sol.item_id));
end;
$$;

revoke all on function public.abrir_solicitacao(uuid, uuid, public.tipo_solicitacao, text),
  public.responder_solicitacao(uuid, public.status_solicitacao, text), public.cancelar_solicitacao(uuid) from public, anon;
grant execute on function public.abrir_solicitacao(uuid, uuid, public.tipo_solicitacao, text),
  public.responder_solicitacao(uuid, public.status_solicitacao, text), public.cancelar_solicitacao(uuid) to authenticated;
