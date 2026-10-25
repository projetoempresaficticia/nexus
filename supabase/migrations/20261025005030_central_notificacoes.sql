-- T-59 · Central de notificações (sino) e preferência de e-mail (pedido do Germano, 2026-10-25):
-- cada pessoa vê as próprias notificações na tela, sem precisar do e-mail, e escolhe se quer também
-- receber por e-mail. `notificacoes` já existia (T-36) só como fila de envio; agora também alimenta o sino.

alter table public.perfis add column receber_email_notificacoes boolean not null default true;

alter table public.notificacoes add column lido_em timestamptz;
create index notificacoes_nao_lidas_idx on public.notificacoes (destinatario_id) where lido_em is null;

-- lido_em é carimbado aqui, não pelo navegador (mesmo padrão de editado_em na T-45)
create function privado.notificacao_antes_marcar_lida()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lido_em := now();
  return new;
end;
$$;
revoke all on function privado.notificacao_antes_marcar_lida() from public, anon, authenticated;
create trigger notificacoes_antes_marcar_lida
  before update of lido_em on public.notificacoes
  for each row execute function privado.notificacao_antes_marcar_lida();

-- Cada pessoa lê e marca como lidas só as suas; a preferência de e-mail, só a sua própria.
grant select on public.notificacoes to authenticated;
grant update (lido_em) on public.notificacoes to authenticated;
grant update (receber_email_notificacoes) on public.perfis to authenticated;

create policy notif_select on public.notificacoes for select to authenticated
  using (destinatario_id = (select privado.meu_perfil_id()));
create policy notif_marcar_lida on public.notificacoes for update to authenticated
  using (destinatario_id = (select privado.meu_perfil_id()))
  with check (destinatario_id = (select privado.meu_perfil_id()));
create policy perfis_minha_preferencia on public.perfis for update to authenticated
  using (id = (select privado.meu_perfil_id()))
  with check (id = (select privado.meu_perfil_id()));

-- Tempo real: o sino atualiza sozinho (SCHEMA.md §Tempo real)
alter table public.notificacoes replica identity full;
alter publication supabase_realtime add table public.notificacoes;
