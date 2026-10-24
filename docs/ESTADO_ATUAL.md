# Estado atual

## Última sessão
2026-10-24 — T-01 a T-37, T-43 a T-47 concluídas. T-48 a T-52 concluídas. nexus-dev em dia: 16 migrations e as Edge Functions limpar-anexos, enviar-notificacoes e enviar-anexo publicadas.

## Feito
- Documentação completa em `docs/`, `CLAUDE.md`, configuração do Claude Code em `.claude/`, padrão de commits (`.gitmessage`, `.githooks/`, template de PR).
- Protótipo visual aprovado copiado para `referencias/prototipo-aprovado.html`.
- **T-01**: Angular 22.2, estrutura `core/shared/features/layout`, tokens de design, fontes, ESLint + Prettier, `.gitattributes` (LF). Repositório **público** https://github.com/projetoempresaficticia/nexus com `main` protegida.
- **T-02**: skills em `.claude/skills/` (+ `skills-lock.json`), `commit.template`, 16 labels, merge só por squash, hook de segredos corrigido.
- **T-03**: `supabase/config.toml` (localhost:4200, Google por `supabase/.env`, e-mail/senha só local, `auto_expose_new_tables = false`, `health_timeout` 10m, seed desligado), `core/supabase.client.ts` (token `SUPABASE`), `environment.ts` (produção, vazio) e `environment.development.ts` (local), `npm run db:start`.
- **T-03b**: desenvolvimento aponta para o projeto Supabase **nexus-dev** na nuvem (`https://woroiluncnfscajlqoot.supabase.co`, Frankfurt).
- **T-04**: `ci.yml` (lint, formatação, testes, build, chave secreta no bundle, pgTAP) — checks obrigatórios na `main`; `deploy.yml` → https://projetoempresaficticia.github.io/nexus/ (secrets `SUPABASE_URL`/`SUPABASE_ANON_KEY` = nexus-dev até a T-40).
- **T-05**: migration `20261023075322_perfis_setores_vinculos.sql` (7 enums, `perfis`, `setores`, `vinculos`, funções em `privado`, trigger anti-ciclo, RLS + grants), `supabase/tests/001_perfis_setores_vinculos.test.sql` (24 testes, verdes no CI). Aplicada no nexus-dev; advisors de segurança sem alertas; API anônima recusada.
- **T-06**: migration `20261023080619_itens_responsaveis_checklist_dependencias.sql` (itens + tarefa avulsa, responsáveis, checklist, dependências; triggers de nível/setor/status/ciclo; `itens_visiveis`/`pode_ver_item`/`pode_editar_item`; RLS) + 32 testes pgTAP. Aplicada no nexus-dev.
- **T-07**: migration `20261023083122_solicitacoes_comentarios_anexos.sql` (solicitações, mensagens, comentários, menções, anexos; envolvimento por solicitação/menção; bucket privado `anexos` + políticas Storage) + 23 testes. Aplicada no nexus-dev.
- **T-08**: migration `20261023193718_historico_notificacoes_views_realtime.sql` (historico + trigger de auditoria em itens/solicitacoes/vinculos/perfis, notificacoes + `privado.notificar`, `vw_itens`, `vw_produtividade`, Realtime em 8 tabelas) + 16 testes; seed religado (CI). Aplicada no nexus-dev. Advisor INFO "notificacoes sem política" é intencional (só service role).
- **T-09**: migration `20261023195015_rpcs_itens.sql` (criar_item, atualizar_item, definir_responsaveis, mudar_status + recorrência, contar_descendentes, excluir_item, definir_dependencia) + 30 testes. **Ainda NÃO aplicada no nexus-dev** (confirmação recusada).
- **T-10**: migration `20261023204848_rpcs_solicitacoes_comentarios.sql` (abrir/responder/cancelar solicitação, salvar_comentario com menções) + 25 testes. Por aplicar no nexus-dev.
- **T-11**: migration `20261023213218_rpcs_painel_admin.sql` (carregar_inicial, resumo_painel, carga_trabalho, salvar_setor, salvar_vinculos, reatribuir_itens) + 20 testes; `core/models/database.types.ts` gerado pelo CI (job pgTAP gera e compara; artefato `database-types`); cliente Supabase tipado. Por aplicar no nexus-dev.
- **T-12**: migration `20261023230649_auth_hook_e_ligacao_perfil.sql` (hook + trigger em auth.users) + 9 testes; `AuthService`, guards `autenticado`/`visitante`, telas Login e Sem acesso, `core/models/textos.ts`, estilos do protótipo em `src/styles/prototipo.css`, `src/testing/supabase-falso.ts`. Login com senha só em dev.
- **T-13**: `AcessoStore` (carregar_inicial, papéis, filtro de setor) + `AcessoService`, `ErroApi`, `TemaService`, `ShellComponent` (menu por perfil, contador, Meus setores, tema, sair), `CabecalhoComponent` (seletor de setor), guards acesso/líder/admin, rotas com `EmBrevePage` para as telas ainda não feitas.
- **T-14**: `shared/ui` (pill-status, nivel, avatar, avatares, barra, kpi-card, vazio, carregando, modal com CDK cdkTrapFocus, toast + ToastService, confirmacao + ConfirmacaoService) e `core/models/rotulos.ts`. Botões usam as classes `.btn` do protótipo (sem componente).
- **T-15**: `shared/ui/editor-rico` (TipTap: barra do protótipo, link em popup, @menção com `#mention-pop`, imagem via gancho `enviarImagem`, colar imagem), `shared/utils/html-seguro.ts` (DOMPurify) e `shared/pipes/html-seguro.pipe.ts`.
- **T-16** (PRs T-16a e T-16b): `core/itens` (ItensService, ItensStore otimista), `shared/utils/datas.ts`, `LinhaItemComponent`, `SeletorPessoasComponent`, `features/tarefas` (TarefasPage — visão Lista; demais visões mostram "em construção" até T-25..T-29; `NovoItemModal` para projeto/tarefa/subtarefa). Rota `item/:id` provisória.
- **T-17**: `features/projetos` (grade `.pcard`, progresso por tarefas, parados abaixo, cartão "Sem projeto", "+ Novo projeto" para quem tem setores — qualquer vínculo cria projeto, DECISOES).
- **T-18** (T-18a + T-18b): `features/item` — ItemPage (caminho, `app-titulo-editavel`, descrição, bloqueio, só leitura), `StatusItemComponent`, `DetalhesItemComponent` (responsáveis, prioridade, repetir, datas, projeto, setor, decide, progresso), `FilhosItemComponent`; `core/itens/permissoes.ts`.
- **T-19**: `features/item/item.service.ts` (checklist direto na tabela com RLS; dependências via RPC), `ChecklistItemComponent` (otimista), `DependenciasItemComponent` (espera por / bloqueia; ciclo → erro do glossário).
- **T-20**: botão Excluir na página do item (líder/adm, ou criador sem filhos — ⚠️ regra a confirmar), confirmação com contagem (`contar_descendentes`), `ItensStore.excluir` tira o item e os descendentes do cache. Limpeza dos arquivos no Storage fica para a T-23 (caminhos já vêm do RPC).
- **T-21**: recorrência ponta a ponta (RPC T-09 + modal + detalhes + selo ↻ + toast da próxima). ⚠️ "Diária" = +1 dia corrido (FLUXOS); protótipo usava dias úteis — a confirmar.
- **T-22**: `ComentariosItemComponent` (listar, publicar sanitizado via `salvar_comentario`, editar só autor com "(editado)", apagar autor/líder com confirmação). Pendência: autor desativado aparece como "Pessoa removida" (a RLS de perfis só mostra ativos) — resolver na T-33 para cumprir US-04.
- **T-23** (T-23a + T-23b): `AnexosService` (upload privado, link, URL assinada, imagem colada, limpar), `AnexosItemComponent`, diretiva `appImagensPrivadas`, editor com `data-caminho`, Edge Function `supabase/functions/limpar-anexos`.
- **T-24** (T-24a + T-24b): `core/solicitacoes` (service, store, `permissoes-solicitacao.ts`), modal `NovaSolicitacaoModal` (sugere quem decide na Aprovação), `SolicitacoesItemComponent` na coluna lateral do item, `SolicitacoesPage` em `/solicitacoes?id=` (abas, lista, item de origem, conversa, aprovar/recusar/resolver/cancelar, mensagem).
- **T-43**: `core/services/realtime.service.ts` (canal único `nexus`, 8 tabelas, estado Ao vivo/Reconectando, `ouvir`/`ouvirAqui`, `afetaItem`, `setAuth` ao renovar token) e `sincronizacao.service.ts` (liga canal → `ItensStore.sincronizar`, `SolicitacoesStore.sincronizar`, `AcessoStore.recontarPendentes`; offline; aba escondida > 10 min); shell abre/fecha o canal e mostra o indicador; blocos do item recarregam ao receber evento; realce de 1,5 s na `LinhaItem`.
- **T-44**: `core/services/cache-local.service.ts` (IndexedDB `nexus-cache`, chave `versão:usuário:nome`, `agendar` com 1 s, no-op sem IndexedDB); retratos de `acesso` (carregar_inicial + pendentes), `itens` e `solicitacoes` mostrados na hora e atualizados em segundo plano; perfil desativado desde a última visita → apaga e vai para Sem acesso; logout apaga o IndexedDB e esvazia as stores.
- **T-25**: `features/tarefas/visoes/kanban.component` (CDK drag-drop, colunas status/prioridade/projeto, menu "Mover para…", realce `.over`), `shared/ui/mudar-status.component` (motivo/aprovador/confirmação, usado pelo item e pelo Kanban), filtro "Todos / Só as minhas" nas visões além da Lista.
- **T-26**: `visoes/arvore.component` (galhos = projetos/contexto, filtro por predicado `interessa`, pai fora do filtro vira raiz, "Sem projeto") e `visoes/dependencias.component` (pares setor do item → setor principal do destinatário das solicitações pendentes, SVG em elipse como no protótipo).
- **T-45** (T-45a + T-45b): migration `20261024031708_so_autor_edita_exclui.sql` + pgTAP 009; comentários só o autor apaga; solicitação: Editar (pendente) e Excluir só para o autor; mensagens: Editar/Apagar as minhas; tempo real recebe UPDATE/DELETE de mensagens.
- **T-46**: filtro "Pessoa" na barra de visões de Tarefas (só líder; pessoas com vínculo nos setores administrados dentro do setor do cabeçalho; filtra por responsável em Lista, Kanban e Árvore). ⚠️ membro não vê o filtro (a confirmar).
- **T-47** (T-47a + T-47b): migration `20261024035841_checklist_mencoes.sql` + pgTAP 010; `shared/ui/campo-mencao.component` (campo de uma linha com @) e `shared/utils/mencoes-texto.ts`; passo do checklist guardado como HTML escapado com menções; duplo clique / ✎ edita, Enter ou sair salva, Esc cancela.
- **T-27**: `visoes/agenda.component` e `visoes/calendario.component` (modo mês/semana, referência compartilhada com a página, "+N mais" abre a Semana, CDK drag-drop muda `prazo`, ocorrências previstas via `ocorrencias()` em `datas.ts`).
- **T-28**: `visoes/gantt.component` (70 dias a partir da segunda da semana passada, ‹ › de 14 dias, ordem da Árvore, marco em losango quando não há início).
- **T-29**: `visoes/por-pessoa.component` (arrastar troca só a pessoa da coluna de origem; mantém os outros responsáveis) e `visoes/carga.component` (calculado no navegador a partir da store, sem chamar `carga_trabalho`); `visoes/equipe.ts` com utilitários comuns. Todas as visões de Tarefas prontas.
- **T-30**: `features/painel` (KPIs, parados, projetos; calculado das stores de itens e solicitações, atualiza em tempo real); Tarefas aceita `?aba=`.
- **T-31** (T-31a + T-31b): `features/produtividade` (calculos puros testados, service de `vw_produtividade`, página com KPIs e Equipe, `graficos.component` com SVG próprio). Fora: Fluxo do trabalho e por motivo (⚠️ DECISOES).
- **T-32**: `features/equipe` (linha de decisão por vínculo, organograma recursivo com `ng-template`, setores só-caminho esmaecidos; só "Minha árvore").
- **T-33** (T-33a + T-33b): migration `20261024100959_usuarios_admin.sql` + pgTAP 011; `features/usuarios` (lista, busca, inativos, modais Novo usuário / Setores / Reatribuir); `AcessoStore` busca `pessoas_inativas()` (nomes de quem saiu) e tem `recarregar()`. Resolve a pendência "Pessoa removida" da T-22.
- **T-34**: `features/setores` (página do Adm, `NovoSetorModal` compartilhado com a Equipe, `SetoresService`: criar por insert com RLS, alterar por `salvar_setor`); `EmBrevePage` removida (todas as rotas têm tela).
- **T-35**: migration `20261024103800_historico_responsaveis.sql` (trigger em `item_responsaveis`) + pgTAP 012; `HistoricoItemComponent` na página do item.
- **T-36** (T-36a + T-36b): migration `20261024105531_notificacoes_autor_lembretes.sql` + pgTAP 013; Edge Function `enviar-notificacoes`, `_shared/modelos-email.ts` (testado pelo Vitest — `angular.json` inclui `../supabase/functions/**/*.spec.ts`), `_shared/email.ts` (`EMAIL_PROVEDOR=nenhum|resend`), `supabase/agendamentos.sql` (rodar à mão por projeto). ⚠️ Provedor de e-mail a confirmar.
- **T-37** (desempenho): `core/services/paginar.ts` (`buscarTodas`, páginas de 1000 com ordem estável) em itens, solicitações e produtividade; `ItensStore.filhos` com índice pai → filhos. Medido no build: carga inicial **563 kB / ~140 kB transferidos** (meta < 3 s); editor TipTap (~121 kB) só ao abrir item. **Falta medir com o banco no ar** (T-39/T-40): tempo real < 2 s, reabertura < 500 ms, confirmação < 1 s, e `get_advisors` depois de aplicar as migrations.
- **T-48**: `scripts/gerar-environment.mjs` + `npm run build:cloudflare` + `.nvmrc` + `public/_redirects` e `public/_headers` (Cloudflare Pages); `deploy.yml` do GitHub Pages só manual; `.github/workflows/backup-supabase.yml` + `scripts/backup/drive.py` + `docs/BACKUP.md`. **Falta o Germano:** ligar o Cloudflare (DEPLOY.md), criar a conta de serviço, o usuário `backup_leitura` e os 4 secrets (BACKUP.md), tornar o repositório privado.
- **nexus-dev atualizado (2026-10-24):** as 13 migrations aplicadas pelo Germano com `supabase db push` e `limpar-anexos` publicada; RLS ativo em todas as tabelas; advisors só com os avisos esperados (funções RPC chamáveis por logados; `notificacoes` sem política de propósito).
- **T-49**: `_shared/email.ts` com SMTP do Google (`nodemailer`, porta 465) e modo `nenhum`; segredos `SMTP_USUARIO`/`SMTP_SENHA_APP` (DEPLOY.md). **Teste real só depois de publicar `enviar-notificacoes` com os segredos.**
- **T-50**: job `anexos` no `backup-supabase.yml` (domingos; `rclone` com configuração por variáveis de ambiente; confere contagem; tar + GPG; retenção `nexus-anexos 8 12`). **Falta o Germano:** criar as chaves S3 do Storage e os 4 secrets `SUPABASE_S3_*` (BACKUP.md §8) — até lá o job só avisa.
- **T-51**: migration `20261024155703_excluir_setor.sql` + pgTAP 014; tela Setores com Excluir e arrastar (CDK, `cdkDropListEnterPredicate` recusa o próprio setor e os de baixo).
- **T-51b**: migration `20261024161250_lider_edita_subsetores.sql` + pgTAP 015; `privado.pode_editar_setor` (Adm, ou líder do setor de cima); a tela Setores abre para líderes e mostra só o que administram, com ações apenas nos subsetores.
- **T-52**: migration `20261024162347_anexos_drive.sql` + pgTAP 016; Edge Function `enviar-anexo` e `limpar-anexos` atualizada, `_shared/drive.ts` (conta de serviço por WebCrypto, testado no Vitest). **Falta:** pasta "Anexos do Nexus" no Drive partilhado + secrets `GDRIVE_SERVICE_ACCOUNT_JSON` e `GDRIVE_ANEXOS_FOLDER_ID` (DEPLOY.md 8b); até lá os anexos vão para o Storage.
- **nexus-dev em dia (2026-10-24, tarde):** `npx supabase db push` aplicou excluir_setor, lider_edita_subsetores e anexos_drive; `functions deploy enviar-anexo limpar-anexos --use-api` publicou as funções (sem os secrets do Drive, `enviar-anexo` responde `drive_nao_configurado` e o app usa o Storage).
- Node 24.22.1; hooks e `commit.template` ativos localmente.

## Em andamento
- Nada.

## Próximo passo
- **T-38** — Responsividade, acessibilidade e comparação visual com o protótipo.

## Como aplicar migrations no nexus-dev
CI verde no PR → `apply_migration` pelo MCP do Supabase com o conteúdo do arquivo (nome = parte do nome do arquivo sem o timestamp) → `get_advisors` (security e performance). Nunca no projeto de produção sem confirmação.

## Lembretes para as próximas tarefas
- **Todas as tabelas novas:** `grant` explícito a `authenticated` + RLS; funções de acesso em `privado`, chamadas como `(select privado.f())`.
- **Seed no nexus-dev:** carregar o `supabase/seed.sql` foi recusado no pedido de confirmação (2026-10-23) — ⚠️ o Germano decide se carrega (dados fictícios; útil para testar as telas).
- **Migrations no nexus-dev:** o `apply_migration` do MCP é recusado automaticamente nesta extensão (a janela de confirmação não aparece). Use `npx supabase db push` no terminal do Germano (BACKUP/DEPLOY).
- **Edge Functions no nexus-dev:** `limpar-anexos` e `enviar-notificacoes` publicadas (esta sem segredos: responde 401 a qualquer chamada até configurar `NOTIFICACOES_SEGREDO`; sem agendamento).
- **Para testar o login no nexus-dev** (o Germano, no painel): DEPLOY.md §Projeto nexus-dev passos 1–5 (URLs, desligar confirmação de e-mail, ligar o hook, seed, migrations).
- **T-40:** trocar os secrets do GitHub para o nexus-prod. Plano free permite 2 projetos ativos e a org já tem `projetoempresaficticia` + `nexus-dev` → pausar um ou mudar de plano para criar a produção.

## Revisão de 2026-10-22
Incluídos: tarefas sem projeto (US-34), vários responsáveis (US-35), título editável (US-09), membro vê só o que o envolve (US-36), tempo real + abertura instantânea (US-37, T-43, T-44).

## Bloqueios / pendências de decisão
- PC com 6 GB de RAM: resolvido usando o projeto nexus-dev na nuvem (DECISOES 2026-10-23).
- Repositório é público: **nunca** commitar segredos nem dados reais (NAO_FAZER #1 e #6).
- Um pedido de transferência do repo para `Germano-Silva` foi enviado e abandonado; expira sozinho (não aceitar o e-mail).
- Provedor de e-mail: decidido — SMTP do Google Workspace (T-49). Falta criar a conta que envia e a senha de app (DEPLOY.md).
- ⚠️ Domínio próprio — necessário até T-40.
- ⚠️ Líder pode gerir **vínculos** do seu setor? (hoje só Adm). Membro criador pode excluir item com filhos? (SEGURANCA.md §3) — até T-20/T-33. Sub-setores: decidido (Líder cria abaixo do seu).
- ⚠️ Aprovação aprovada leva a Concluída ou Em andamento? Concluir com subtarefas abertas? (FLUXOS.md) — necessário até T-09.
- ⚠️ Recorrência "Diária": dias corridos (implementado) ou dias úteis (protótipo)? (FLUXOS.md §4)
- ⚠️ Data-alvo da virada e se outras equipas entram no MVP (PRD.md).
