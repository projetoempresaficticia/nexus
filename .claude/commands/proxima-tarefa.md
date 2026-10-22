---
description: Implementa a próxima tarefa de docs/TAREFAS.md, do início ao fim
---

Implemente a próxima tarefa do Nexus v2. $ARGUMENTS (se vier um ID, ex.: T-07, use essa tarefa).

1. Leia `CLAUDE.md`, `docs/ESTADO_ATUAL.md` e `docs/TAREFAS.md`. Escolha a primeira tarefa `- [ ]` cujas dependências estão `- [x]`.
2. Leia as user stories e os critérios de aceite dela (`docs/USER_STORIES.md`, `docs/CRITERIOS_ACEITE.md`) e os docs que ela toca (SCHEMA, SEGURANCA, DESIGN, API, FLUXOS).
3. Se houver `⚠️ A CONFIRMAR` que bloqueie esta tarefa, **pare e pergunte** ao Germano antes de começar.
4. Diga em 3–5 linhas o plano (o que vai criar/alterar).
5. `git switch main && git pull` e crie a branch `T-XX/resumo-curto` (docs/COMMITS.md).
6. Implemente em passos pequenos. Em dúvida técnica, use as skills do projeto e `docs/FERRAMENTAS.md` (ou `/pesquisar`) antes de inventar.
7. A cada passo que compila e funciona, faça um commit pequeno (`/commit`).
8. Rode `npm run lint`, `npm test` e, se mexeu no banco, `npx supabase db reset && npx supabase test db`. Corrija até passar.
9. Confira cada critério de aceite da tarefa e diga quais passaram e como verificou.
10. Explique ao Germano, em linguagem simples: o que mudou, como testar no navegador (passo a passo) e o que ficou pendente.
11. Rode `/fechar-sessao`.
12. Pergunte se pode fazer o push e abrir o PR.
