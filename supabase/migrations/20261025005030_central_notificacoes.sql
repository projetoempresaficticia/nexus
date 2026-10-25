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

create policy notif_select on public.notificacoes for select to authenticated
  using (destinatario_id = (select privado.meu_perfil_id()));
create policy notif_marcar_lida on public.notificacoes for update to authenticated
  using (destinatario_id = (select privado.meu_perfil_id()))
  with check (destinatario_id = (select privado.meu_perfil_id()));

-- perfis já tem grant update de tabela inteira para authenticated (T-01), então um grant por coluna
-- não bastaria: um trigger barra qualquer coluna fora receber_email_notificacoes quando quem está
-- editando não é Adm (o Adm continua liberado pela policy perfis_admin_update de sempre).
create function privado.perfis_antes_minha_preferencia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- current_user só é "authenticated" numa chamada direta (REST, como a pessoa logada); funções
  -- internas (ex.: privado.ligar_perfil_ao_usuario, no 1º login) são security definer e rodam como
  -- o dono — essas continuam liberadas, a trava é só para quem está mexendo direto na tabela.
  if current_user = 'authenticated' and not privado.eh_admin() and (
    new.email is distinct from old.email or new.nome is distinct from old.nome or
    new.iniciais is distinct from old.iniciais or new.is_admin is distinct from old.is_admin or
    new.ativo is distinct from old.ativo or new.auth_id is distinct from old.auth_id or
    new.criado_em is distinct from old.criado_em or new.desativado_em is distinct from old.desativado_em or
    new.legacy_id is distinct from old.legacy_id
  ) then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  return new;
end;
$$;
revoke all on function privado.perfis_antes_minha_preferencia() from public, anon, authenticated;
create trigger perfis_antes_minha_preferencia
  before update on public.perfis
  for each row execute function privado.perfis_antes_minha_preferencia();

create policy perfis_minha_preferencia on public.perfis for update to authenticated
  using (id = (select privado.meu_perfil_id()))
  with check (id = (select privado.meu_perfil_id()));

-- A CHECK de email (T-56) roda de novo a cada update de perfis, mesmo sem mexer no e-mail — sem este
-- grant, mudar só a preferência já falhava com "permission denied for function email_permitido".
grant execute on function privado.email_permitido(text) to authenticated;

-- Tempo real: o sino atualiza sozinho (SCHEMA.md §Tempo real)
alter table public.notificacoes replica identity full;
alter publication supabase_realtime add table public.notificacoes;
