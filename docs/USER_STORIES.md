# User stories

Perfis: **Adm** (adm do sistema), **Líder** (de um setor, herda sub-setores), **Membro**, **Usuário** (qualquer perfil ativo).

## Acesso e usuários
- **US-01** — Como Usuário, quero entrar com a minha conta Google da empresa, para não ter mais uma senha.
- **US-02** — Como Adm, quero que quem não está cadastrado ou está inativo veja "Acesso não autorizado", para proteger os dados.
- **US-03** — Como Adm, quero cadastrar uma pessoa (e-mail, nome, setores e papéis) e que ela receba um e-mail de boas-vindas com o link, para dar acesso rapidamente.
- **US-04** — Como Adm, quero desativar uma pessoa sem perder o histórico e ser lembrado de reatribuir os itens abertos dela, para não deixar trabalho órfão.

## Setores e equipe
- **US-05** — Como Adm, quero criar, renomear, mover e desativar setores e sub-setores, para refletir a organização.
- **US-06** — Como Usuário, quero ver o organograma dos meus setores (líder, pessoas, projetos, itens abertos) e a minha linha de decisão, para saber a quem recorrer.

## Itens
- **US-07** — Como Usuário com vínculo no setor, quero criar um projeto nesse setor, para organizar um trabalho novo.
- **US-08** — Como Usuário, quero criar uma tarefa num projeto ou uma subtarefa numa tarefa, com nome, descrição rica, responsáveis, início, prazo, prioridade e repetição, para registar o trabalho completo.
- **US-09** — Como responsável ou criador, quero abrir a página de um item com o caminho (projeto › tarefa › subtarefa), **editar o título** e os demais campos e ver os filhos, para trabalhar num só lugar.
- **US-10** — Como responsável ou Líder, quero mudar o status de um item, sendo obrigado a dizer o motivo ao bloquear e o aprovador ao pedir aprovação, para que todos entendam a situação.
- **US-11** — Como responsável, quero uma checklist dentro do item, para acompanhar passos pequenos.
- **US-12** — Como Usuário, quero indicar que um item depende de outro, para ver o que trava o quê.
- **US-13** — Como Líder ou criador, quero excluir um projeto/tarefa/subtarefa com aviso de quantos filhos serão apagados, para limpar erros sem deixar lixo.
- **US-14** — Como responsável, quero que uma tarefa recorrente gere a próxima ocorrência ao ser concluída, para não recriar tarefas rotineiras.

## Solicitações
- **US-15** — Como Usuário, quero abrir uma solicitação de Informação, Ação ou Aprovação para um colega num item, e que o item mude de status automaticamente, para formalizar a dependência.
- **US-16** — Como destinatário, quero conversar na solicitação e resolvê-la, aprová-la ou recusá-la; quando todas as pendentes de um item fecham, o item volta a Em andamento.
- **US-17** — Como Usuário, quero uma caixa de solicitações com as abas Para mim, Enviadas por mim e (Líder) Dos meus setores, e um contador no menu, para não perder pedidos.

## Comentários e anexos
- **US-18** — Como Usuário, quero comentar num item com texto formatado e @menções, para conversar no contexto.
- **US-19** — Como autor, quero editar ou apagar o meu comentário; como Líder/Adm, quero apagar qualquer comentário do setor.
- **US-20** — Como Usuário, quero anexar arquivos (até 20 MB) ou colar um link a itens e comentários, e colar imagens direto no comentário, para juntar evidências.

## Visões
- **US-21** — Como Usuário, quero ver os itens em Lista, filtrando por setor, para ter uma visão rápida.
- **US-22** — Como Usuário, quero um Kanban agrupado por status, prioridade ou projeto, arrastando cartões para mudar status/prioridade.
- **US-23** — Como Usuário, quero a visão Árvore (projeto › tarefa › subtarefa).
- **US-24** — Como Usuário, quero as visões Agenda, Mês e Semana por prazo.
- **US-25** — Como Usuário, quero a Linha do tempo (Gantt) por início e prazo.
- **US-26** — Como Líder, quero as visões Por pessoa e Carga de trabalho dos setores que administro.
- **US-27** — Como Usuário, quero a visão Dependências.

## Painéis
- **US-28** — Como Líder, quero um Painel com Abertas, Atrasadas, Bloqueadas, Aguardando aprovação, Concluídas no mês e a tabela de itens parados (motivo, de quem se espera, há quantos dias).
- **US-29** — Como Líder, quero a tela Produtividade com pontualidade, ciclo médio, tempo parado e comparação com o período anterior, filtrando período e pessoa.

## Notificações e geral
- **US-30** — Como Usuário, quero receber e-mail quando: me atribuem um item, me mencionam, comentam num item meu, recebo uma solicitação ou uma solicitação minha é respondida.
- **US-31** — Como Usuário, quero alternar entre tema claro e escuro.
- **US-32** — Como Usuário, quero ver o histórico de alterações de um item (quem, quando, campo, de → para).
- **US-33** — Como Adm, quero importar os dados do Nexus v26 sem duplicar registos, para fazer a virada.

## Revisão de 2026-10-22
- **US-34** — Como Usuário, quero criar uma **tarefa sem projeto** (avulsa), escolhendo só o setor, porque nem toda tarefa pertence a um projeto; e depois poder movê-la para um projeto, se fizer sentido.
- **US-35** — Como Usuário, quero que projetos, tarefas e subtarefas possam ter **vários responsáveis**, para refletir trabalho partilhado.
- **US-36** — Como Membro, quero ver **só os projetos, tarefas e subtarefas que me envolvem** (sou responsável, criei, devo aprovar, tenho solicitação ou fui mencionado), para não me perder no trabalho do setor inteiro. Como Líder, quero continuar a ver tudo dos setores que administro, com um filtro "Só os meus".
- **US-37** — Como Usuário, quero que as telas se **atualizem sozinhas e na hora** quando eu ou um colega muda algo, sem recarregar a página.
