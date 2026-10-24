# Glossário da interface (PT-BR)

Tom: **próximo e direto**, frases curtas, "você". Sem jargão técnico. Os textos ficam em `src/app/core/models/textos.ts` (um só lugar).

## Rótulos de domínio
| valor no banco | texto |
|---|---|
| a_fazer · em_andamento · bloqueada · aguardando_aprovacao · concluida | A fazer · Em andamento · Bloqueada · Aguardando aprovação · Concluída |
| alta · media · baixa | Alta · Média · Baixa |
| lider · membro | Líder · Membro (herdado: "Adm (herdado)") |
| informacao · acao · aprovacao | Informação · Ação · Aprovação |
| pendente · resolvida · aprovada · recusada | Pendente · Resolvida · Aprovada · Recusada |
| diaria · semanal · quinzenal · mensal · anual | Diária · Semanal · Quinzenal · Mensal · Anual (vazio: "Não repete") |
| nível 0 · 1 · 2 | Projeto · Tarefa · Subtarefa |

## Menu e títulos
Painel · Produtividade · Projetos · Tarefas / Minhas tarefas · Solicitações · Equipe · Usuários · Setores · Meus setores · Sair · Tema claro / Tema escuro.
Grupos: Sem projeto · Sem responsável. Filtro do líder: Só os meus · Toda a equipe. Tempo real: Ao vivo · Reconectando…
Visões: Lista · Kanban · Árvore · Agenda · Mês · Semana · Linha do tempo · Por pessoa · Carga de trabalho · Dependências.
Abas de solicitações: Para mim · Enviadas por mim · Dos meus setores.
KPIs: Abertas ("tarefas e subtarefas") · Atrasadas ("prazo vencido") · Bloqueadas ("com motivo registrado") · Aguardando aprovação ("à espera de alguém") · Concluídas ("neste mês").
Produtividade: Pontualidade · Ciclo médio · Tempo parado · Concluídas · "vs. período anterior". Períodos: Últimas 4 semanas · Últimas 12 semanas · Este mês · Mês passado. Pessoa: "Toda a equipe (N)".
Equipe: "Minha linha de decisão" — "A quem você responde em cada setor. Aprovações sobem por esta linha." · "Sem líder definido".

## Botões
+ Nova tarefa · + Novo projeto · Mover para projeto · Tirar do projeto · Editar título · + Nova subtarefa · Criar · Salvar · Cancelar · Excluir · Reabrir · Comentar · Editar · Apagar · Anexar arquivo · Colar link · Nova solicitação · Enviar · Resolver · Aprovar · Recusar · Cancelar solicitação · Ver · Adicionar passo · Adicionar dependência · Cadastrar pessoa · Desativar · Reativar · Reatribuir itens · Novo setor · Entrar com Google.

## Campos (modal de item)
Setor ("só os que você pode usar") · Projeto (opcional — "Sem projeto") · "Dentro de: …" · Nome · Descrição (placeholder: "Objetivo, contexto, o que entregar") · Responsáveis ("(eu)" ao lado do próprio nome; placeholder "Adicionar pessoa") · Início · Prazo · Prioridade · Repetir · Motivo do bloqueio (placeholder: "O que está impedindo e de quem você depende") · Aprovador.

## Mensagens
### Sucesso (toast)
- Tarefa criada. · Projeto criado. · Título atualizado. · Responsáveis atualizados. · Tarefa movida para {projeto}. · Alterações salvas. · Status atualizado.
- Solicitação enviada para {nome}. · Solicitação respondida. · Comentário publicado.
- Arquivo anexado. · {n} itens excluídos. · Próxima ocorrência criada para {data}.
- {nome} foi cadastrado(a) e recebeu o e-mail de boas-vindas. · {nome} foi desativado(a).

### Vazio
- Nenhuma tarefa aqui. Que tal criar a primeira?
- Você ainda não tem nada atribuído. Quando alguém te incluir numa tarefa, ela aparece aqui.
- Nenhuma solicitação aqui.
- Nenhum comentário ainda.
- Nada parado. 🎉 (Painel, sem itens parados)
- Selecione uma solicitação para ver a conversa.
- Você é membro deste setor, não administrador. O painel mostra só os setores que você administra. Troque o filtro ou abra "Tarefas".

### Confirmações
- Excluir "{nome}"? Isto também apaga {n} item(ns) abaixo, com comentários e anexos. Não dá para desfazer.
- Concluir "{nome}"? Ainda há {n} subtarefa(s) abertas.
- Desativar {nome}? A pessoa perde o acesso, mas o histórico fica. Ela tem {n} itens abertos — quer reatribuir agora?

### Erros (códigos da API → texto)
| código | texto |
|---|---|
| `sem_permissao` | Você não tem permissão para fazer isto. |
| `nao_encontrado` | Não encontramos este item. Ele pode ter sido excluído. |
| `motivo_obrigatorio` | Conte o motivo do bloqueio para a equipe entender. |
| `aprovador_obrigatorio` | Escolha quem vai aprovar. |
| `nivel_invalido` | Não é possível criar um item neste nível. |
| `ciclo_dependencia` | Essa dependência criaria um ciclo. |
| `ciclo_setor` | Um setor não pode ficar dentro de si mesmo. |
| `ja_respondida` | Esta solicitação já foi respondida. |
| `resposta_invalida` | Essa resposta não vale para este tipo de solicitação. |
| `drive_falhou` | O Google Drive não recebeu o arquivo agora. Tente de novo em instantes. |
| `arquivo_grande` | O arquivo passa de 20 MB. Cole um link do Drive em vez de enviar. |
| `setor_obrigatorio` | Escolha o setor da tarefa. |
| `responsavel_fora_do_setor` | Essa pessoa não faz parte do setor deste item. |
| rede/desconhecido | Não foi possível salvar. Verifique a internet e tente de novo. |

### Login
- Título: "Gerenciador de Tarefas" · Subtítulo: "Entre com a sua conta Google da empresa."
- Acesso não autorizado (página `/sem-acesso`, com a marca do app): título "Acesso não autorizado"; abaixo, "Sua conta ({email}) não está cadastrada ou está inativa. Entre em contato com a gestão para fazer o seu cadastro."

### Ajuda de anexos
"Os arquivos ficam no Google Drive da empresa, na pasta do setor (até 20 MB cada). Para arquivos maiores, cole um link do Drive. Não anexe documentos pessoais sensíveis."

## E-mails automáticos
Remetente: "Nexus — Prepara Portugal". Rodapé: "Você recebeu este e-mail porque participa do Nexus. Abrir o Nexus: {link}".
| tipo | assunto | corpo |
|---|---|---|
| boas_vindas | Bem-vindo(a) ao Nexus | Olá, {nome}! Você foi cadastrado(a) no Nexus, o gerenciador de tarefas da equipe, nos setores {setores}. Entre com a sua conta Google da empresa: {link} |
| atribuicao | Nova tarefa para você: {item} | {autor} incluiu você como responsável em "{item}" (com {outros}). Prazo: {prazo}. {link} |
| mencao | {autor} mencionou você em "{item}" | "{trecho}" — {link} |
| comentario | Novo comentário em "{item}" | {autor} comentou: "{trecho}" — {link} |
| solicitacao_recebida | {autor} precisa de você: {tipo} em "{item}" | "{trecho}" — Responder: {link} |
| solicitacao_respondida | Sua solicitação foi {resultado}: "{item}" | {autor} respondeu: "{trecho}" — {link} |
| lembrete_prazo | Vence amanhã: {item} | "{item}" vence em {prazo}. Status atual: {status}. {link} |
