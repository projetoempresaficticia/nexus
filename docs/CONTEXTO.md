# Contexto do negócio

A Prepara Portugal / Estude em Portugal oferece cursos e formações. A operação é dividida em **setores** (ex.: Secretaria, Pedagógico, Financeiro) que têm **sub-setores** (ex.: Pedagógico → Sucesso do Aluno, Formadores, Plataforma). Cada pessoa pode estar em vários setores, com papéis diferentes em cada um.

O trabalho acontece em **projetos** (ex.: "Turmas de novembro"), divididos em **tarefas** e **subtarefas**. Muitas tarefas dependem de pessoas de outros setores — por isso existem **solicitações**, que deixam claro quem está à espera de quem e por quê, e mudam o status da tarefa automaticamente.

Os líderes precisam de ver o que está parado, atrasado e quem está sobrecarregado; a chefia precisa de métricas de produtividade.

Hoje o sistema é o **Nexus v26** (Apps Script + Google Sheets). Os administradores do sistema são o Germano e a Camila Correia.

## Glossário
| Termo | Significado |
|---|---|
| **Setor** | Equipa ou área. Pode ter um setor pai (hierarquia ilimitada). |
| **Sub-setor** | Setor cujo pai é outro setor. |
| **Vínculo** | Ligação pessoa ↔ setor com um papel (Líder ou Membro). |
| **Líder** | Papel que administra o setor **e todos os sub-setores abaixo** (aparece como "Adm (herdado)" nos sub-setores). |
| **Membro** | Papel que vê e trabalha nos itens do setor. |
| **Adm do sistema** | Pessoa com acesso total (`is_admin`). Cadastra usuários e setores. |
| **Item** | Nome técnico comum a Projeto, Tarefa e Subtarefa (mesma tabela, campo `nivel` 0/1/2). |
| **Projeto** | Item de nível 0, pertence a um setor. |
| **Tarefa** | Item de nível 1, filho de um projeto **ou avulsa** (sem projeto). |
| **Tarefa avulsa** | Tarefa sem projeto; pertence só a um setor. Aparece agrupada como "Sem projeto". |
| **Subtarefa** | Item de nível 2, filho de uma tarefa. |
| **Responsáveis** | Pessoas que executam o item — pode haver várias. |
| **Envolvido** | Quem é responsável, criou, deve aprovar, tem solicitação no item ou foi mencionado nele. Membros só veem itens em que estão envolvidos (e o caminho até eles). |
| **Tempo real** | As telas atualizam sozinhas quando alguém muda algo. |
| **Status** | A fazer · Em andamento · Bloqueada · Aguardando aprovação · Concluída. |
| **Motivo de bloqueio** | Texto obrigatório quando o item fica Bloqueado. |
| **Aprovador** | Pessoa obrigatória quando o item fica Aguardando aprovação. |
| **Solicitação** | Pedido formal a outra pessoa: **Informação**, **Ação** ou **Aprovação**. Estados: Pendente, Resolvida, Aprovada, Recusada. |
| **Entre setores** | Solicitação para alguém de outro setor que não o do item. |
| **Linha de decisão** | Cadeia de líderes do setor até à raiz; aprovações sobem por ela. |
| **Comentário** | Conversa informal no item; **não** muda status. |
| **Menção** | `@Nome` num comentário; gera e-mail para a pessoa. |
| **Checklist** | Lista de passos simples dentro de um item. |
| **Dependência** | Item que só pode avançar depois de outro. |
| **Recorrência** | Diária, Semanal, Quinzenal, Mensal, Anual. Ao concluir, nasce a próxima ocorrência. |
| **Atrasado** | Prazo anterior a hoje e status diferente de Concluída. |
| **Dias parado** | Dias desde que o item entrou em Bloqueada/Aguardando aprovação. |
| **Pontualidade** | % de itens concluídos até o prazo, no período. |
| **Ciclo** | Média de dias entre início e conclusão. |
| **Carga de trabalho** | Itens abertos por pessoa, por semana. |
| **v26** | Versão atual do Nexus em Apps Script (implantação 26). |
| **Virada** | Momento em que a equipa passa do v26 para o v2. |
