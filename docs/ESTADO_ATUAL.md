# Estado atual

## Última sessão
2026-10-22 — T-01: projeto Angular 22 criado (zoneless, strict, Vitest, ESLint, Prettier), tokens de design e fontes; repositório GitHub privado criado.

## Feito
- Documentação completa em `docs/`, `CLAUDE.md`, configuração do Claude Code em `.claude/`, padrão de commits (`.gitmessage`, `.githooks/`, template de PR).
- Protótipo visual aprovado copiado para `referencias/prototipo-aprovado.html`.
- T-01 (quase toda): Angular 22.2 em `C:\nexus`, estrutura `core/shared/features/layout`, `src/styles/tokens.css`, estilos base, fontes Google, ESLint + Prettier, `.gitattributes` (LF). `npm run build`, `npm test` e `npm run lint` passam.
- Node atualizado para 24.22.1. Hooks ativados localmente (`core.hooksPath .githooks`).
- Repositório privado: https://github.com/projetoempresaficticia/nexus (`main` enviada).

## Em andamento
- **T-01** — falta só **proteger a `main`** no GitHub (recusado: precisa de repositório público ou GitHub Pro). PR da branch `T-01/projeto-angular` aberto.

## Próximo passo
- Decidir público vs. GitHub Pro e aplicar a proteção da `main`; depois **T-02** (skills, `.gitmessage`, labels, só "Squash and merge").

## Revisão de 2026-10-22
Incluídos: tarefas sem projeto (US-34), vários responsáveis (US-35), título editável (US-09), membro vê só o que o envolve (US-36), tempo real + abertura instantânea (US-37, T-43, T-44).

## Bloqueios / pendências de decisão
- ⚠️ Repositório **público ou GitHub Pro**? Necessário para proteger a `main` (T-01) e para o GitHub Pages (T-04/T-40). Conta usada: `projetoempresaficticia` — confirmar se é a definitiva.
- ⚠️ Provedor de e-mail (Resend vs SMTP Google Workspace) — necessário até T-36.
- ⚠️ Domínio próprio — necessário até T-40.
- ⚠️ Líder pode gerir vínculos/sub-setores? Membro criador pode excluir item com filhos? (SEGURANCA.md §3) — necessário até T-06/T-20.
- ⚠️ Aprovação aprovada leva a Concluída ou Em andamento? Concluir com subtarefas abertas? (FLUXOS.md) — necessário até T-09.
- ⚠️ Data-alvo da virada e se outras equipas entram no MVP (PRD.md).
