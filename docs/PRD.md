# PRD — Nexus v2

## 1. Problema
O Nexus v26 roda em Google Apps Script + Google Sheets. Funciona, mas:
- a planilha como base de dados tem limites de desempenho (cache, tamanho de células, bloqueios de escrita) que já causaram atrasos de 4–5 s por ação;
- as permissões dependem só do código do Apps Script, sem barreira no armazenamento;
- o código vive no editor do Apps Script, sem testes automáticos, sem revisão por PR e com deploy manual por "Nova versão";
- escalar para mais equipas aumenta o risco de lentidão e de erros de dados (datas convertidas em `Date`, por exemplo).

## 2. Objetivo
Reescrever o Nexus como web app Angular + Supabase, hospedado no GitHub Pages, com **paridade funcional com a v26**, mais rápido, com permissões garantidas no banco e com um processo de desenvolvimento organizado (branches por tarefa, PRs pequenos, testes, deploy automático).

## 3. Público
Colaboradores da Prepara Portugal / Estude em Portugal com conta Google `@estudeemportugal.org`, organizados em setores e sub-setores. Ver PERSONAS.md.

## 4. Funcionalidades do MVP (paridade v26)
| # | Funcionalidade | Prioridade | User stories |
|---|---|---|---|
| F1 | Login com Google da empresa; acesso só para cadastrados ativos | Must | US-01, US-02 |
| F2 | Gestão de usuários (cadastrar, papéis por setor, desativar) | Must | US-03, US-04 |
| F3 | Setores e sub-setores; organograma e linha de decisão | Must | US-05, US-06 |
| F4 | Projetos, tarefas (com ou sem projeto) e subtarefas com título editável, descrição rica, **vários responsáveis**, início, prazo, prioridade | Must | US-07, US-08, US-09, US-34, US-35 |
| F4b | Visibilidade por envolvimento: membro vê só o que o envolve; líder vê o setor | Must | US-36 |
| F5 | Status com regras (bloqueio com motivo, aprovação com aprovador) | Must | US-10 |
| F6 | Checklist e dependências entre itens | Must | US-11, US-12 |
| F7 | Exclusão em cascata com confirmação | Must | US-13 |
| F8 | Tarefas recorrentes | Must | US-14 |
| F9 | Solicitações (Informação / Ação / Aprovação) com conversa e efeito no status | Must | US-15, US-16, US-17 |
| F10 | Comentários com texto rico, @menções, edição/remoção | Must | US-18, US-19 |
| F11 | Anexos (Storage, até 20 MB) e links; colar imagem | Must | US-20 |
| F12 | Visões: Lista, Kanban, Árvore, Agenda, Mês, Semana, Linha do tempo, Dependências | Must | US-21 a US-25, US-27 |
| F13 | Visões de líder: Por pessoa, Carga de trabalho | Must | US-26 |
| F14 | Painel (KPIs e itens parados) e Produtividade | Must | US-28, US-29 |
| F15 | Notificações por e-mail | Must | US-30 |
| F16 | Tema claro/escuro | Should | US-31 |
| F17 | Histórico de alterações por item | Should | US-32 |
| F18 | Importação dos dados do Nexus v26 (Sheets) | Must (na virada) | US-33 |
| F19 | Interface instantânea: cache local + atualização otimista + rollback | Must | transversal |
| F20 | **Tempo real**: telas atualizam sozinhas com mudanças de colegas | Must | US-37 |

> Mudanças face ao v26 (pedidas em 2026-10-22): tarefas sem projeto, vários responsáveis, título editável, visibilidade só do que envolve o membro, tempo real.

## 5. Versão 2 (depois do MVP)
- ~~Notificações dentro do app (sino) além do e-mail.~~ Adiantado — feito na T-59 (2026-10-25, pedido do Germano).
- Exportar relatórios para Excel/PDF.
- Fila offline (ações guardadas sem internet e enviadas depois).
- Integração com o Nexus no Notion (visão da chefe).
- Domínio próprio (ex.: `tarefas.preparaportugal.pt`).

## 6. Fora do âmbito
- App móvel nativo (o web app deve funcionar no telemóvel, mas o foco é PC).
- Login com contas fora de `@estudeemportugal.org`.
- Servidor Node próprio.
- Chat em tempo real, controlo de horas/timesheet, faturação.

## 7. Transição
O Nexus v26 (Apps Script) continua em uso até o v2 passar no checklist de virada (DEPLOY.md). Na virada: congelar o v26 (só leitura), importar dados (US-33), validar contagens, avisar a equipa e redirecionar o link.

## 8. Métricas de sucesso
- Ações comuns (mudar status, comentar, criar tarefa) refletem na tela em **< 300 ms** (otimista) e confirmam no servidor em **< 1 s**.
- Primeira carga do app em **< 3 s** numa ligação normal; aberturas seguintes mostram a tela em **< 500 ms** (cache local).
- Mudança feita por um colega aparece na tela de outro em **< 2 s**, sem recarregar.
- Um membro não consegue ver nenhum item que não o envolva (testes pgTAP).
- **0** acessos indevidos nos testes de RLS (pgTAP) — todos os testes passam no CI.
- 100% dos dados ativos do v26 importados, com contagens batendo.
- A equipa do Germano usa só o v2 durante 2 semanas sem voltar ao v26.

> ⚠️ A CONFIRMAR: data-alvo da virada e se outras equipas entram já no MVP ou depois.
