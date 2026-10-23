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
