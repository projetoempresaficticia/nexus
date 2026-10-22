---
description: Separa as mudanças pendentes em commits pequenos no padrão do projeto
---

Organize as mudanças atuais em commits seguindo `docs/COMMITS.md`. $ARGUMENTS

1. Rode `git status` e `git diff --stat` (e `git diff --cached --stat`).
2. Confirme que não está na `main`. Se estiver, pare e sugira a branch `T-XX/...`.
3. Agrupe as mudanças por **mudança lógica** (ex.: migration / políticas / testes / service / componente / estilos / docs). Cada grupo vira um commit.
4. Para cada grupo, proponha: arquivos (ou trechos, com `git add -p`), mensagem `tipo(escopo): descrição` no imperativo, e corpo curto com o porquê se ajudar. Rodapé `Refs: T-XX` com o ID da branch.
5. Alvo: até ~150 linhas por commit (sem contar `package-lock.json` e `database.types.ts`). Se um grupo passar de 200, divida mais.
6. Mostre a lista de commits proposta ao Germano numa tabela e **espere o OK** (ou ajuste).
7. Faça os commits na ordem, um de cada vez. Nunca use `--no-verify`. Se o hook avisar tamanho, divida em vez de forçar.
8. No fim, mostre `git log --oneline main..HEAD`.
