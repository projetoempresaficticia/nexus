# Estado atual

## Última sessão
2026-10-23 — T-01 e T-02 juntadas na `main` (PRs #1 e #2). T-03 concluída: Supabase local a funcionar (versão leve por falta de RAM), cliente Supabase e environments.

## Feito
- Documentação completa em `docs/`, `CLAUDE.md`, configuração do Claude Code em `.claude/`, padrão de commits (`.gitmessage`, `.githooks/`, template de PR).
- Protótipo visual aprovado copiado para `referencias/prototipo-aprovado.html`.
- **T-01**: Angular 22.2, estrutura `core/shared/features/layout`, tokens de design, fontes, ESLint + Prettier, `.gitattributes` (LF). Repositório **público** https://github.com/projetoempresaficticia/nexus com `main` protegida.
- **T-02**: skills em `.claude/skills/` (+ `skills-lock.json`), `commit.template`, 16 labels, merge só por squash, hook de segredos corrigido.
- **T-03**: `supabase/config.toml` (localhost:4200, Google por `supabase/.env`, e-mail/senha só local, `auto_expose_new_tables = false`, `health_timeout` 10m, seed desligado), `core/supabase.client.ts` (token `SUPABASE`), `environment.ts` (produção, vazio) e `environment.development.ts` (local), `npm run db:start`.
- **T-03b**: desenvolvimento aponta para o projeto Supabase **nexus-dev** na nuvem (`https://woroiluncnfscajlqoot.supabase.co`, Frankfurt).
- Node 24.22.1; hooks e `commit.template` ativos localmente.

## Em andamento
- Nada.

## Próximo passo
- **T-04** — GitHub Actions: `ci.yml` (lint, test, build, pgTAP) e `deploy.yml` (Pages, `--base-href /nexus/`, `404.html`; reescrever `environment.ts` a partir dos secrets).

## Lembretes para as próximas tarefas
- **T-05:** religar `[db.seed] enabled = true` no config.toml; cada tabela precisa de `grant` explícito a `authenticated` (tabelas novas não ficam expostas na API automaticamente) além da RLS. Para aplicar migrations no **nexus-dev**: `npx supabase link --project-ref woroiluncnfscajlqoot` (pede `supabase login` — o Germano faz no terminal) e `npx supabase db push`. pgTAP: CI (local no runner) ou `npx supabase test db --linked` no nexus-dev.
- **T-12:** configurar Auth do nexus-dev no painel (DEPLOY.md §Projeto nexus-dev); login Google local precisa de `supabase/.env` (só se usar o Supabase local).
- **T-40:** plano free permite 2 projetos ativos e a org já tem `projetoempresaficticia` + `nexus-dev` → pausar um ou mudar de plano para criar a produção.

## Revisão de 2026-10-22
Incluídos: tarefas sem projeto (US-34), vários responsáveis (US-35), título editável (US-09), membro vê só o que o envolve (US-36), tempo real + abertura instantânea (US-37, T-43, T-44).

## Bloqueios / pendências de decisão
- PC com 6 GB de RAM: resolvido usando o projeto nexus-dev na nuvem (DECISOES 2026-10-23).
- Repositório é público: **nunca** commitar segredos nem dados reais (NAO_FAZER #1 e #6).
- Um pedido de transferência do repo para `Germano-Silva` foi enviado e abandonado; expira sozinho (não aceitar o e-mail).
- ⚠️ Provedor de e-mail (Resend vs SMTP Google Workspace) — necessário até T-36.
- ⚠️ Domínio próprio — necessário até T-40.
- ⚠️ Líder pode gerir vínculos/sub-setores? Membro criador pode excluir item com filhos? (SEGURANCA.md §3) — necessário até T-06/T-20.
- ⚠️ Aprovação aprovada leva a Concluída ou Em andamento? Concluir com subtarefas abertas? (FLUXOS.md) — necessário até T-09.
- ⚠️ Data-alvo da virada e se outras equipas entram no MVP (PRD.md).
