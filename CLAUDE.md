# Nexus v2 — Gerenciador de tarefas por setores

Sistema de gestão de tarefas da Prepara Portugal / Estude em Portugal, organizado em **Setor → Projeto → Tarefa → Subtarefa**, com solicitações entre colegas, comentários, anexos, várias visões e painéis para líderes.
É a reescrita do Nexus que hoje roda em Google Apps Script + Google Sheets (versão 26). O objetivo é **paridade total** com a v26, numa stack mais robusta.
O dono do projeto tem experiência **básica** em programação: explique em linguagem simples o que fez, porquê, e como testar.

## Stack
- **Frontend:** Angular (versão estável mais recente, componentes standalone, signals, `inject()`), TypeScript estrito, CSS próprio com tokens (sem biblioteca de UI). Angular CDK só para drag-and-drop e overlays.
- **Backend:** Supabase — Postgres com RLS, Auth (Google, restrito a `@estudeemportugal.org`), Storage (anexos), **Realtime** (telas atualizam sozinhas), Edge Functions em TypeScript/Deno (e-mails, cadastro de usuário), pg_cron.
- **Hospedagem:** GitHub Pages, com deploy automático por GitHub Actions a cada merge na `main`.
- **Testes:** Vitest (serviços), pgTAP (RLS e funções SQL), Playwright (1 fluxo e2e).
- Não existe servidor Node próprio. O Node é usado só como ferramenta (Angular CLI, build, testes, scripts).

## Comandos
```bash
npm install                     # instalar dependências
npx supabase start              # sobe o Supabase local (precisa do Docker)
npx supabase db reset           # recria a base local com migrations + seed.sql
npm start                       # Angular em http://localhost:4200
npm test                        # testes unitários (Vitest)
npx supabase test db            # testes de RLS (pgTAP)
npm run e2e                     # Playwright
npm run build                   # build de produção em dist/
npm run lint                    # lint
git config core.hooksPath .githooks   # ativar hooks de commit (uma vez)
git config commit.template .gitmessage  # modelo de mensagem de commit (uma vez)
```

## Estrutura de pastas
```
src/app/
  core/          supabase.client.ts, auth/, guards/, models/, services/ (globais)
  shared/        ui/ (botões, pills, modal, editor rico), pipes/, utils/
  features/      uma pasta por funcionalidade, cada uma com:
    <feature>/   <feature>.routes.ts · <feature>.page.ts · <feature>.service.ts
                 <feature>.store.ts (signals) · components/ · <feature>.spec.ts
  layout/        shell (barra lateral), tema
supabase/
  migrations/    SQL versionado (nunca editar migration já aplicada)
  functions/     Edge Functions (uma pasta por função)
  tests/         pgTAP
  seed.sql       dados fictícios para desenvolvimento
scripts/         importação Sheets → Supabase
e2e/             Playwright
```

## Convenções de código
- Nomes de arquivo no padrão Angular: `nome.tipo.ts` (ex.: `itens.service.ts`, `item.page.ts`).
- Código, tabelas e colunas em **português sem acento**, `snake_case` no SQL, `camelCase` no TS. Textos da interface em **PT-BR** (ver GLOSSARIO_UI.md).
- Toda leitura/escrita passa por um `*.service.ts`; componentes não chamam o Supabase direto.
- Regras de permissão vivem **no banco (RLS + funções SQL)**. O frontend só esconde botões; nunca é a única barreira.
- Regras de negócio que mudam vários registros (status por solicitação, recorrência, exclusão em cascata) são **funções SQL chamadas por RPC**, numa transação.
- HTML rico (descrições, comentários) é sanitizado com DOMPurify antes de salvar e ao exibir.
- **Visibilidade:** Membro vê só o que o envolve (SEGURANCA.md §2.1); Líder vê o setor. Nunca filtre isso só no frontend — a RLS decide.
- **Instantâneo:** toda ação é otimista na store; mudanças de colegas chegam pelo `RealtimeService` (um canal) e entram nas stores por merge (`id` + `atualizado_em`). Nenhuma tela pede para recarregar.
- Itens: tarefa pode não ter projeto (`pai_id` nulo); responsáveis ficam em `item_responsaveis` (vários por item).
- Datas: `date` no banco para prazos/início; `timestamptz` para eventos. Fuso de exibição: Europe/Lisbon.

## Documentos — leia quando precisar
| Documento | Quando ler |
|---|---|
| [docs/ESTADO_ATUAL.md](docs/ESTADO_ATUAL.md) | **Sempre no início da sessão** |
| [docs/TAREFAS.md](docs/TAREFAS.md) | **Sempre no início da sessão** — a próxima tarefa |
| [docs/PRD.md](docs/PRD.md) | Escopo, prioridades, o que está fora |
| [docs/CONTEXTO.md](docs/CONTEXTO.md) | Termos do negócio |
| [docs/PERSONAS.md](docs/PERSONAS.md) | Quem usa e como |
| [docs/USER_STORIES.md](docs/USER_STORIES.md) | O que cada funcionalidade deve permitir |
| [docs/CRITERIOS_ACEITE.md](docs/CRITERIOS_ACEITE.md) | Para saber quando uma tarefa está pronta |
| [docs/FLUXOS.md](docs/FLUXOS.md) | Máquinas de estado e fluxos |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Antes de qualquer migration ou query |
| [docs/SEGURANCA.md](docs/SEGURANCA.md) | Antes de mexer em tabelas, RLS, Storage ou Auth |
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Camadas e fluxo de dados |
| [docs/API.md](docs/API.md) | RPCs, Edge Functions, integrações |
| [docs/DESIGN.md](docs/DESIGN.md) | Antes de criar/alterar telas |
| [docs/GLOSSARIO_UI.md](docs/GLOSSARIO_UI.md) | Textos de botões, mensagens, e-mails |
| [docs/COMMITS.md](docs/COMMITS.md) | **Antes de cada commit, branch ou PR** |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Publicação e variáveis |
| [docs/DECISOES.md](docs/DECISOES.md) | Por que cada escolha foi feita |
| [docs/NAO_FAZER.md](docs/NAO_FAZER.md) | Proibições |
| [docs/ERROS_CONHECIDOS.md](docs/ERROS_CONHECIDOS.md) | Antes de depurar algo estranho |
| [docs/FERRAMENTAS.md](docs/FERRAMENTAS.md) | Como pesquisar quando houver dúvida |
| [docs/PROMPTS.md](docs/PROMPTS.md) | Pedidos prontos |
| [referencias/prototipo-aprovado.html](referencias/prototipo-aprovado.html) | **Fonte da verdade visual** — abra no navegador |

## Skills do projeto
- **angular/skills** (`angular-developer`, `angular-new-app`): ao criar o projeto (T-01) e sempre que escrever componentes, serviços, rotas, formulários ou testes Angular.
- **supabase/agent-skills**: ao escrever migrations, RLS, funções SQL, Storage, Auth e Edge Functions.
Instalação está na tarefa T-02. Se uma skill contradizer estes docs, **os docs do projeto vencem**; registe a divergência em DECISOES.md.

## Quando tiver dúvida
1. Procure nos docs acima.
2. Procure uma skill: `npx skills find <termos>` (ver FERRAMENTAS.md).
3. Pesquise em fontes oficiais (angular.dev, supabase.com/docs) com WebSearch — ou use `/pesquisar <dúvida>`.
4. Se for regra de negócio, **pergunte ao Germano**. Não invente; marque `> ⚠️ A CONFIRMAR:`.

## Regras críticas (resumo de NAO_FAZER.md)
1. Nunca coloque a `service_role key` no frontend nem em commits. No Angular só existe a `anon/publishable key`.
2. Toda tabela nova nasce com RLS ativado e políticas escritas e testadas (pgTAP) na mesma tarefa.
3. Nunca edite ou apague uma migration já aplicada; crie uma nova.
4. Nunca rode comandos contra o projeto Supabase de produção (`--linked`, `db push`) sem confirmação explícita.
5. Commits pequenos e no padrão de docs/COMMITS.md; nunca commite direto na `main`.

## Fluxo de trabalho de cada sessão
1. Leia ESTADO_ATUAL.md e TAREFAS.md. Pegue a primeira tarefa `- [ ]` com dependências concluídas.
2. Crie a branch `T-XX/resumo-curto` a partir da `main` atualizada.
3. Implemente em passos pequenos; a cada passo que funciona, faça um commit (`/commit`).
4. Verifique os critérios de aceite da(s) user story(ies) da tarefa e rode `npm test`, `npm run lint` e, se mexeu no banco, `npx supabase test db`.
5. Explique ao Germano, em linguagem simples, o que mudou e como testar no navegador.
6. Atualize ESTADO_ATUAL.md, TAREFAS.md (marque `- [x]`) e CHANGELOG.md (`/fechar-sessao`).
7. Abra o PR com o template (`[T-XX] tipo(escopo): descrição`) — só depois de o Germano autorizar o push.
