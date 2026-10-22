---
description: Revisa a branch atual contra as regras, a segurança e os critérios de aceite
---

Revise as mudanças da branch atual (`git diff main...HEAD`). $ARGUMENTS

Verifique e reporte por gravidade (🔴 bloqueia o PR · 🟡 corrigir · 🟢 sugestão), com arquivo e linha:

1. **NAO_FAZER.md** — cada regra.
2. **SEGURANCA.md** — RLS ativa e com políticas em toda tabela nova; funções `security definer` com `search_path = ''` e checagem de permissão; nenhuma chave secreta; HTML passando por DOMPurify; Storage com políticas. Para mudanças no banco, chame o agente `revisor-seguranca`.
3. **CRITERIOS_ACEITE.md** — os critérios das user stories da tarefa estão atendidos e testados (🔒 pgTAP, 🧪 Vitest, 🎭 e2e)?
4. **SCHEMA.md / API.md** — nomes de tabelas, colunas, RPCs e códigos de erro batem com o código? Se o código mudou o contrato, os docs foram atualizados?
5. **DESIGN.md / GLOSSARIO_UI.md** — tokens em vez de cores soltas; textos em `textos.ts`; acessibilidade (aria, foco, teclado).
6. **COMMITS.md** — nome da branch, mensagens, tamanho do PR (≤ 400 linhas), sem `console.log`.
7. Rode `npm run lint`, `npm test` e `npx supabase test db` e inclua o resultado.

Termine com: "Pronto para PR" ou a lista mínima do que falta.
