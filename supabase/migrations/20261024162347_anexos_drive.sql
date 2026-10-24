-- T-52 · Anexos no Google Drive (pedido do Germano, 2026-10-24 — "plano B"): o arquivo vai para o
-- Drive partilhado da empresa (pasta por setor) pela Edge Function enviar-anexo, e o Nexus guarda a
-- linha com o link (link_externo) e o id do arquivo no Drive (drive_id). Imagens coladas no texto
-- continuam no Storage (caminho).

alter table public.anexos add column drive_id text;
alter table public.anexos
  add constraint anexos_drive_tem_link check (drive_id is null or link_externo is not null);
create unique index anexos_drive_id_idx on public.anexos (drive_id) where drive_id is not null;

-- drive_id só pela Edge Function (service_role). Sem isto, alguém gravaria o id de OUTRO arquivo do
-- Drive e, ao apagar a própria linha, mandaria esse arquivo para a lixeira.
create function privado.anexos_proteger_drive_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.drive_id is distinct from (case when tg_op = 'UPDATE' then old.drive_id end)
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception using errcode = 'P0001', message = 'sem_permissao';
  end if;
  return new;
end;
$$;
revoke all on function privado.anexos_proteger_drive_id() from public, anon, authenticated;

create trigger anexos_proteger_drive_id
  before insert or update of drive_id on public.anexos
  for each row execute function privado.anexos_proteger_drive_id();

-- ---------------------------------------------------------------- fila de arquivos a apagar no Drive
-- Quando a linha some (remover anexo, excluir comentário ou item em cascata), o arquivo entra na fila;
-- a Edge Function limpar-anexos manda-o para a lixeira do Drive. A fila vem do banco, nunca do navegador.
create table public.anexos_drive_lixeira (
  drive_id  text primary key,
  criado_em timestamptz not null default now()
);
alter table public.anexos_drive_lixeira enable row level security;
revoke all on public.anexos_drive_lixeira from anon, authenticated;
-- Sem políticas de propósito: só a Edge Function (service_role) lê e apaga.

create function privado.anexos_drive_para_lixeira()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.anexos_drive_lixeira (drive_id) values (old.drive_id) on conflict do nothing;
  return old;
end;
$$;
revoke all on function privado.anexos_drive_para_lixeira() from public, anon, authenticated;

create trigger anexos_drive_lixeira
  after delete on public.anexos
  for each row when (old.drive_id is not null)
  execute function privado.anexos_drive_para_lixeira();

-- ---------------------------------------------------------------- permissões da service_role
-- Projetos Supabase novos (e o Supabase local recente) não dão permissões automáticas nas tabelas
-- novas, nem à service_role. As Edge Functions passam a ter só o que usam, de forma explícita.
grant select, update, delete on public.anexos to service_role;
grant select, delete on public.anexos_drive_lixeira to service_role;
grant select on public.itens, public.perfis, public.setores, public.vinculos, public.item_responsaveis,
  public.comentarios, public.checklist_itens, public.solicitacoes, public.solicitacao_mensagens
  to service_role;
grant select, update on public.notificacoes to service_role;
