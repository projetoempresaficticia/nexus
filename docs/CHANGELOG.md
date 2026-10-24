# Changelog

Todas as mudanças relevantes do Nexus v2. Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]
### Adicionado
- 2026-10-24 — Tela Produtividade do líder: período e pessoa, indicadores com comparação ao período anterior, ritmo de entregas, entregas por pessoa, quem segura as solicitações, entregas por setor e semana e tabela da equipe (T-31).
- 2026-10-24 — Painel do líder: 5 indicadores clicáveis (abrem Tarefas na aba certa), tabela de itens parados com motivo, de quem se espera e há quantos dias, e andamento dos projetos (T-30).
- 2026-10-24 — Visões do líder: Por pessoa (uma coluna por pessoa, arrastar troca o responsável) e Carga de trabalho (barras por status e mapa de prazos das próximas 4 semanas). Todas as 10 visões de Tarefas estão prontas (T-29).
- 2026-10-24 — Visão Linha do tempo: 10 semanas com barras do início ao prazo, projeto com o progresso, marco (losango) quando só há prazo, atrasados com contorno vermelho e a linha de hoje (T-28).
- 2026-10-24 — Visões Agenda (abertos por prazo: Atrasados, Hoje, Amanhã…), Mês e Semana (calendário pelo prazo, arrastar para outro dia muda o prazo, próximas ocorrências das recorrentes tracejadas) (T-27).
- 2026-10-24 — Checklist: marcar pessoas com @ no passo (a pessoa recebe aviso e passa a ver o item) e editar o texto com duplo clique ou pelo botão ✎ (T-47).
- 2026-10-24 — Filtro "Pessoa" em Tarefas para líderes: mostra só os itens de uma pessoa dos setores que você administra, em todas as visões (T-46).
- 2026-10-24 — Só quem criou edita e exclui: comentários (o líder deixa de apagar comentário alheio), solicitações (editar o texto enquanto pendente, excluir) e mensagens da conversa, com "(editado)" (T-45).
- 2026-10-24 — Visões Árvore (projeto › tarefa › subtarefa com expandir/recolher, progresso e "Sem projeto") e Dependências (mapa "quem espera por quem" entre setores e cartões das solicitações abertas) (T-26).
- 2026-10-24 — Visão Kanban em Tarefas: colunas por status, prioridade ou projeto, arrastar para mudar status/prioridade (Bloqueada pede motivo) e menu "Mover para…" pelo teclado; filtro "Só as minhas" (T-25).
- 2026-10-24 — Abertura instantânea: ao voltar ao Nexus, menu, tarefas e solicitações aparecem na hora com os dados da última visita e se atualizam sozinhos; tudo é apagado ao sair (T-44).
- 2026-10-24 — Tempo real: listas, item (comentários, checklist, dependências, anexos), solicitações e contador do menu atualizam sozinhos; indicador "Ao vivo / Reconectando…" e realce do item que um colega mudou (T-43).
- 2026-10-24 — Solicitações: pedir informação, ação ou aprovação a um colega a partir do item; tela Solicitações com abas Para mim / Enviadas por mim / Dos meus setores, conversa, aprovar, recusar, marcar como resolvida e cancelar (T-24).
- 2026-10-24 — Anexos no item (arquivo até 20 MB ou link do Drive), imagens coladas em comentários e descrições, e limpeza dos arquivos quando um item é excluído (T-23).
- 2026-10-24 — Comentários no item com @menções (a pessoa mencionada recebe aviso), edição pelo autor e apagar pelo autor ou pelo líder (T-22).
- 2026-10-24 — Tarefas recorrentes: escolher "Repetir" ao criar ou no item; ao concluir, nasce a próxima e aparece o aviso com a data (T-21).
- 2026-10-24 — Excluir projeto, tarefa ou subtarefa com aviso de quantos itens abaixo serão apagados (T-20).
- 2026-10-24 — Checklist e dependências entre tarefas na página do item (T-19).
- 2026-10-24 — Página do item: título editável, descrição, status com motivo/aprovador, detalhes com vários responsáveis, mover tarefa entre projetos, subtarefas e modo só leitura (T-18).
- 2026-10-24 — Tela de Projetos com cartões de progresso, itens parados, cartão "Sem projeto" e criação de projeto (T-17).
- 2026-10-24 — Tela de Tarefas: lista agrupada por projeto (com "Sem projeto"), abas Todas/Minhas/Em andamento/Paradas/Concluídas, "Só os meus" para líderes e criação de tarefa com vários responsáveis (T-16).
- 2026-10-24 — Editor de texto com formatação, links, @menções e imagens, e limpeza de HTML para evitar código malicioso (T-15).
- 2026-10-24 — Peças visuais comuns: etiquetas de status, avatares de vários responsáveis, janelas (modal), avisos (toast) e confirmação (T-14).
- 2026-10-24 — Barra lateral que muda conforme o perfil (líder, membro, adm), contador de solicitações, "Meus setores", seletor de setor e tema claro/escuro (T-13).
- 2026-10-24 — Tela de entrada com Google (só contas da empresa já cadastradas) e tela "Acesso não autorizado" (T-12).
- 2026-10-23 — Carregamento inicial da sessão, números do painel, carga de trabalho e funções de administração (setores, vínculos, reatribuir tarefas) (T-11).
- 2026-10-23 — Regras de abrir, responder e cancelar solicitações (o item bloqueia e desbloqueia sozinho) e de comentar com @menções e avisos (T-10).
- 2026-10-23 — Regras de criar, editar, mudar status (com tarefas recorrentes), definir responsáveis, excluir em cascata e dependências, validadas no banco (T-09).
- 2026-10-23 — Histórico automático das alterações, fila de e-mails, visões prontas para as telas (itens e produtividade) e atualização em tempo real ligada no banco (T-08).
- 2026-10-23 — Base de dados de solicitações (com conversa), comentários com menções e anexos (arquivo até 20 MB ou link), com armazenamento privado de arquivos (T-07).
- 2026-10-23 — Base de dados de projetos, tarefas e subtarefas (incl. tarefas sem projeto), vários responsáveis, checklist e dependências; cada membro vê só o que o envolve (T-06).
- 2026-10-23 — Base de dados: pessoas, setores (com sub-setores) e vínculos, com regras de quem vê e altera o quê; líder pode criar sub-setores abaixo do seu (T-05).
- 2026-10-23 — Verificação automática de cada PR e publicação automática do site em https://projetoempresaficticia.github.io/nexus/ (T-04).
- 2026-10-23 — Supabase local configurado (T-03): login Google e e-mail/senha local, ligação do app ao Supabase.
- 2026-10-22 — Ferramentas de desenvolvimento (T-02): skills oficiais do Angular e do Supabase, modelo de commit, labels e merge só por "Squash and merge" no GitHub.
- 2026-10-22 — Projeto Angular 22 criado (T-01): estrutura de pastas, lint, formatação, testes, cores e fontes do protótipo (tema claro e escuro). Ainda sem telas.
- 2026-10-22 — Revisão: tarefas sem projeto, vários responsáveis, título editável, visibilidade por envolvimento e tempo real.
- 2026-10-22 — Kit de documentação do projeto (PRD, schema, segurança, design, tarefas, padrão de commits) e configuração do Claude Code.
