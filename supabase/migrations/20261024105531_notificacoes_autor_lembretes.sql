-- T-36 · Notificações por e-mail (US-30).
-- 1) Quem fez a ação ({autor} nos e-mails do GLOSSARIO_UI): gravado na hora em que a notificação nasce.
-- 2) Lembrete diário "vence amanhã" para os responsáveis de itens abertos (chamado pelo pg_cron às
--    08:00 de Lisboa; ver supabase/agendamentos.sql).

alter table public.notificacoes
  add column autor_id uuid references public.perfis (id) on delete set null
  default privado.meu_perfil_id();
create index notificacoes_autor_idx on public.notificacoes (autor_id);

-- Um lembrete por (item, responsável, dia); só itens não concluídos que vencem amanhã em Lisboa.
create function privado.enfileirar_lembretes()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_hoje    date := (now() at time zone 'Europe/Lisbon')::date;
  v_amanha  date := v_hoje + 1;
  v_qtd     integer;
begin
  insert into public.notificacoes (tipo, destinatario_id, item_id, dados, autor_id)
  select 'lembrete_prazo', r.perfil_id, i.id,
         jsonb_build_object('nome', i.nome, 'prazo', i.prazo, 'status', i.status), null
  from public.itens i
  join public.item_responsaveis r on r.item_id = i.id
  join public.perfis p on p.id = r.perfil_id and p.ativo
  where i.prazo = v_amanha and i.status <> 'concluida'
    and not exists (
      select 1 from public.notificacoes n
      where n.tipo = 'lembrete_prazo' and n.item_id = i.id and n.destinatario_id = r.perfil_id
        and (n.criado_em at time zone 'Europe/Lisbon')::date = v_hoje);
  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;
revoke all on function privado.enfileirar_lembretes() from public, anon, authenticated;
