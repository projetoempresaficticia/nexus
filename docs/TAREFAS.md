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
- [ ] **T-16** Tarefas: `ItensService`, `ItensStore` (otimista + rollback), visão Lista (agrupada por projeto, com grupo "Sem projeto"), filtros (líder: "Só os meus" / "Toda a equipe"), modal Nova tarefa/subtarefa com projeto opcional e seletor de **vários responsáveis**. — Dep.: T-13, T-14, T-15 · US-08, US-21, US-34, US-35, US-36
- [ ] **T-17** Projetos: grade de cartões com progresso, criar projeto. — Dep.: T-16 · US-07
- [ ] **T-18** Página do item: breadcrumbs, **título editável no próprio lugar**, campos editáveis, responsáveis (adicionar/remover), mover tarefa avulsa para projeto, filhos, botões de status com motivo/aprovador, caixa de bloqueio, modo só leitura para itens de contexto. — Dep.: T-16 · US-09, US-10, US-35
- [ ] **T-19** Checklist e Dependências na página do item. — Dep.: T-18 · US-11, US-12
- [ ] **T-20** Exclusão em cascata com confirmação. — Dep.: T-18 · US-13
- [ ] **T-21** Recorrência no modal e no item; toast da próxima ocorrência. — Dep.: T-18 · US-14
- [ ] **T-22** Comentários: listar, criar, editar, apagar, menções. — Dep.: T-18 · US-18, US-19
- [ ] **T-23** Anexos: upload (≤ 20 MB), link externo, colar imagem no comentário, Edge Functions `url-anexo` e `limpar-anexos`. — Dep.: T-22 · US-20
- [ ] **T-24** Solicitações: bloco no item, tela com abas e conversa, responder/aprovar/recusar/cancelar, contador e aviso em Tarefas. — Dep.: T-18 · US-15, US-16, US-17
- [ ] **T-43** Tempo real: `RealtimeService` (um canal, Postgres Changes), merge nas stores por `id`/`atualizado_em`, indicador Ao vivo/Reconectando, recarga do que mudou ao reconectar, `setAuth` ao renovar sessão. — Dep.: T-24, T-22, T-08 · US-37
- [ ] **T-44** Abertura instantânea: `CacheLocalService` (IndexedDB por perfil), primeira pintura com o retrato e atualização em segundo plano; limpar no logout. — Dep.: T-43 · US-37
- [ ] **T-25** Visão Kanban (status/prioridade/projeto, CDK drag-drop, "Mover para…"). — Dep.: T-18 · US-22
- [ ] **T-26** Visões Árvore e Dependências. — Dep.: T-19 · US-23, US-27
- [ ] **T-27** Visões Agenda, Mês e Semana. — Dep.: T-16 · US-24
- [ ] **T-28** Visão Linha do tempo. — Dep.: T-16 · US-25
- [ ] **T-29** Visões Por pessoa e Carga de trabalho. — Dep.: T-16, T-11 · US-26
- [ ] **T-30** Painel (KPIs clicáveis + tabela de parados). — Dep.: T-24 · US-28
- [ ] **T-31** Produtividade (período, pessoa, comparação). — Dep.: T-30 · US-29
- [ ] **T-32** Equipe (organograma + linha de decisão). — Dep.: T-13 · US-06
- [ ] **T-33** Usuários (admin): lista, cadastrar, editar vínculos, desativar/reativar, reatribuir; Edge Functions `cadastrar-usuario` e `desativar-usuario`. — Dep.: T-13 · US-03, US-04
- [ ] **T-34** Setores (admin): árvore, criar, renomear, mover, desativar. — Dep.: T-13 · US-05
- [ ] **T-35** Histórico no item. — Dep.: T-18 · US-32
- [ ] **T-36** Notificações: Edge Function `enviar-notificacoes`, templates, pg_cron (2 min + lembrete diário 08:00 Lisboa). — Dep.: T-10 · US-30

## Fase 4 — Polimento
- [ ] **T-37** Desempenho: medir as métricas do PRD (inclui < 2 s do tempo real e < 500 ms da reabertura), revisar cache das stores e consultas lentas (`get_advisors`). — Dep.: T-16..T-31
- [ ] **T-38** Responsividade, acessibilidade e comparação visual tela a tela com o protótipo. — Dep.: T-37
- [ ] **T-39** E2E Playwright do fluxo principal (login local → criar tarefa → solicitação → responder → concluir) + teste com **duas sessões** a ver a mesma lista (tempo real). — Dep.: T-24, T-43

## Fase 5 — Produção e virada
- [ ] **T-40** Projeto Supabase de produção (região UE), Google OAuth em produção, URLs de redirect do GitHub Pages, segredos, `db push` e deploy das functions **com confirmação do Germano**; cadastrar os 2 admins. — Dep.: T-36, T-38, T-39
- [ ] **T-41** `scripts/importar-v26.ts` com `--dry-run`, mapeamento das abas e upsert por `legacy_id`. — Dep.: T-40 · US-33
- [ ] **T-42** Virada: congelar v26, importação final, checklist de validação, aviso à equipa, trocar link. — Dep.: T-41
