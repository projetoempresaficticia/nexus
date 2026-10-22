# Estado atual

## Última sessão
2026-10-22 — T-01 concluída: projeto Angular 22 (zoneless, strict, Vitest, ESLint, Prettier), tokens de design e fontes; repositório GitHub público com `main` protegida.

## Feito
- Documentação completa em `docs/`, `CLAUDE.md`, configuração do Claude Code em `.claude/`, padrão de commits (`.gitmessage`, `.githooks/`, template de PR).
- Protótipo visual aprovado copiado para `referencias/prototipo-aprovado.html`.
- **T-01**: Angular 22.2 em `C:\nexus`, estrutura `core/shared/features/layout`, `src/styles/tokens.css`, estilos base, fontes Google, ESLint + Prettier, `.gitattributes` (LF). `npm run build`, `npm test` e `npm run lint` passam.
- Node atualizado para 24.22.1. Hooks ativados localmente (`core.hooksPath .githooks`).
- Repositório **público**: https://github.com/projetoempresaficticia/nexus — `main` protegida (PR obrigatório, inclusive para admins; histórico linear; sem force push).

## Em andamento
- PR #1 da T-01 aberto, aguardando o merge do Germano ("Squash and merge").

## Próximo passo
- **T-02** — skills, `.gitmessage`, labels do GitHub, só "Squash and merge".

## Revisão de 2026-10-22
Incluídos: tarefas sem projeto (US-34), vários responsáveis (US-35), título editável (US-09), membro vê só o que o envolve (US-36), tempo real + abertura instantânea (US-37, T-43, T-44).

## Bloqueios / pendências de decisão
- Repositório é público: **nunca** commitar segredos nem dados reais (NAO_FAZER #1 e #6) — qualquer commit fica visível na hora.
- Um pedido de transferência do repo para `Germano-Silva` foi enviado e abandonado; expira sozinho (não aceitar o e-mail).
- ⚠️ Provedor de e-mail (Resend vs SMTP Google Workspace) — necessário até T-36.
- ⚠️ Domínio próprio — necessário até T-40.
- ⚠️ Líder pode gerir vínculos/sub-setores? Membro criador pode excluir item com filhos? (SEGURANCA.md §3) — necessário até T-06/T-20.
- ⚠️ Aprovação aprovada leva a Concluída ou Em andamento? Concluir com subtarefas abertas? (FLUXOS.md) — necessário até T-09.
- ⚠️ Data-alvo da virada e se outras equipas entram no MVP (PRD.md).
