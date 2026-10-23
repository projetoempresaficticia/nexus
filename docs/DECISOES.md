# Registo de decisões

Formato: data · decisão · alternativas · fonte · motivo.

| data | decisão | alternativas | fonte | motivo |
|---|---|---|---|---|
| 2026-10-22 | Reescrever o Nexus v26 (Apps Script + Sheets) como web app | continuar no Apps Script | utilizador | desempenho, permissões no banco, testes, PRs, deploy automático |
| 2026-10-22 | **Supabase como backend** (Postgres + RLS + Auth + Storage + Edge Functions) | Node (NestJS/Express) no Render/Railway + Supabase | utilizador, após explicação | GitHub Pages não roda Node; Supabase já cobre auth, dados, arquivos e funções; um serviço a menos para manter e pagar |
| 2026-10-22 | **Angular** no frontend | React + Vite, Next.js, HTML+JS | utilizador | o v26 já segue a organização do Angular; o utilizador quer esse padrão |
| 2026-10-22 | **GitHub Pages** para hospedar | Vercel, Netlify | utilizador | gratuito, já usa GitHub, deploy por Actions |
| 2026-10-22 | Login **Google da empresa**, restrito a `@estudeemportugal.org` e a perfis pré-cadastrados (hook) | e-mail/senha, link mágico | utilizador | igual ao v26, sem senhas |
| 2026-10-22 | **Manter v26 e v2 em paralelo** até a virada; importação idempotente por `legacy_id` | começar do zero, migrar já | utilizador | segurança na transição |
| 2026-10-22 | MVP = **paridade com a v26** | só núcleo; paridade + tempo real | utilizador | a equipa não deve perder nada ao trocar |
| 2026-10-22 | Testes nas **regras principais**: pgTAP (RLS/RPC), Vitest (serviços/stores), 1 fluxo Playwright | básico manual, completo | utilizador | segurança onde importa sem travar o ritmo |
| 2026-10-22 | Claude Code **trabalha sozinho por etapas**; pede confirmação para instalar pacotes, migrations remotas, push e deploy | perguntar sempre, autonomia máxima | utilizador | equilíbrio entre ritmo e controle |
| 2026-10-22 | Skills: **angular/skills** (oficial) e **supabase/agent-skills** | nenhuma | utilizador; fontes: angular.dev/ai/agent-skills, instruções do MCP Supabase | boas práticas oficiais das duas tecnologias |
| 2026-10-22 | Padrão de **branches/commits/PRs** do artigo do TabNews (guscsales), com IDs `T-XX`, commits ≤ ~150 linhas, PR ≤ 400, Squash and merge, hook de aviso | — | utilizador | histórico organizado e PRs revisáveis |
| 2026-10-22 | Visual = **protótipo aprovado** (tokens, Bricolage Grotesque + Figtree, claro/escuro) | novo visual | conversa anterior | já aprovado e portado no v26 |
| 2026-10-22 | Projeto/Tarefa/Subtarefa numa **tabela única `itens`** com `nivel` | 3 tabelas | conversa anterior (modelo unificado do v26) | regras e visões iguais para os 3 níveis |
| 2026-10-22 | **Qualquer vínculo no setor pode criar projeto** | só Líder/Adm | utilizador (v26) | decisão "por enquanto" do v26 |
| 2026-10-22 | Regras de negócio em **RPCs SQL** (`security definer`) | lógica no frontend; Edge Functions | Claude | transação única, segurança no banco, menos idas ao servidor (causa da lentidão do v26) |
| 2026-10-22 | Perfis pré-cadastrados (tabela `perfis` com `auth_id` ligado no 1º login) | perfil criado no 1º login | Claude | Adm cadastra antes, como no v26; permite importar usuários do v26 |
| 2026-10-22 | Editor rico **TipTap** + **DOMPurify** | Quill, contenteditable próprio | Claude | suporta menções e colar imagem; sanitização robusta |
| 2026-10-22 | Gantt, calendário e carga **feitos à mão** | bibliotecas (dhtmlx, FullCalendar) | Claude | manter o visual do protótipo e o bundle leve |
| 2026-10-22 | Rotas do SPA no Pages com **cópia `index.html` → `404.html`** | hash routing (`/#/`) | Claude | URLs limpas e links de e-mail bonitos |
| 2026-10-22 | E-mail via **Resend** atrás de `_shared/email.ts` | SMTP Google Workspace | Claude | > ⚠️ A CONFIRMAR com o utilizador/TI |
| 2026-10-22 | **Tarefas podem existir sem projeto** (tarefa avulsa, `pai_id` nulo, setor obrigatório) | só dentro de projeto (v26) | utilizador | nem toda tarefa tem projeto |
| 2026-10-22 | **Vários responsáveis** por item (tabela `item_responsaveis`) | um responsável (v26) | utilizador | trabalho partilhado |
| 2026-10-22 | **Título editável** no próprio lugar | — | utilizador | não dava para editar |
| 2026-10-22 | **Membro vê só o que o envolve** (+ caminho até lá e descendentes do que é seu); Líder vê o setor, com filtro "Só os meus" | membro vê o setor todo (v26) | utilizador | foco e privacidade |
| 2026-10-22 | **Tempo real no MVP** com Supabase Realtime (Postgres Changes, respeita RLS) + cache local IndexedDB + otimista | v2; Broadcast | utilizador (pedido); Claude (técnica) | eliminar recarregar manual; Postgres Changes é o mais simples para o tamanho da equipa |
| 2026-10-22 | Membro **não vê outras tarefas do mesmo projeto** em que não está envolvido (só o caminho até as suas) | ver irmãos | utilizador | não é responsável por elas |
| 2026-10-22 | findskills: `npx skills find` não devolveu resultados neste ambiente; Hermes não encontrado | — | Fase 0 | pesquisa feita na web (fontes oficiais) |
| 2026-10-22 | **Angular 22.2** (Node ≥ 24.15), **zoneless**, Vitest, TypeScript 6 com `strict` + `strictTemplates` explícitos | Angular 21 LTS; com zone.js | Claude (T-01) | versão estável mais recente; zoneless é o padrão novo e combina com signals |
| 2026-10-22 | Nomes de arquivo no estilo **2016** do Angular CLI (`app.component.ts`, `x.service.ts`) | estilo 2025 (`app.ts`) | Claude (T-01) | CLAUDE.md pede `nome.tipo.ts`; o estilo 2016 gera o tipo no nome |
| 2026-10-22 | ESLint por **angular-eslint 22** (inclui regras de acessibilidade de template) + `no-console` (só `warn`/`error`) | sem lint de templates | Claude (T-01) | NAO_FAZER #21 e DESIGN.md §Acessibilidade |
| 2026-10-22 | `.gitattributes` com `eol=lf` | deixar `autocrlf` do Windows | Claude (T-01) | hooks e scripts com CRLF quebram no Linux do CI |
| 2026-10-22 | Skills instaladas **no projeto** (`.claude/skills/`, versionadas, `--copy`): `angular-developer`, `angular-new-app`, `supabase`, `supabase-postgres-best-practices`; versões fixadas em `skills-lock.json` | instalação global; symlinks | Claude (T-02) | quem clonar o repo tem as mesmas skills; symlinks falham no Windows. Auditadas: só Markdown, sem scripts |
| 2026-10-22 | Divergência skill × docs: `angular-developer` prefere nomes sem sufixo (`auth.ts`); o projeto usa `nome.tipo.ts` (CLAUDE.md). **Vale o CLAUDE.md** — a própria skill manda respeitar a convenção existente | adotar estilo da skill | Claude (T-02) | regra do CLAUDE.md: docs do projeto vencem |
| 2026-10-22 | Hook `pre-commit` procura o **valor** de chaves secretas (`SERVICE_ROLE_KEY=…`, JWT após `service_role`, `sb_secret_…`), não a palavra `service_role` | manter regex antiga | Claude (T-02) | a regra antiga bloqueava `grant … to service_role` em migrations e docs |
| 2026-10-22 | GitHub: só **Squash and merge**, título do commit = título do PR, corpo = commits; apagar branch após merge; labels de área (roxo) e tipo (verde/vermelho/azul/amarelo) | — | COMMITS.md (T-02) | histórico da `main` com um commit por tarefa |
| 2026-10-23 | Environments no padrão do Angular: `environment.ts` = **produção** (vazio no Git, preenchido pelo deploy) e `environment.development.ts` = local; propriedades `supabaseUrl`, `supabaseAnonKey`, `appUrl` | `environment.prod.ts` gerado só no CI (DEPLOY.md antigo) | Claude (T-03), skill angular-developer | `ng generate environments` + `fileReplacements`; `npm run build` funciona sem secrets |
| 2026-10-23 | Cliente Supabase como `InjectionToken` `SUPABASE` (`providedIn: 'root'`, PKCE, sessão persistida) em `core/supabase.client.ts`; sem tipagem `Database` até T-11 | classe service | Claude (T-03) | uma instância, fácil de trocar por mock nos testes |
| 2026-10-23 | `auto_expose_new_tables = false` no local | padrão `true` | Claude, changelog Supabase 2026-04-28 | na nuvem é obrigatório desde 30/10/2026; migrations (T-05+) precisam de `grant` explícito a `authenticated` além da RLS |
| 2026-10-23 | Versões fixas (sem `^`): `@supabase/supabase-js` 2.118.0, `supabase` (CLI) 2.121.0 | intervalo `^` | skill supabase (supply-chain) | atualização consciente |
| 2026-10-23 | `config.toml` sem os comentários de exemplo do `supabase init` (mesmos valores) | manter 415 linhas | Claude (T-03) | hook bloqueia commit ≥ 400 linhas sem terminal; `--no-verify` recusado; referência fica na doc oficial |
| 2026-10-23 | `npm run db:start` sobe Supabase reduzido (sem Studio, logs, storage, edge runtime, mailpit) | stack completo | Claude (T-03) | PC do Germano tem 6 GB de RAM (ver ERROS_CONHECIDOS); CI usa o completo |
| 2026-10-22 | Repositório GitHub **público** em `projetoempresaficticia/nexus`, `main` protegida (PR obrigatório, vale para admins, histórico linear, sem force push nem exclusão) | privado + GitHub Pro | Germano (conta e visibilidade) | gratuito; proteção de branch e GitHub Pages no plano free exigem repositório público. Antes de abrir: histórico verificado sem chaves e só com dados fictícios |
