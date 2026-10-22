# Branches, commits e pull requests

Padrão baseado em [Uma maneira de organizar suas branches, commits e pull requests (TabNews, guscsales)](https://www.tabnews.com.br/guscsales/uma-maneira-de-organizar-suas-branches-commits-e-pull-requests), adaptado ao Nexus.
**Objetivo:** cada commit conta uma pequena história; cada PR entrega uma tarefa de TAREFAS.md e é fácil de revisar.

## 1. Branches
Formato: `<id-da-tarefa>/<resumo-curto-em-kebab-case>`
```
T-07/tabelas-solicitacoes
T-18/pagina-do-item
T-24/tela-solicitacoes
```
- O ID vem de docs/TAREFAS.md. Uma branch = uma tarefa.
- Sempre a partir da `main` atualizada: `git switch main && git pull && git switch -c T-07/tabelas-solicitacoes`.
- Correção urgente fora das tarefas: `HOTFIX-<n>/<resumo>` (ex.: `HOTFIX-1/login-safari`).
- Nunca commitar direto na `main` (está protegida).

## 2. Commits
Formato (Conventional Commits, padrão Angular):
```
tipo(escopo): descrição no imperativo, minúscula, sem ponto final

[corpo opcional: o porquê, em 1–3 linhas]

[rodapé opcional: Refs: T-07]
```
### Tipos
| tipo | quando |
|---|---|
| `feat` | funcionalidade nova para o usuário (qualquer tamanho) |
| `fix` | correção de bug |
| `docs` | só documentação (inclui docs/ e CLAUDE.md) |
| `style` | formatação, espaços, ponto e vírgula — sem mudar lógica (**não** é CSS de tela; CSS de tela é `feat`/`fix`) |
| `refactor` | muda o código sem mudar o comportamento |
| `perf` | melhora de desempenho |
| `test` | adicionar ou corrigir testes |
| `chore` | configuração, build, CI, dependências, scripts |

### Escopos do Nexus
`auth` · `shell` · `ui` · `itens` · `projetos` · `tarefas` · `item` · `kanban` · `visoes` · `solicitacoes` · `comentarios` · `anexos` · `painel` · `produtividade` · `equipe` · `usuarios` · `setores` · `notificacoes` · `db` · `rls` · `functions` · `importacao` · `ci` · `deploy`
O escopo é opcional, mas use sempre que der.

### Exemplos
```
feat(db): cria tabelas de solicitações e mensagens
feat(rls): adiciona políticas de leitura de solicitações
test(rls): cobre destinatário de outro setor vendo só o item da solicitação
feat(solicitacoes): abre solicitação a partir da página do item
fix(item): permite reabrir item concluído para qualquer status
refactor(itens): move conversão de datas para utils/datas
chore(ci): roda pgTAP no pull request
docs: registra decisão sobre provedor de e-mail
```

### Regras de tamanho (o mais importante)
- **Uma mudança lógica por commit.** Se precisa de "e" na descrição, provavelmente são dois commits.
- **Alvo: até ~150 linhas alteradas por commit.** O hook `.githooks/pre-commit` **avisa** a partir de 200 linhas e **pede confirmação** a partir de 400. (Arquivos gerados ou de terceiros — `package-lock.json`, `database.types.ts`, `referencias/`, `.claude/skills/`, `skills-lock.json` — não contam.)
- Ordem natural numa tarefa de banco: migration → políticas → testes → seed. Numa tarefa de tela: service → store → componente → estilos → testes.
- Testes entram no mesmo PR que o código (podem ser commit separado `test(...)`).
- Commit tem de deixar o projeto **compilando**. Nunca commitar código quebrado "para continuar depois".
- Use `git add -p` para escolher partes de um arquivo quando misturou duas mudanças.

## 3. Pull requests
- **Título:** `[T-XX] tipo(escopo): descrição` — ex.: `[T-24] feat(solicitacoes): tela de solicitações com abas e conversa`.
- **Descrição:** template automático `.github/pull_request_template.md`.
- **Tamanho:** alvo **até 400 linhas** (sem contar gerados). Se a tarefa passar disso, dividir em PRs encadeados (`T-24a`, `T-24b`) e listar em "Dependências".
- **Labels:** pelo menos uma de área + uma de tipo.
  - área: `setores` `tarefas` `item` `solicitacoes` `comentarios` `anexos` `painel` `usuarios` `ui` `seguranca` `banco` `infra`
  - tipo: `feature` `bug` `chore` `release`
- **Assignees:** quem trabalhou (Germano).
- **Merge:** só **Squash and merge** — o título do PR vira o commit da `main`, e os commits pequenos ficam no corpo.
- CI verde é obrigatório antes do merge.
- Depois do merge: apagar a branch e atualizar a `main` local.

## 4. Como o Claude Code aplica isto
- Use `/commit` para separar as mudanças pendentes em commits pequenos com mensagem no formato.
- Antes de `git push` e `gh pr create`, **pergunte ao Germano**.
- Toda mensagem de commit feita pelo Claude Code termina com o rodapé de coautoria configurado no ambiente.
