-- T-07 · Solicitações, mensagens, comentários, menções e anexos (SCHEMA.md; SEGURANCA.md §3–§4)

-- ---------------------------------------------------------------- tabelas
create table public.solicitacoes (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.itens (id) on delete cascade,
  de_id         uuid not null references public.perfis (id),
  para_id       uuid not null references public.perfis (id),
  tipo          public.tipo_solicitacao not null,
  texto_html    text not null check (length(trim(texto_html)) > 0),
  status        public.status_solicitacao not null default 'pendente',
  criado_em     timestamptz not null default now(),
  respondido_em timestamptz,
  legacy_id     text unique,
  constraint solicitacoes_pessoas_diferentes check (de_id <> para_id),
  -- aprovada/recusada só para aprovação; resolvida só para informação/ação
  constraint solicitacoes_status_por_tipo check (
    status = 'pendente'
    or (tipo = 'aprovacao' and status in ('aprovada', 'recusada'))
    or (tipo <> 'aprovacao' and status = 'resolvida'))
);
create index solicitacoes_para_pendentes_idx on public.solicitacoes (para_id) where status = 'pendente';
create index solicitacoes_item_idx on public.solicitacoes (item_id);
create index solicitacoes_de_idx on public.solicitacoes (de_id);
create index solicitacoes_para_idx on public.solicitacoes (para_id);

create table public.solicitacao_mensagens (
  id             uuid primary key default gen_random_uuid(),
  solicitacao_id uuid not null references public.solicitacoes (id) on delete cascade,
  autor_id       uuid not null references public.perfis (id),
  texto_html     text not null check (length(trim(texto_html)) > 0),
  criado_em      timestamptz not null default now()
);
create index solicitacao_mensagens_solicitacao_idx on public.solicitacao_mensagens (solicitacao_id, criado_em);
create index solicitacao_mensagens_autor_idx on public.solicitacao_mensagens (autor_id);

create table public.comentarios (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.itens (id) on delete cascade,
  autor_id   uuid not null references public.perfis (id),
  texto_html text not null check (length(trim(texto_html)) > 0),
  criado_em  timestamptz not null default now(),
  editado_em timestamptz,
  legacy_id  text unique
);
create index comentarios_item_idx on public.comentarios (item_id, criado_em);
create index comentarios_autor_idx on public.comentarios (autor_id);

create table public.mencoes (
  comentario_id uuid not null references public.comentarios (id) on delete cascade,
  perfil_id     uuid not null references public.perfis (id),
  primary key (comentario_id, perfil_id)
);
create index mencoes_perfil_idx on public.mencoes (perfil_id);

create table public.anexos (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.itens (id) on delete cascade,
  comentario_id uuid references public.comentarios (id) on delete cascade,
  nome          text not null check (length(trim(nome)) > 0),
  caminho       text,
  link_externo  text check (link_externo ~* '^https://'),
  tamanho_bytes bigint check (tamanho_bytes <= 20971520),
  mime          text,
  enviado_por   uuid not null references public.perfis (id),
  criado_em     timestamptz not null default now(),
  -- ou arquivo no Storage, ou link externo (Drive etc.) — nunca os dois
  constraint anexos_arquivo_ou_link check ((caminho is not null) <> (link_externo is not null))
);
create index anexos_item_idx on public.anexos (item_id);
create index anexos_comentario_idx on public.anexos (comentario_id);
create index anexos_enviado_por_idx on public.anexos (enviado_por);

-- ---------------------------------------------------------------- envolvimento: + solicitações e menções
create or replace function privado.itens_envolvidos()
returns setof uuid
language sql stable security definer
set search_path = ''
as $$
  select r.item_id from public.item_responsaveis r
  where r.perfil_id = (select privado.meu_perfil_id())
  union
  select i.id from public.itens i
  where i.criado_por = (select privado.meu_perfil_id())
     or i.aprovador_id = (select privado.meu_perfil_id())
  union
  select s.item_id from public.solicitacoes s
  where s.de_id = (select privado.meu_perfil_id()) or s.para_id = (select privado.meu_perfil_id())
  union
  select c.item_id from public.mencoes m join public.comentarios c on c.id = m.comentario_id
  where m.perfil_id = (select privado.meu_perfil_id());
$$;

-- ---------------------------------------------------------------- RLS e permissões
alter table public.solicitacoes          enable row level security;
alter table public.solicitacao_mensagens enable row level security;
alter table public.comentarios           enable row level security;
alter table public.mencoes               enable row level security;
alter table public.anexos                enable row level security;

revoke all on public.solicitacoes, public.solicitacao_mensagens, public.comentarios, public.mencoes, public.anexos
  from anon, authenticated;
-- solicitações e comentários mudam por RPC (T-10); aqui só o que é direto
grant select on public.solicitacoes, public.mencoes to authenticated;
grant select, insert on public.solicitacao_mensagens to authenticated;
grant select, delete on public.comentarios to authenticated;
grant select, insert, delete on public.anexos to authenticated;

create policy solic_select on public.solicitacoes for select to authenticated
  using (de_id = (select privado.meu_perfil_id())
         or para_id = (select privado.meu_perfil_id())
         or item_id in (select privado.itens_visiveis()));

-- mensagens herdam a RLS de solicitacoes (o exists só enxerga solicitações visíveis)
create policy solic_msg_select on public.solicitacao_mensagens for select to authenticated
  using (exists (select 1 from public.solicitacoes s where s.id = solicitacao_id));
create policy solic_msg_insert on public.solicitacao_mensagens for insert to authenticated
  with check (autor_id = (select privado.meu_perfil_id())
              and exists (select 1 from public.solicitacoes s where s.id = solicitacao_id));

create policy com_select on public.comentarios for select to authenticated
  using (item_id in (select privado.itens_visiveis()));
create policy com_delete on public.comentarios for delete to authenticated
  using (autor_id = (select privado.meu_perfil_id())
         or (select i.setor_id from public.itens i where i.id = item_id) in (select privado.setores_administrados()));

create policy men_select on public.mencoes for select to authenticated
  using (exists (select 1 from public.comentarios c where c.id = comentario_id));

create policy anexos_select on public.anexos for select to authenticated
  using (item_id in (select privado.itens_visiveis()));
create policy anexos_insert on public.anexos for insert to authenticated
  with check (enviado_por = (select privado.meu_perfil_id())
              and item_id in (select privado.itens_visiveis()));
create policy anexos_delete on public.anexos for delete to authenticated
  using (enviado_por = (select privado.meu_perfil_id())
         or (select i.setor_id from public.itens i where i.id = item_id) in (select privado.setores_administrados()));

-- ---------------------------------------------------------------- Storage: bucket privado "anexos"
-- Caminho: {setor_id}/{item_id}/{uuid}-{nome}. Download por URL assinada (Edge Function url-anexo, T-23).
insert into storage.buckets (id, name, public, file_size_limit)
values ('anexos', 'anexos', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

-- O 2.º segmento do caminho é o item: mesma regra de visibilidade dos itens.
create policy anexos_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'anexos'
         and (storage.foldername(name))[2]::uuid in (select privado.itens_visiveis()));
create policy anexos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos'
              and (storage.foldername(name))[2]::uuid in (select privado.itens_visiveis()));
create policy anexos_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'anexos'
         and (owner_id = (select auth.uid())::text
              or (storage.foldername(name))[1]::uuid in (select privado.setores_administrados())));
