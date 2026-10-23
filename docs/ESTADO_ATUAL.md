# Estado atual

## Última sessão
2026-10-24 — T-01 a T-13 concluídas (banco completo, login e shell). Migrations a partir da T-09 por aplicar no nexus-dev.

## Feito
- Documentação completa em `docs/`, `CLAUDE.md`, configuração do Claude Code em `.claude/`, padrão de commits (`.gitmessage`, `.githooks/`, template de PR).
- Protótipo visual aprovado copiado para `referencias/prototipo-aprovado.html`.
- **T-01**: Angular 22.2, estrutura `core/shared/features/layout`, tokens de design, fontes, ESLint + Prettier, `.gitattributes` (LF). Repositório **público** https://github.com/projetoempresaficticia/nexus com `main` protegida.
- **T-02**: skills em `.claude/skills/` (+ `skills-lock.json`), `commit.template`, 16 labels, merge só por squash, hook de segredos corrigido.
- **T-03**: `supabase/config.toml` (localhost:4200, Google por `supabase/.env`, e-mail/senha só local, `auto_expose_new_tables = false`, `health_timeout` 10m, seed desligado), `core/supabase.client.ts` (token `SUPABASE`), `environment.ts` (produção, vazio) e `environment.development.ts` (local), `npm run db:start`.
- **T-03b**: desenvolvimento aponta para o projeto Supabase **nexus-dev** na nuvem (`https://woroiluncnfscajlqoot.supabase.co`, Frankfurt).
- **T-04**: `ci.yml` (lint, formatação, testes, build, chave secreta no bundle, pgTAP) — checks obrigatórios na `main`; `deploy.yml` → https://projetoempresaficticia.github.io/nexus/ (secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` = nexus-dev até a T-40).
- **T-05**: migration `20261023075322_perfis_setores_vinculos.sql` (7 enums, `perfis`, `setores`, `vinculos`, funções em `privado`, trigger anti-ciclo, RLS + grants), `supabase/tests/001_perfis_setores_vinculos.test.sql` (24 testes, verdes no CI). Aplicada no nexus-dev; advisors de segurança sem alertas; API anônima recusada.
- **T-06**: migration `20261023080619_itens_responsaveis_checklist_dependencias.sql` (itens + tarefa avulsa, responsáveis, checklist, dependências; triggers de nível/setor/status/ciclo; `itens_visiveis`/`pode_ver_item`/`pode_editar_item`; RLS) + 32 testes pgTAP. Aplicada no nexus-dev.
- **T-07**: migration `20261023083122_solicitacoes_comentarios_anexos.sql` (solicitações, mensagens, comentários, menções, anexos; envolvimento por solicitação/menção; bucket privado `anexos` + políticas Storage) + 23 testes. Aplicada no nexus-dev.
- **T-08**: migration `20261023193718_historico_notificacoes_views_realtime.sql` (historico + trigger de auditoria em itens/solicitacoes/vinculos/perfis, notificacoes + `privado.notificar`, `vw_itens`, `vw_produtividade`, Realtime em 8 tabelas) + 16 testes; seed religado (CI). Aplicada no nexus-dev. Advisor INFO "notificacoes sem política" é intencional (só service role).
- **T-09**: migration `20261023195015_rpcs_itens.sql` (criar_item, atualizar_item, definir_responsaveis, mudar_status + recorrência, contar_descendentes, excluir_item, definir_dependencia) + 30 testes. **Ainda NÃO aplicada no nexus-dev** (confirmação recusada).
- **T-10**: migration `20261023204848_rpcs_solicitacoes_comentarios.sql` (abrir/responder/cancelar solicitação, salvar_comentario com menções) + 25 testes. Por aplicar no nexus-dev.
- **T-11**: migration `20261023213218_rpcs_painel_admin.sql` (carregar_inicial, resumo_painel, carga_trabalho, salvar_setor, salvar_vinculos, reatribuir_itens) + 20 testes; `core/models/database.types.ts` gerado pelo CI (job pgTAP gera e compara; artefato `database-types`); cliente Supabase tipado. Por aplicar no nexus-dev.
- **T-12**: migration `20261023230649_auth_hook_e_ligacao_perfil.sql` (hook + trigger em auth.users) + 9 testes; `AuthService`, guards `autenticado`/`visitante`, telas Login e Sem acesso, `core/models/textos.ts`, estilos do protótipo em `src/styles/prototipo.css`, `src/testing/supabase-falso.ts`. Login com senha só em dev.
- **T-13**: `AcessoStore` (carregar_inicial, papéis, filtro de setor) + `AcessoService`, `ErroApi`, `TemaService`, `ShellComponent` (menu por perfil, contador, Meus setores, tema, sair), `CabecalhoComponent` (seletor de setor), guards acesso/líder/admin, rotas com `EmBrevePage` para as telas ainda não feitas.
- Node 24.22.1; hooks e `commit.template` ativos localmente.

## Em andamento
- Nada.

## Próximo passo
- **T-14** — `shared/ui`: botão, pill-status, nível, avatar(es), modal, confirmação, toast, vazio, carregando, kpi-card, barra; `rotulos.ts`.

## Como aplicar migrations no nexus-dev
CI verde no PR → `apply_migration` pelo MCP do Supabase com o conteúdo do arquivo (nome = parte do nome do arquivo sem o timestamp) → `get_advisors` (security e performance). Nunca no projeto de produção sem confirmação.

## Lembretes para as próximas tarefas
- **Todas as tabelas novas:** `grant` explícito a `authenticated` + RLS; funções de acesso em `privado`, chamadas como `(select privado.f())`.
- **Seed no nexus-dev:** carregar o `supabase/seed.sql` foi recusado no pedido de confirmação (2026-10-23) — ⚠️ o Germano decide se carrega (dados fictícios; útil para testar as telas).
- **Migrations pendentes no nexus-dev** (o `apply_migration` foi recusado na confirmação, provavelmente por ausência): a partir de `20261023195015_rpcs_itens.sql`. Aplicar em lote quando o Germano estiver presente (MCP `apply_migration`, por ordem de nome).
- **Para testar o login no nexus-dev** (o Germano, no painel): DEPLOY.md §Projeto nexus-dev passos 1–5 (URLs, desligar confirmação de e-mail, ligar o hook, seed, migrations).
- **T-40:** trocar os secrets do GitHub para o nexus-prod. Plano free permite 2 projetos ativos e a org já tem `projetoempresaficticia` + `nexus-dev` → pausar um ou mudar de plano para criar a produção.

## Revisão de 2026-10-22
Incluídos: tarefas sem projeto (US-34), vários responsáveis (US-35), título editável (US-09), membro vê só o que o envolve (US-36), tempo real + abertura instantânea (US-37, T-43, T-44).

## Bloqueios / pendências de decisão
- PC com 6 GB de RAM: resolvido usando o projeto nexus-dev na nuvem (DECISOES 2026-10-23).
- Repositório é público: **nunca** commitar segredos nem dados reais (NAO_FAZER #1 e #6).
- Um pedido de transferência do repo para `Germano-Silva` foi enviado e abandonado; expira sozinho (não aceitar o e-mail).
- ⚠️ Provedor de e-mail (Resend vs SMTP Google Workspace) — necessário até T-36.
- ⚠️ Domínio próprio — necessário até T-40.
- ⚠️ Líder pode gerir **vínculos** do seu setor? (hoje só Adm). Membro criador pode excluir item com filhos? (SEGURANCA.md §3) — até T-20/T-33. Sub-setores: decidido (Líder cria abaixo do seu).
- ⚠️ Aprovação aprovada leva a Concluída ou Em andamento? Concluir com subtarefas abertas? (FLUXOS.md) — necessário até T-09.
- ⚠️ Data-alvo da virada e se outras equipas entram no MVP (PRD.md).
