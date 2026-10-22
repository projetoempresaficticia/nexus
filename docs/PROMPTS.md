# Pedidos prontos para o Claude Code

1. **Começar o dia**
   > Lê o CLAUDE.md, o ESTADO_ATUAL.md e o TAREFAS.md e implementa a próxima tarefa. Explica-me no fim, em linguagem simples, o que mudou e como testar.
   (atalho: `/proxima-tarefa`)

2. **Fazer commits organizados**
   > Separa o que mudou em commits pequenos seguindo o docs/COMMITS.md e mostra-me as mensagens antes de commitar.
   (atalho: `/commit`)

3. **Revisar antes do PR**
   > Revê a branch atual contra NAO_FAZER.md, SEGURANCA.md e os critérios de aceite da tarefa. Lista problemas por gravidade.
   (atalho: `/revisar`)

4. **Revisão de segurança de uma tabela**
   > Usa o agente revisor-seguranca para verificar a tabela `solicitacoes`: RLS, funções security definer, testes pgTAP e Storage.

5. **Dúvida técnica**
   > /pesquisar qual a melhor forma de fazer o drag-and-drop acessível no Kanban com Angular CDK

6. **Procurar uma skill**
   > Roda `npx skills find gantt angular` e diz-me se alguma skill ajuda na tarefa T-28. Não instales nada sem me perguntar.

7. **Abrir o PR**
   > Confere se o CI passa localmente, faz o push da branch e abre o PR com o título `[T-XX] ...` e o template preenchido. Pergunta-me antes do push.

8. **Fechar a sessão**
   > Atualiza ESTADO_ATUAL, TAREFAS, CHANGELOG e ERROS_CONHECIDOS com o que fizemos hoje.
   (atalho: `/fechar-sessao`)

9. **Comparar com o protótipo**
   > Abre referencias/prototipo-aprovado.html e a tela de Solicitações que fizemos, e lista as diferenças visuais.
