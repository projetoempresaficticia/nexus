# Não fazer

## Segurança
1. **Nunca** colocar a `service_role`/secret key no Angular, em `environments`, em logs ou em commits. No frontend só a anon/publishable key.
2. **Nunca** criar tabela sem `enable row level security` e sem políticas + testes pgTAP na mesma tarefa.
3. **Nunca** confiar só no frontend para permissão (esconder botão não é segurança).
4. **Nunca** usar `innerHTML`/`[innerHTML]` com HTML de usuário sem passar pelo `html-seguro.pipe` (DOMPurify).
5. **Nunca** criar função `security definer` sem `set search_path = ''` e sem validar permissão na primeira linha.
6. **Nunca** commitar `.env`, dumps da base, CSVs exportados do v26 ou dados reais de pessoas.
7. Não ligar login por e-mail/senha em produção.

## Banco de dados
8. **Nunca** editar ou apagar uma migration já aplicada (local ou remota). Crie uma nova.
9. **Nunca** rodar `supabase db push`, `db reset --linked`, `functions deploy` ou SQL no projeto de produção sem confirmação explícita do Germano.
10. Não apagar dados de produção para "testar"; use o Supabase local.
11. Não guardar prazos como `timestamptz` (bug de datas do v26); prazos são `date`.
12. Não fazer `delete` direto em `itens` pelo frontend: use `excluir_item`.

## Código e processo
13. Não instalar bibliotecas ou skills sem justificar em DECISOES.md e sem perguntar.
14. Não reescrever arquivos inteiros quando uma edição pontual resolve.
15. Não misturar várias mudanças num commit; seguir docs/COMMITS.md (commits pequenos, PR ≤ 400 linhas).
16. Não commitar direto na `main`; não fazer `git push --force` na `main`; não fazer push/PR sem perguntar.
17. Não inventar regra de negócio: quando houver dúvida, consultar os docs, pesquisar (`/pesquisar`) e, se continuar, perguntar e marcar `⚠️ A CONFIRMAR`.
18. Não chamar o Supabase direto de componentes; use services.
19. Não usar bibliotecas pesadas de UI (Angular Material, PrimeNG) — o visual é o do protótipo.
20. Não mudar textos da interface fora de `textos.ts`/GLOSSARIO_UI.md.
21. Não deixar `console.log` nem código comentado no PR.
22. Não marcar tarefa como concluída sem verificar os critérios de aceite e sem testes passando.

## Transição
23. Não desligar nem alterar o Nexus v26 (Apps Script) antes da tarefa T-42.
24. Não copiar anexos do Drive para o Storage na importação; usar `link_externo`.
