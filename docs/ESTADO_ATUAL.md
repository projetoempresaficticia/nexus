# Estado atual

## Última sessão
2026-10-23 — T-01 a T-07 concluídas (modo autónomo: Germano testa no fim). 79 testes pgTAP.

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
- Node 24.22.1; hooks e `commit.template` ativos localmente.

## Em andamento
- Nada.

## Próximo passo
- **T-08** — `historico` + triggers, `notificacoes`, views `vw_itens` e `vw_produtividade`, Realtime; religar o seed (e deixar os testes pgTAP independentes das contagens do seed).

## Como aplicar migrations no nexus-dev
CI verde no PR → `apply_migration` pelo MCP do Supabase com o conteúdo do arquivo (nome = parte do nome do arquivo sem o timestamp) → `get_advisors` (security e performance). Nunca no projeto de produção sem confirmação.

## Lembretes para as próximas tarefas
- **Todas as tabelas novas:** `grant` explícito a `authenticated` + RLS; funções de acesso em `privado`, chamadas como `(select privado.f())`.
- **T-08:** religar `[db.seed] enabled = true` (o seed usa `notificacoes`) e carregar o seed no nexus-dev; testes pgTAP sem contagens globais.
- **T-12:** configurar Auth do nexus-dev no painel (DEPLOY.md §Projeto nexus-dev); login Google local precisa de `supabase/.env` (só se usar o Supabase local).
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
