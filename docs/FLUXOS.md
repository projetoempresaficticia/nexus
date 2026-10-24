# Fluxos e máquinas de estado

## 1. Status do item
```mermaid
stateDiagram-v2
  [*] --> a_fazer
  a_fazer --> em_andamento
  a_fazer --> bloqueada: motivo obrigatório
  em_andamento --> bloqueada: motivo obrigatório
  em_andamento --> aguardando_aprovacao: aprovador obrigatório
  bloqueada --> em_andamento: motivo resolvido / solicitações fechadas
  aguardando_aprovacao --> em_andamento: recusada ou retirada
  aguardando_aprovacao --> concluida: aprovada
  em_andamento --> concluida
  a_fazer --> concluida
  concluida --> a_fazer: reabrir
  concluida --> em_andamento: reabrir
  concluida --> bloqueada: reabrir (motivo)
```
Regras (RPC `mudar_status`):
- Entrar em `bloqueada` exige `motivo_bloqueio_html` não vazio; entrar em `aguardando_aprovacao` exige `aprovador_id`.
- Entrar em `bloqueada`/`aguardando_aprovacao` grava `parado_desde = now()`; sair limpa e soma os dias em `historico` (usado por "tempo parado").
- `concluida` grava `concluido_em`; reabrir limpa `concluido_em` (bug corrigido no v26: reabrir para qualquer status deve funcionar).
- Concluir item com `recorrencia` cria a próxima ocorrência (ver §4).
> ⚠️ A CONFIRMAR: concluir uma tarefa com subtarefas abertas é permitido (v26 permite)? O kit assume **permitido com aviso**.

## 2. Solicitações
```mermaid
stateDiagram-v2
  [*] --> pendente
  pendente --> resolvida: informação/ação respondida
  pendente --> aprovada: tipo aprovação
  pendente --> recusada: tipo aprovação
  pendente --> [*]: cancelada pelo autor (apaga)
```
Efeito no item (dentro dos RPCs, numa transação):
```mermaid
flowchart TD
  A[abrir_solicitacao] --> B{tipo}
  B -- informação / ação --> C[item -> bloqueada<br/>motivo = texto da solicitação<br/>se ainda não estiver bloqueada]
  B -- aprovação --> D[item -> aguardando_aprovacao<br/>aprovador = para_id]
  C --> N[notificação solicitacao_recebida]
  D --> N
  R[responder_solicitacao] --> E{ainda há pendentes no item?}
  E -- sim --> F[item mantém status]
  E -- não --> G{resultado}
  G -- resolvida / aprovada --> H[item -> em_andamento]
  G -- recusada --> I[item -> em_andamento + comentário automático 'Aprovação recusada']
  R --> M[notificação solicitacao_respondida para de_id]
```
> ⚠️ A CONFIRMAR: aprovação aprovada deve levar o item a **Concluída** ou a **Em andamento**? O v26 volta a Em andamento; o kit mantém isso.

## 3. Login
```mermaid
sequenceDiagram
  participant U as Usuário
  participant A as Angular (GitHub Pages)
  participant S as Supabase Auth
  participant G as Google
  U->>A: Entrar com Google
  A->>S: signInWithOAuth(google, hd=estudeemportugal.org)
  S->>G: OAuth
  G-->>S: e-mail
  S->>S: Hook antes de criar usuário: domínio + perfil ativo?
  alt não cadastrado / inativo / outro domínio
    S-->>A: erro
    A-->>U: Tela "Acesso não autorizado"
  else ok
    S-->>A: sessão
    A->>S: select perfil + vínculos (RLS)
    A-->>U: Shell (Painel se líder/adm, senão Minhas tarefas)
  end
```

## 4. Recorrência
```mermaid
flowchart LR
  C[mudar_status -> concluida] --> R{recorrencia?}
  R -- não --> F[fim]
  R -- sim --> P[próxima data = prazo + intervalo<br/>repete até >= hoje]
  P --> N[novo item: copia nome, descrição, responsáveis,<br/>prioridade, checklist desmarcada, recorrência]
  N --> L[item concluído perde a recorrência]
```
Intervalos: diaria +1d · semanal +7d · quinzenal +14d · mensal +1 mês · anual +1 ano. `inicio` desloca pela mesma diferença.
> ⚠️ A CONFIRMAR: o protótipo trata "Diária" como **dias úteis** (pula sábado e domingo) e, no mensal, mantém o dia do mês até o último dia válido. Implementado como está acima (+1 dia corrido); se for dias úteis, ajustar `privado.proxima_data` numa nova migration.

## 5. Exclusão em cascata
```mermaid
flowchart LR
  B[Botão Excluir] --> Q[RPC contar_descendentes]
  Q --> M["Modal: 'Excluir X e N itens abaixo?'"]
  M -- confirmar --> X[RPC excluir_item: valida permissão, apaga, registra historico]
  X --> S[Storage: Edge Function limpa arquivos dos anexos apagados]
```

## 6. Notificações
```mermaid
flowchart LR
  T[RPC / trigger] --> Q[(notificacoes)]
  CR[pg_cron a cada 2 min] --> EF[Edge Function enviar-notificacoes]
  EF --> Q
  EF --> P[Provedor de e-mail]
  EF --> U[(marca enviado_em / erro / tentativas)]
  CD[pg_cron diário 08:00 Lisboa] --> LP[inserir lembrete_prazo para itens que vencem amanhã]
```

## 7. Atualização otimista no frontend
```mermaid
sequenceDiagram
  participant UI
  participant Store as store (signals)
  participant API as service -> Supabase
  UI->>Store: ação (ex.: mudar status)
  Store->>Store: aplica já (guarda cópia anterior)
  Store->>API: rpc
  alt sucesso
    API-->>Store: linha atualizada
    Store->>Store: substitui pela versão do servidor
  else erro
    API-->>Store: erro
    Store->>Store: restaura cópia + toast de erro
  end
```

## 8. Virada v26 → v2
```mermaid
flowchart TD
  A[Exportar abas do Sheets para CSV] --> B[scripts/importar-v26.ts --dry-run]
  B --> C{contagens ok?}
  C -- não --> A
  C -- sim --> D[Congelar v26: só leitura]
  D --> E[Export final + importar de verdade]
  E --> F[Checklist de validação]
  F --> G[Avisar equipa + trocar link]
```
