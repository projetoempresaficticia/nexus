# Critérios de aceite

Formato Dado / Quando / Então. Cada critério com 🔒 tem de ter teste pgTAP; com 🧪, teste Vitest; com 🎭, coberto pelo e2e.

## US-01 — Login Google
- Dado um perfil ativo `x@estudeemportugal.org`, quando entra com Google, então vê a rota inicial (Painel se líder/adm, senão Minhas tarefas). 🎭
- Dado o usuário logado, quando recarrega a página, então continua logado.

## US-02 — Acesso negado
- Dado um e-mail de outro domínio, quando tenta entrar, então vê "Acesso não autorizado" e nenhuma conta é criada. 🔒
- Dado um perfil desativado, quando faz qualquer select, então recebe zero linhas. 🔒

## US-03 — Cadastrar pessoa
- Dado um Adm, quando cadastra e-mail, nome e vínculos, então o perfil e os vínculos existem e há 1 notificação `boas_vindas` pendente.
- Dado um não-Adm, quando tenta inserir em `perfis` ou `vinculos`, então é negado. 🔒
- Dado um e-mail já cadastrado, quando cadastra de novo, então vê erro e nada muda.

## US-04 — Desativar
- Dado um Adm, quando desativa alguém com itens abertos, então vê a lista para reatribuir e a pessoa perde o acesso na próxima requisição.
- Dado um perfil desativado, então os seus comentários e o histórico continuam visíveis com o nome.

## US-05 — Setores
- Dado um Adm, quando cria "Plataforma" com pai "Pedagógico", então aparece na árvore. 
- Dado um Adm, quando tenta mover "Pedagógico" para dentro de "Plataforma", então vê `ciclo_setor`. 🔒
- Dado um Membro, quando tenta criar setor, então é negado. 🔒

## US-06 — Equipe
- Dado um usuário, quando abre Equipe, então vê os seus setores e ancestrais com líder, nº de pessoas e projetos, e a linha de decisão até a raiz.

## US-07 — Criar projeto
- Dado um Membro com vínculo em "Sucesso do Aluno", quando cria projeto lá, então o projeto existe. 🔒
- Dado o mesmo Membro, quando tenta criar projeto em "Financeiro" (sem vínculo), então é negado. 🔒
- Dado o Membro que criou o projeto, então ele o vê (é criador), mesmo sem ser responsável. 🔒

## US-08 — Criar tarefa/subtarefa
- Dado um projeto visível, quando cria tarefa, então `nivel = 1` e o setor é o do projeto. 🔒
- Dado uma subtarefa, quando tenta criar filho dela, então `nivel_invalido`. 🔒
- Dado prazo antes do início, quando salva, então o formulário mostra erro antes de enviar. 🧪

## US-09 — Página do item
- Dado uma subtarefa, quando abre, então vê "Projeto › Tarefa › Subtarefa" clicável, campos editáveis (se pode editar) e os filhos.
- Dado um responsável, quando clica no título, edita e confirma (Enter ou sair do campo), então o novo título aparece na página, no caminho, nas listas e para os colegas (tempo real); Esc cancela. Título vazio não é aceite. 🔒🧪
- Dado um Membro que vê o item só como contexto (ancestral) ou por solicitação, então vê os campos e o título só em leitura e o update é negado. 🔒

## US-10 — Status
- Quando escolhe Bloqueada sem motivo, então não salva (`motivo_obrigatorio`). 🔒🧪
- Quando escolhe Aguardando aprovação sem aprovador, então `aprovador_obrigatorio`. 🔒
- Dado um item Concluído, quando reabre para qualquer status, então salva e `concluido_em` fica nulo. 🔒
- Quando muda o status, então a tela muda na hora e, se o servidor recusar, volta ao anterior com toast. 🧪

## US-11 — Checklist
- Quando marca um passo, então fica salvo e a barra de progresso atualiza.

## US-12 — Dependências
- Quando A depende de B e tenta B depender de A, então `ciclo_dependencia`. 🔒

## US-13 — Exclusão em cascata
- Dado um projeto com 3 tarefas e 5 subtarefas, quando exclui, então a confirmação diz "8 item(ns) abaixo" e, ao confirmar, nada sobra (inclusive comentários, anexos e arquivos no Storage). 🔒
- Dado um Membro criador de tarefa com subtarefas, quando tenta excluir, então `sem_permissao`. 🔒

## US-14 — Recorrência
- Dado uma tarefa semanal com prazo 2026-11-02, concluída em 2026-11-03, então nasce uma nova com prazo 2026-11-09, checklist desmarcada, e a concluída perde a recorrência. 🔒
- Dado prazo muito no passado, então a próxima data é a primeira ≥ hoje. 🔒🧪

## US-15 — Abrir solicitação
- Quando abre solicitação de Ação para Diogo num item Em andamento, então o item fica Bloqueado com o texto como motivo e Diogo tem notificação. 🔒
- Quando abre de Aprovação, então o item fica Aguardando aprovação com aprovador = destinatário. 🔒
- Dado Diogo de outro setor, então ele consegue ver o item da solicitação, mas não outros itens desse setor. 🔒

## US-16 — Responder
- Dado 2 pendentes no item, quando resolve 1, então o item continua Bloqueado; quando resolve a 2ª, volta a Em andamento. 🔒
- Quando um terceiro (nem destinatário nem líder) tenta responder, então `sem_permissao`. 🔒
- Quando tenta aprovar uma de tipo Ação, então `resposta_invalida`. 🔒

## US-17 — Caixa
- Dado 2 pendentes para mim, então o menu mostra "2" e Tarefas mostra o aviso "Há 2 solicitações esperando a sua resposta". 🎭

## US-18 — Comentar
- Quando comenta com "@Bruno Costa", então existe a menção e Bruno tem notificação `mencao`; o responsável do item tem `comentario` (se não for o autor). 🔒
- Quando o HTML tem `<script>` ou `onerror`, então é removido antes de salvar e ao exibir. 🧪

## US-19 — Editar/apagar comentário
- Autor edita → `editado_em` preenchido e "(editado)" aparece. Outra pessoa não consegue editar. 🔒
- Só o autor apaga: líder, Adm ou membro que não escreveu → nada é apagado. 🔒

## US-38 — Editar/excluir solicitação e mensagens
- Autor edita o texto da pendente → texto novo, "(editado)" e, se o item estava bloqueado com esse texto, o motivo acompanha. Respondida → `ja_respondida`. 🔒
- Autor exclui (qualquer status) → some; o item volta a Em andamento se não sobrar pendente. Destinatário ou líder → `sem_permissao`. 🔒
- Mensagem da conversa: só quem escreveu edita ("(editado)") ou apaga. 🔒

## US-39 — Filtro por pessoa
- Líder vê no filtro só as pessoas com vínculo nos setores que administra (e abaixo), dentro do setor selecionado; escolher uma pessoa mostra só os itens de que ela é responsável, em todas as visões.
- Membro não vê o filtro.

## US-20 — Anexos
- Quando envia arquivo de 5 MB, então aparece na lista e abre por URL assinada.
- Quando tenta 25 MB, então `arquivo_grande` antes do upload. 🧪
- Quando cola uma imagem no comentário, então ela é enviada ao Storage e aparece no comentário (sem base64 no HTML). 🧪
- Usuário sem acesso ao setor não lê o objeto no Storage. 🔒

## US-21 a US-27 — Visões
- Todas as visões mostram só itens visíveis do setor selecionado (inclui sub-setores para líder).
- Kanban: arrastar para "Bloqueada" abre o pedido de motivo; cancelar devolve o cartão. 🧪
- Kanban por prioridade: arrastar muda a prioridade.
- Mês/Semana/Agenda usam o prazo; itens atrasados em vermelho.
- Linha do tempo: barra de início a prazo; sem início = marco no prazo.
- Por pessoa / Carga: só aparecem para quem administra o setor filtrado.
- Trocar de visão não faz nova chamada ao servidor se os dados já estão carregados. 🧪

## US-28 — Painel
- Os 5 KPIs batem com uma contagem SQL de referência no seed. 🔒
- A tabela de parados ordena por dias parado (desc) e mostra "Entre setores" quando o destinatário é de outro setor.
- Membro sem liderança que abre `/painel` é redirecionado.

## US-29 — Produtividade
- Pontualidade = concluídos até o prazo ÷ concluídos no período; ciclo = média(concluído − início); comparação com o período anterior de mesmo tamanho. 🧪

## US-30 — E-mails
- Ninguém recebe e-mail pela própria ação. 🔒
- Falha do provedor → `tentativas` aumenta; após 3, para e registra `erro`.
- Lembrete diário só para itens não concluídos que vencem amanhã.

## US-31 — Tema
- Escolha persiste entre sessões; sem escolha, segue o sistema.

## US-32 — Histórico
- Mudar status/responsável/prazo gera linha com de → para e autor. 🔒

## US-33 — Importação
- Rodar a importação 2× não duplica nada (upsert por `legacy_id`). 
- Contagens por tabela batem com o CSV; datas importadas como `date` (sem fuso).

## US-34 — Tarefa sem projeto
- Dado um Membro com vínculo em "Sucesso do Aluno", quando cria tarefa escolhendo só o setor, então a tarefa existe com `pai_id` nulo e aparece no grupo "Sem projeto". 🔒
- Dado uma tarefa avulsa, quando cria subtarefa nela, então funciona normalmente. 🔒
- Quando tenta criar tarefa avulsa sem setor, então `setor_obrigatorio`. 🔒
- Dado uma tarefa avulsa, quando o responsável a move para um projeto do mesmo setor, então ela e as subtarefas passam a aparecer no projeto. 🔒
- Kanban por projeto, Árvore e Projetos mostram a coluna/grupo "Sem projeto".

## US-35 — Vários responsáveis
- Quando define Bruno e Gabriela como responsáveis, então os dois aparecem (avatares sobrepostos) e cada um recebe 1 notificação `atribuicao` (exceto quem fez a ação). 🔒
- Quando remove Gabriela, então ela deixa de ser responsável e — se não tiver outro envolvimento — deixa de ver o item. 🔒
- Quando tenta adicionar alguém sem vínculo no setor do item, então `responsavel_fora_do_setor`. 🔒
- Item sem responsáveis é permitido e aparece como "Sem responsável".
- Por pessoa / Carga / Produtividade contam o item para **cada** responsável. 🧪

## US-36 — Só o que me envolve
- Dado Bruno (Membro de "Sucesso do Aluno"), então vê: itens em que é responsável/criador/aprovador/tem solicitação/foi mencionado, os descendentes dos itens de que é responsável ou criador, e os ancestrais (só leitura); **não** vê outros projetos ou tarefas do setor. 🔒
- Dado Diogo (Pedagógico) com uma solicitação num item de "Sucesso do Aluno", então vê esse item e o caminho até ele, e nada mais desse setor. 🔒
- Dado Ana (Líder de "Sucesso do Aluno"), então vê todos os itens do setor e sub-setores; com o filtro "Só os meus", vê só os que a envolvem. 🔒🧪
- Arquivos no Storage seguem a mesma regra (Bruno não baixa anexo de item que não vê). 🔒
- Painel de Membro não existe; contagens de Projetos/Equipe para Membro contam só itens visíveis.

## US-37 — Tempo real e "instantâneo"
- Dado Ana e Bruno com a mesma lista aberta, quando Ana muda o status de uma tarefa de Bruno, então a tela de Bruno atualiza em < 2 s sem recarregar. 🎭
- Quando alguém comenta no item que estou a ver, o comentário aparece sozinho; quando recebo uma solicitação, o contador do menu aumenta sozinho. 🎭
- Quando deixo de poder ver um item (fui retirado de responsável), ele some da minha lista. 
- A própria ação otimista não "pisca" ao chegar o evento do servidor. 🧪
- Sem internet: indicador "Reconectando…"; ao voltar, os dados se atualizam sem recarregar. 🧪
- Segunda abertura do app mostra a última tela em < 500 ms (cache local) e depois atualiza. 🧪
- Logout apaga o cache local. 🧪

## Transversal — desempenho
- Mudar status reflete na tela em < 300 ms; servidor confirma em < 1 s (medir no ambiente de produção).
