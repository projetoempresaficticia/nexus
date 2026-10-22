---
description: Atualiza os documentos de estado no fim da sessão
---

Feche a sessão de trabalho. $ARGUMENTS

1. `docs/ESTADO_ATUAL.md`: atualize "Última sessão" (data e resumo de 1–2 linhas), "Feito", "Em andamento", "Próximo passo" (próxima tarefa de TAREFAS.md) e "Bloqueios".
2. `docs/TAREFAS.md`: marque `- [x]` só nas tarefas com critérios de aceite verificados e testes passando. Se a tarefa ficou a meio, deixe `- [ ]` e anote em ESTADO_ATUAL o que falta.
3. `docs/CHANGELOG.md`: em "[Não lançado]", adicione em Adicionado / Alterado / Corrigido / Removido o que muda para o usuário, em linguagem simples.
4. `docs/ERROS_CONHECIDOS.md`: registre qualquer erro difícil que apareceu (sintoma / causa / solução / data · tarefa).
5. `docs/DECISOES.md`: registre decisões técnicas tomadas na sessão.
6. Faça um commit `docs: atualiza estado da sessão` (Refs: T-XX).
7. Mostre ao Germano um resumo de 3–5 linhas.
