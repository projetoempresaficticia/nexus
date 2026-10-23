# Segurança

Princípio: **o banco decide**. O Angular só esconde o que a pessoa não pode fazer; quem impede de verdade são as políticas RLS e as funções SQL. Toda política tem teste pgTAP em `supabase/tests/`.

## 1. Autenticação
- Supabase Auth com provedor **Google** (OAuth do Google Workspace da empresa). Parâmetro `hd=estudeemportugal.org` no login (só melhora a experiência; não é segurança).
- **Auth Hook "Before User Created"** (função SQL `auth_hook_antes_criar_usuario`): rejeita e-mails fora de `@estudeemportugal.org` **e** e-mails sem `perfis.ativo = true`. Assim ninguém sem cadastro chega sequer a ter conta.
- Trigger em `auth.users` (after insert) liga `perfis.auth_id` pelo e-mail.
- Função `meu_perfil_id()` devolve o `perfis.id` do usuário logado **apenas se ativo**; senão `null` → todas as políticas falham → "Acesso não autorizado".
- Desativar alguém: `perfis.ativo = false` + Edge Function `desativar-usuario` encerra as sessões (admin API `signOut` do usuário).
- Login por e-mail/senha **só no ambiente local** (para testes e2e). Desligado em produção.

## 2. Funções auxiliares (SQL, `security definer`, `stable`, `set search_path = ''`)
Ficam no schema **`privado`** (não exposto na API; `execute` só para `authenticated`, revogado de `anon`/`public`). Nas políticas, chame com o schema: `(select privado.meu_perfil_id())`.
| função | devolve |
|---|---|
| `meu_perfil_id()` | uuid do perfil ativo logado ou null |
| `eh_admin()` | true se o perfil logado tem `is_admin` |
| `setores_descendentes(raiz uuid)` | setof uuid — a raiz e todos abaixo (CTE recursiva) |
| `setores_visiveis()` | admin: todos; senão setores com vínculo direto ∪ descendentes dos setores em que é líder |
| `setores_administrados()` | admin: todos; senão descendentes (inclusive) dos setores em que é líder |
| `administra_setor(s uuid)` | `s in setores_administrados()` |
| `itens_envolvidos()` | setof uuid — itens em que a pessoa está **diretamente envolvida**: responsável (`item_responsaveis`), criadora, aprovadora, `de_id`/`para_id` de solicitação do item, ou mencionada num comentário do item |
| `pode_ver_item(i uuid)` | **regra "só o que me envolve"** (ver §2.1) |
| `pode_editar_item(i uuid)` | administra o setor do item **ou** é responsável **ou** é criadora |

### 2.1 Quem vê cada item
Membros **não** veem o setor inteiro: veem só o que os envolve. Líderes veem tudo dos setores que administram.
`pode_ver_item(i)` é verdadeiro se:
1. o setor do item está em `setores_administrados()` (Líder/Adm); **ou**
2. `i` está em `itens_envolvidos()`; **ou**
3. `i` é **descendente** de um item onde a pessoa é responsável ou criadora (quem cuida do projeto vê as tarefas dele; quem cuida da tarefa vê as subtarefas); **ou**
4. `i` é **ancestral** de um item dos casos 2–3 — só para dar contexto (caminho "Projeto › Tarefa", nome e status). Nesse caso a pessoa vê o item, mas não o edita, e as visões listam-no apenas como agrupador.

> Confirmado (2026-10-22): no caso 4 o membro **não** vê os irmãos — outras tarefas do mesmo projeto em que não está envolvido ficam invisíveis.
> Líder pode alternar na interface entre "Só os meus" e "Toda a equipe" (filtro de tela; a permissão continua a ser a de cima).

> Desempenho: chamar sempre como `(select setores_visiveis())` dentro das políticas para o Postgres avaliar uma vez por consulta.

## 3. Matriz perfil × ação
| Recurso / ação | Adm do sistema | Líder (setor e sub-setores) | Membro (setor) | Destinatário de solicitação de outro setor |
|---|---|---|---|---|
| Perfis — ver | todos | pessoas ativas (para atribuir/mencionar) | pessoas ativas | pessoas ativas |
| Perfis — criar/editar/desativar | ✅ | ❌ | ❌ | ❌ |
| Setores — ver | todos | visíveis | visíveis | ❌ |
| Setores — criar | ✅ | ✅ só **abaixo** de um setor que administra (nunca na raiz nem acima) | ❌ | ❌ |
| Setores — editar/mover/desativar | ✅ | ❌ | ❌ | ❌ |
| Vínculos — ver | todos | dos setores visíveis | dos setores visíveis | ❌ |
| Vínculos — gerir | ✅ | ❌ ⚠️ | ❌ | ❌ |
| Projeto — criar | ✅ | ✅ | ✅ (decisão: qualquer vínculo) | ❌ |
| Tarefa avulsa (sem projeto) — criar | ✅ | ✅ | ✅ em setor com vínculo | ❌ |
| Tarefa/Subtarefa — criar dentro de outro item | ✅ | ✅ | se pode ver o item pai | ❌ |
| Item — ver | todos | tudo dos setores administrados | **só o que o envolve** (§2.1) | só o item da solicitação (+ contexto) |
| Item — editar campos (inclui **título**) / status | ✅ | ✅ | se responsável ou criador | ❌ |
| Item — definir responsáveis | ✅ | ✅ | se responsável ou criador | ❌ |
| Item — excluir (cascata) | ✅ | ✅ | se criador **e** sem filhos ⚠️ | ❌ |
| Checklist / dependências | como "editar item" | | | |
| Solicitação — abrir | quem pode ver o item | | | |
| Solicitação — ver | todas | do item visível ou de/para mim | de/para mim ou do item visível | de/para mim |
| Solicitação — responder (status) | ✅ | ✅ se administra o setor do item | só se `para_id` = eu | se `para_id` = eu |
| Solicitação — cancelar | ✅ | ✅ | se `de_id` = eu e pendente | ❌ |
| Mensagem em solicitação | quem vê a solicitação | | | |
| Comentário — criar/ver | quem vê o item | | | |
| Comentário — editar | autor | autor | autor | autor |
| Comentário — apagar | ✅ | ✅ no setor | autor | autor |
| Anexo — enviar/ver | quem vê o item | | | |
| Anexo — apagar | ✅ | ✅ no setor | quem enviou | quem enviou |
| Painel / Produtividade / Carga | todos | setores administrados | ❌ | ❌ |
| Histórico — ver | todos | quem vê o registo | quem vê o registo | ❌ |
| Notificações — ver | ✅ | ❌ (só Edge Function com service role) | ❌ | ❌ |

> Confirmado (2026-10-23, Germano): Líder pode criar sub-setor abaixo do seu setor, nunca acima.
> ⚠️ A CONFIRMAR: (1) Líder pode gerir **vínculos** (pôr/tirar pessoas) do seu setor? Implementado como **só Adm** (padrão do v26) até confirmação. (2) Membro criador pode excluir item que já tem filhos? Por padrão o kit assume **não**.

## 4. Políticas RLS (resumo em SQL — a implementação vai em migrations)
```sql
-- perfis
alter table perfis enable row level security;
create policy perfis_select on perfis for select to authenticated
  using ((select meu_perfil_id()) is not null and (ativo or (select eh_admin())));
create policy perfis_admin_all on perfis for all to authenticated
  using ((select eh_admin())) with check ((select eh_admin()));

-- setores
alter table setores enable row level security;
create policy setores_select on setores for select to authenticated
  using (id in (select setores_visiveis()));
create policy setores_admin on setores for all to authenticated
  using ((select eh_admin())) with check ((select eh_admin()));

-- vinculos
alter table vinculos enable row level security;
create policy vinculos_select on vinculos for select to authenticated
  using (setor_id in (select setores_visiveis()) or perfil_id = (select meu_perfil_id()));
create policy vinculos_admin on vinculos for all to authenticated
  using ((select eh_admin())) with check ((select eh_admin()));

-- itens
alter table itens enable row level security;
create policy itens_select on itens for select to authenticated
  using (pode_ver_item(id));
-- INSERT / UPDATE / DELETE: sem políticas de escrita. Tudo passa pelos RPCs
-- criar_item, atualizar_item, mudar_status, definir_responsaveis, excluir_item (security definer),
-- que validam: criar sem pai → vínculo no setor ou administra; criar com pai → pode_ver_item(pai);
-- editar → pode_editar_item.

-- item_responsaveis: leitura acompanha o item; escrita só por definir_responsaveis()
alter table item_responsaveis enable row level security;
create policy resp_select on item_responsaveis for select to authenticated
  using (pode_ver_item(item_id));

-- checklist_itens / dependencias
create policy checklist_select on checklist_itens for select to authenticated using (pode_ver_item(item_id));
create policy checklist_write  on checklist_itens for all    to authenticated
  using (pode_editar_item(item_id)) with check (pode_editar_item(item_id));
create policy deps_select on dependencias for select to authenticated using (pode_ver_item(item_id));
create policy deps_write  on dependencias for all    to authenticated
  using (pode_editar_item(item_id)) with check (pode_editar_item(item_id) and pode_ver_item(depende_de_id));

-- solicitacoes: leitura direta; escrita só por RPC (abrir_solicitacao, responder_solicitacao, cancelar_solicitacao)
create policy solic_select on solicitacoes for select to authenticated
  using (de_id = (select meu_perfil_id()) or para_id = (select meu_perfil_id()) or pode_ver_item(item_id));
create policy solic_msg_select on solicitacao_mensagens for select to authenticated
  using (exists (select 1 from solicitacoes s where s.id = solicitacao_id));  -- herda a RLS de solicitacoes
create policy solic_msg_insert on solicitacao_mensagens for insert to authenticated
  with check (autor_id = (select meu_perfil_id())
              and exists (select 1 from solicitacoes s where s.id = solicitacao_id));

-- comentarios: insert/update pelo RPC salvar_comentario (trata menções); delete por política
create policy com_select on comentarios for select to authenticated using (pode_ver_item(item_id));
create policy com_delete on comentarios for delete to authenticated
  using (autor_id = (select meu_perfil_id())
         or (select setor_id from itens where id = item_id) in (select setores_administrados()));
create policy men_select on mencoes for select to authenticated
  using (exists (select 1 from comentarios c where c.id = comentario_id));

-- anexos
create policy anexos_select on anexos for select to authenticated using (pode_ver_item(item_id));
create policy anexos_insert on anexos for insert to authenticated
  with check (enviado_por = (select meu_perfil_id()) and pode_ver_item(item_id));
create policy anexos_delete on anexos for delete to authenticated
  using (enviado_por = (select meu_perfil_id())
         or (select setor_id from itens where id = item_id) in (select setores_administrados()));

-- historico: só leitura; escrita só por trigger (security definer)
create policy hist_select on historico for select to authenticated
  using ((select eh_admin())
         or (tabela = 'itens' and pode_ver_item(registro_id)));

-- notificacoes: nenhuma política para authenticated (só service_role da Edge Function)
alter table notificacoes enable row level security;
```

### Storage (bucket `anexos`)
```sql
-- caminho: {setor_id}/{item_id}/{uuid}-{nome}  → o 2º segmento é o item
create policy anexos_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'anexos' and pode_ver_item((storage.foldername(name))[2]::uuid));
create policy anexos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'anexos' and pode_ver_item((storage.foldername(name))[2]::uuid));
create policy anexos_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'anexos' and (owner_id = (select auth.uid())::text
         or (storage.foldername(name))[1]::uuid in (select setores_administrados())));
```

## 4.1 Tempo real
- Usar **Postgres Changes** do Supabase Realtime nas tabelas listadas em SCHEMA.md §Tempo real. O Realtime verifica a RLS de cada assinante, então ninguém recebe eventos de itens que não pode ver.
- Eventos de `delete` chegam só com a chave primária (sem conteúdo) — não vazam dados.
- O canal usa o JWT da sessão; ao renovar a sessão, chamar `supabase.realtime.setAuth()`.
- Se a equipa crescer muito (centenas de pessoas simultâneas), migrar para **Broadcast** com `realtime.broadcast_changes` e canais privados — registrar em DECISOES.md.

## 5. Chaves e segredos
| chave | onde pode estar |
|---|---|
| `anon` / publishable key | `src/environments/*.ts` (é pública por natureza) |
| `service_role` / secret key | **só** em segredos das Edge Functions e no `.env` local de `scripts/` (nunca no Git) |
| chave do provedor de e-mail | segredo das Edge Functions |
| credenciais Google (OAuth) | painel do Supabase |

## 6. Dados pessoais
- Dados guardados: nome, e-mail corporativo, papéis, conteúdo de trabalho. Nada sensível (saúde, documentos pessoais) deve ir para descrições — aviso no GLOSSARIO_UI (texto de ajuda do anexo).
- Anexos ficam na região UE do Supabase (escolher `eu-west`/Frankfurt ao criar o projeto).
- Desativar ≠ apagar: mantém autoria e histórico. Pedido de remoção total → Adm anonimiza `nome`/`email` manualmente (procedimento em DEPLOY.md).
- HTML de usuários sempre sanitizado (DOMPurify) ao salvar e ao exibir; `href` só `https:`/`mailto:`.
