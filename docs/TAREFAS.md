# Tarefas

Regras: uma tarefa por sessão · branch `T-XX/resumo-curto` · commits pequenos (docs/COMMITS.md) · PR com título `[T-XX] tipo(escopo): descrição` · só marcar `[x]` com os critérios de aceite verificados.
Os IDs T-43 e T-44 foram acrescentados na revisão de 2026-10-22 e entram na ordem em que aparecem na lista.
Legenda: **Dep.** = tarefas que precisam estar concluídas antes.

## Fase 0 — Setup
- [x] **T-01** Criar o projeto Angular (skill `angular-new-app`): standalone, strict, roteamento, SCSS desligado (CSS), Vitest, ESLint, Prettier; estrutura `core/shared/features/layout`; `src/styles/tokens.css` com os tokens de DESIGN.md; fontes Google. Criar repositório GitHub `nexus` com `main` protegida. — Dep.: — · US: —- [x] **T-02** Instalar skills (`npx skills add https://github.com/angular/skills` e `npx skills add supabase/agent-skills`), ativar hooks (`git config core.hooksPath .githooks`), configurar `.gitmessage`, criar labels do GitHub (COMMITS.md), ativar só "Squash and merge". — Dep.: T-01
- [x] **T-03** Supabase local: `npx supabase init`, `config.toml` (Google + e-mail/senha só local, `site_url` localhost:4200), `core/supabase.client.ts`, `environments`. — Dep.: T-01
- [x] **T-03b** Apontar o desenvolvimento para o projeto Supabase `nexus-dev` na nuvem (decisão de 2026-10-23, PC com pouca RAM). — Dep.: T-03
- [x] **T-04** GitHub Actions: `ci.yml` (lint, test, build, pgTAP com Supabase local) em todo PR; `deploy.yml` para GitHub Pages na `main` (`--base-href /nexus/`, copiar `index.html` → `404.html`). — Dep.: T-03

## Fase 1 — Banco de dados
- [x] **T-05** Migration: enums; `perfis`, `setores`, `vinculos`; funções `meu_perfil_id`, `eh_admin`, `setores_descendentes`, `setores_visiveis`, `setores_administrados`, `administra_setor`; trigger anti-ciclo de setor; RLS; pgTAP. — Dep.: T-03 · US-02, US-05
- [x] **T-06** Migration: `itens` (com tarefa avulsa), `item_responsaveis`, `checklist_itens`, `dependencias`; triggers (nível/setor herdado, anti-ciclo, `atualizado_em`, `parado_desde`); `itens_envolvidos`, `pode_ver_item` (regra "só o que me envolve", SEGURANCA §2.1), `pode_editar_item`; RLS; pgTAP cobrindo US-36. — Dep.: T-05 · US-07..US-12, US-34..US-36
- [x] **T-07** Migration: `solicitacoes`, `solicitacao_mensagens`, `comentarios`, `mencoes`, `anexos`; bucket `anexos` + políticas Storage; RLS; pgTAP. — Dep.: T-06 · US-15..US-20
- [x] **T-08** Migration: `historico` + triggers de auditoria; `notificacoes`; views `vw_itens` (com `responsaveis`, `meu_envolvimento`) e `vw_produtividade`; índices; publicação `supabase_realtime` + `replica identity full` nas tabelas de SCHEMA §Tempo real. — Dep.: T-07 · US-30, US-32, US-37
- [x] **T-09** RPCs de itens: `criar_item` (inclui tarefa avulsa), `atualizar_item` (inclui título e mover avulsa ↔ projeto), `definir_responsaveis`, `mudar_status` (com recorrência), `contar_descendentes`, `excluir_item`, `definir_dependencia` + pgTAP. — Dep.: T-08 · US-08..US-14, US-34, US-35
- [x] **T-10** RPCs: `abrir_solicitacao`, `responder_solicitacao`, `cancelar_solicitacao`, `salvar_comentario` (menções + notificações) + pgTAP. — Dep.: T-09 · US-15, US-16, US-18, US-19
- [x] **T-11** RPCs `carregar_inicial`, `resumo_painel`, `carga_trabalho`, `salvar_setor`, `salvar_vinculos`, `reatribuir_itens`; revisar `supabase/seed.sql`; gerar `database.types.ts`. — Dep.: T-10 · US-26, US-28

## Fase 2 — Acesso
- [x] **T-12** Auth: Google OAuth, hook `auth_hook_antes_criar_usuario`, trigger de ligação `auth_id`, telas Login e Sem acesso, `AuthService`, guards. — Dep.: T-05, T-04 · US-01, US-02
- [x] **T-13** Shell: barra lateral por perfil, contador de solicitações, Meus setores, seletor de Setor, tema claro/escuro, `AcessoStore` com `carregar_inicial`. — Dep.: T-12, T-11 · US-31

## Fase 3 — Funcionalidades
- [x] **T-14** `shared/ui`: botão, pill-status, nível, avatar, modal, confirmação, toast, vazio, carregando, kpi-card, barra; `textos.ts` e `rotulos.ts`. — Dep.: T-01
- [x] **T-15** Editor rico (TipTap) com barra do protótipo, link em popup, @menção, colar imagem (gancho para upload); `html-seguro.pipe` com DOMPurify. — Dep.: T-14 · US-18
- [x] **T-16** Tarefas: `ItensService`, `ItensStore` (otimista + rollback), visão Lista (agrupada por projeto, com grupo "Sem projeto"), filtros (líder: "Só os meus" / "Toda a equipe"), modal Nova tarefa/subtarefa com projeto opcional e seletor de **vários responsáveis**. — Dep.: T-13, T-14, T-15 · US-08, US-21, US-34, US-35, US-36
- [x] **T-17** Projetos: grade de cartões com progresso, criar projeto. — Dep.: T-16 · US-07
- [x] **T-18** Página do item: breadcrumbs, **título editável no próprio lugar**, campos editáveis, responsáveis (adicionar/remover), mover tarefa avulsa para projeto, filhos, botões de status com motivo/aprovador, caixa de bloqueio, modo só leitura para itens de contexto. — Dep.: T-16 · US-09, US-10, US-35
- [x] **T-19** Checklist e Dependências na página do item. — Dep.: T-18 · US-11, US-12
- [x] **T-20** Exclusão em cascata com confirmação. — Dep.: T-18 · US-13
- [x] **T-21** Recorrência no modal e no item; toast da próxima ocorrência. — Dep.: T-18 · US-14
- [x] **T-22** Comentários: listar, criar, editar, apagar, menções. — Dep.: T-18 · US-18, US-19
- [x] **T-23** Anexos: upload (≤ 20 MB), link externo, colar imagem no comentário, Edge Functions `url-anexo` e `limpar-anexos`. — Dep.: T-22 · US-20
- [x] **T-24** Solicitações: bloco no item, tela com abas e conversa, responder/aprovar/recusar/cancelar, contador e aviso em Tarefas. — Dep.: T-18 · US-15, US-16, US-17
- [x] **T-43** Tempo real: `RealtimeService` (um canal, Postgres Changes), merge nas stores por `id`/`atualizado_em`, indicador Ao vivo/Reconectando, recarga do que mudou ao reconectar, `setAuth` ao renovar sessão. — Dep.: T-24, T-22, T-08 · US-37
- [x] **T-45** Só o autor edita e exclui: comentários (líder deixa de apagar), solicitações (editar texto pendente, excluir) e mensagens da conversa — banco (T-45a) e telas (T-45b). — Dep.: T-24, T-22 · US-19, US-38
- [x] **T-46** Filtro por pessoa nas visões de Tarefas, conforme a hierarquia do líder. — Dep.: T-26 · US-39
- [x] **T-48** Hospedagem no Cloudflare Pages (repositório privado) e backup diário encriptado do Supabase para o Google Drive, com restauro testado (docs/BACKUP.md). — Pedido do Germano
- [x] **T-51** Setores: excluir setor vazio e organizar a hierarquia arrastando. — Pedido do Germano · US-05
- [x] **T-52** Anexos só no Google Drive: Edge Function `enviar-anexo` (pasta por setor, link para o domínio), `drive_id` protegido, fila da lixeira do Drive em `limpar-anexos`; imagens coladas seguem no Storage. — Dep.: T-23, T-48 · Pedido do Germano · US-20
- [x] **T-51b** Líder renomeia, move, desativa e exclui os subsetores abaixo dele (nunca o próprio setor nem os de cima). — Dep.: T-51 · Pedido do Germano · US-05
- [x] **T-56** Login aceita contas externas explicitamente aprovadas (além de `@estudeemportugal.org`), numa função só usada pela CHECK de `perfis` e pelo hook de login. — Dep.: T-12 · Pedido do Germano · US-02
- [x] **T-57** Corrige o login real: faltava `USAGE` no schema `privado` para `supabase_auth_admin` (a T-56 passou a chamar uma função de lá de dentro do hook). — Dep.: T-56
- [x] **T-58** Corrige o "‹ Hoje ›" empilhado e escuro no Mês/Semana/Linha do tempo (classe `.nav` colidia com a da barra lateral). — Pedido do Germano · US-24, US-25
- [x] **T-59** Sino de notificações dentro do app + preferência "também por e-mail" por pessoa. — Dep.: T-36 · Pedido do Germano · US-30
- [x] **T-60** Usuários: o Adm liga/desliga o e-mail de notificações de uma pessoa ou de todas de uma vez. — Dep.: T-59 · Pedido do Germano · US-30
- [x] **T-61** Ícone da aba do navegador com a marca do Nexus (era o padrão do Angular). — US-31
- [x] **T-62** Campo de Responsável mostra as pessoas ao focar, não só ao digitar (confundia e prejudicava as métricas). — Pedido do Germano · US-35
- [x] **T-63** Tela Notificações (menu, todo mundo): todo o histórico, não só as 50 do sino. — Dep.: T-59 · Pedido do Germano · US-30
- [x] **T-50** Cópia semanal dos arquivos dos anexos (Storage) para o Google Drive, encriptada, com guia de restauro (BACKUP.md §8). — Dep.: T-48
- [x] **T-49** E-mail pelo SMTP do Google Workspace em `_shared/email.ts` (senha de app; porta 465). — Dep.: T-36
- [x] **T-47** Checklist: @menção no passo (a pessoa marcada recebe aviso) e editar o texto com duplo clique. — Dep.: T-19, T-22 · US-40
- [x] **T-44** Abertura instantânea: `CacheLocalService` (IndexedDB por perfil), primeira pintura com o retrato e atualização em segundo plano; limpar no logout. — Dep.: T-43 · US-37
- [x] **T-25** Visão Kanban (status/prioridade/projeto, CDK drag-drop, "Mover para…"). — Dep.: T-18 · US-22
- [x] **T-26** Visões Árvore e Dependências. — Dep.: T-19 · US-23, US-27
- [x] **T-27** Visões Agenda, Mês e Semana. — Dep.: T-16 · US-24
- [x] **T-28** Visão Linha do tempo. — Dep.: T-16 · US-25
- [x] **T-29** Visões Por pessoa e Carga de trabalho. — Dep.: T-16, T-11 · US-26
- [x] **T-30** Painel (KPIs clicáveis + tabela de parados). — Dep.: T-24 · US-28
- [x] **T-31** Produtividade (período, pessoa, comparação). — Dep.: T-30 · US-29
- [x] **T-32** Equipe (organograma + linha de decisão). — Dep.: T-13 · US-06
- [x] **T-33** Usuários (admin): lista, cadastrar, editar vínculos, desativar/reativar, reatribuir; RPCs `cadastrar_usuario`, `desativar_usuario`, `reativar_usuario` (substituem as Edge Functions). — Dep.: T-13 · US-03, US-04
- [x] **T-34** Setores (admin): árvore, criar, renomear, mover, desativar. — Dep.: T-13 · US-05
- [x] **T-35** Histórico no item. — Dep.: T-18 · US-32
- [x] **T-36** Notificações: Edge Function `enviar-notificacoes`, templates, pg_cron (2 min + lembrete diário 08:00 Lisboa). — Dep.: T-10 · US-30

## Fase 4 — Polimento
- [x] **T-37** Desempenho: medir as métricas do PRD (inclui < 2 s do tempo real e < 500 ms da reabertura), revisar cache das stores e consultas lentas (`get_advisors`). — Dep.: T-16..T-31
- [ ] **T-38** Responsividade, acessibilidade e comparação visual tela a tela com o protótipo. — Dep.: T-37
- [ ] **T-39** E2E Playwright do fluxo principal (login local → criar tarefa → solicitação → responder → concluir) + teste com **duas sessões** a ver a mesma lista (tempo real). — Dep.: T-24, T-43

## Fase 5 — Produção e virada
- [ ] **T-40** Projeto Supabase de produção (região UE), Google OAuth em produção, URLs de redirect do GitHub Pages, segredos, `db push` e deploy das functions **com confirmação do Germano**; cadastrar os 2 admins. — Dep.: T-36, T-38, T-39
- [ ] **T-41** `scripts/importar-v26.ts` com `--dry-run`, mapeamento das abas e upsert por `legacy_id`. **Pausada em 2026-10-25**: Germano enviou a planilha real (`Configurações`, `Notificações`, `Setores`, `Usuários`, `Vínculos`, `Itens`, `Checklist`, `Solicitações`, `Mensagens`, `Comentários`, `Anexos`, `Histórico`) e confirmou trazer tudo, inclusive o Histórico (924 linhas) e as Notificações antigas (61 linhas, só marcadas como já lidas — **sem mandar e-mail**, sem passar pelas triggers de notificação: `session_replication_role = replica` durante a carga, como no restauro do backup). Falta: (a) o banco de destino (nexus-dev só para testar, ou já criar a produção — T-40) e (b) uma mudança que o Germano disse que precisa fazer antes, ainda não detalhada. — Dep.: T-40 · US-33
- [ ] **T-42** Virada: congelar v26, importação final, checklist de validação, aviso à equipa, trocar link. — Dep.: T-41
