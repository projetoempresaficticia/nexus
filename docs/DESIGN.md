# Design

**Fonte da verdade visual:** `referencias/prototipo-aprovado.html` (protótipo aprovado; o v26 foi portado dele). Abra no navegador e compare lado a lado antes de dar uma tela por terminada.

Layout: **barra lateral escura** do sistema + **área de trabalho clara**. Itens abrem numa página de duas colunas (conteúdo à esquerda, painel lateral à direita).

## Tokens de cor
Definir em `src/styles/tokens.css` como variáveis CSS. Tema escuro ativa por `prefers-color-scheme` e pode ser forçado com `:root[data-theme="dark"|"light"]` (guardado em `localStorage`).

| token | claro | escuro | uso |
|---|---|---|---|
| `--bg` | #F6F6FA | #282A36 | fundo da página |
| `--surface` | #FFFFFF | #2F3140 | cartões, painéis |
| `--surface-2` | #EEEEF5 | #383A4A | hover, barras |
| `--fg` | #1F1F2B | #F8F8F2 | texto |
| `--muted` | #5C6082 | #A4ACCF | texto secundário |
| `--line` | #DCDCE6 | #44475A | bordas |
| `--accent` | #7C4DDB | #BD93F9 | ação principal, links |
| `--accent-hover` | #6A3DC8 | #CDA9FB | |
| `--accent-fg` | #FFFFFF | #21222C | texto sobre accent |
| `--accent-soft` | #EEE7FC | #3B3554 | fundos suaves, avatar |
| `--nav` | #282A36 | #21222C | barra lateral |
| `--nav-fg` / `--nav-muted` | #E6E6F0 / #8C93BA | igual | |
| `--nav-active` | #3A3C4E | #343746 | item ativo |
| `--todo-bg/fg` | #ECECF2 / #3E4157 | #3A3D4E / #D6D8E6 | A fazer |
| `--prog-bg/fg` | #DFF4F8 / #0B6577 | #1F3B45 / #8BE9FD | Em andamento |
| `--bloq-bg/fg` | #FDEEDC / #8A4B00 | #45351F / #FFB86C | Bloqueada, Ação |
| `--aprov-bg/fg` | #FBE6F3 / #A3236F | #4A2A42 / #FF79C6 | Aguardando aprovação |
| `--done-bg/fg` | #E2F6E7 / #1D6B35 | #1F4030 / #50FA7B | Concluída, Aprovada |
| `--info-bg/fg` | #E3EEFB / #1F4F8F | #233A47 / #8BE9FD | Informação, Entre setores, Resolvida |
| `--danger` / `--danger-bg` | #C62828 / #FCE8E8 | #FF5555 / #4A2629 | atrasado, Alta, Recusada, excluir |
| `--warn-bg/fg/line` | #FBF7D5 / #5E5500 / #ECE3A0 | #3F3E22 / #F1FA8C / #5A5930 | avisos, Pendente |
| `--gold` / `--gold-fg` | #F1FA8C / #21222C | igual | pill "Líder" na barra lateral |
| `--overlay` | rgba(20,20,35,.42) | rgba(15,16,24,.65) | fundo de modal |
| `--shadow` | 0 18px 44px rgba(20,20,35,.18) | 0 18px 44px rgba(0,0,0,.5) | modais, popovers |

Prioridade (bolinha): Alta `--danger`, Média `--bloq-fg`, Baixa `--muted`.

## Tipografia
- Títulos: **Bricolage Grotesque** 600/700 (`--f-display`). H1 30px/1.15, H2 19px.
- Texto: **Figtree** 400/500/600/700 (`--f-body`), base 15px / 1.45.
- Números em KPIs e prazos: `font-variant-numeric: tabular-nums`. KPI 34px display.
- Rótulos de seção/nível: 11–12px, 700, maiúsculas, `letter-spacing .06em`.

## Espaçamento e forma
- Escala: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 26 · 32 px.
- Raios: pílula 999px · botão 10px (sm 8px) · cartão/painel 14–16px · campo 8px.
- Alturas: botão 42px (sm 34px) · campo 38–42px · linha de lista ~48px.
- Margem lateral da área principal: 16px no telemóvel, 32px a partir de 900px.

## Componentes (`shared/ui`)
| componente | notas |
|---|---|
| `botao` | variantes: padrão, `primary`, `ghost`, `danger`, `good`, `sm`; estado `disabled`; `:active` scale .98 |
| `pill-status` | cor por status/tipo/estado da solicitação (classes `s-afazer`, `s-andamento`, `s-bloq`, `s-aprov`, `s-done`, `s-info`, `s-pend`, `s-recus`) |
| `nivel` | etiqueta "PROJETO/TAREFA/SUBTAREFA" |
| `avatar` | círculo 32px com iniciais, `--accent-soft` |
| `avatares` | vários responsáveis: até 3 sobrepostos (−8px) + "+N"; tooltip com os nomes; vazio = "Sem responsável" em `--muted` |
| `titulo-editavel` | título do item (H1) que vira campo ao clicar ou ao tocar no ícone de lápis; Enter/sair do campo salva, Esc cancela; só para quem pode editar; contorno `--accent` em edição |
| `seletor-pessoas` | multisseleção com busca e chips (avatar + nome + ×), lista só pessoas com vínculo no setor |
| `ao-vivo` | indicador no rodapé da barra lateral: bolinha `--done-fg` "Ao vivo" / `--muted` "Reconectando…" |
| `kpi-card` | rótulo com bolinha, valor grande, subtítulo; clicável (leva à aba filtrada) |
| `painel` / `secao` | superfície com borda, cabeçalho e abas em pílula |
| `linha-item` | nome + caminho + responsável + status + prazo (vermelho e negrito se atrasado) |
| `modal` | overlay, foco preso, fecha com Esc |
| `confirmacao` | modal de exclusão com contagem de filhos |
| `editor-rico` | TipTap: negrito, itálico, sublinhado, riscado, listas, citação, link (popup escondido até clicar), imagem (colar → upload), @menção, limpar formatação |
| `bloqueio` | caixa laranja "Motivo do bloqueio" na página do item |
| `kanban` | colunas com bolinha de cor e contador; cartões arrastáveis (CDK) |
| `barra` | progresso 8px |
| `toast` | sucesso/erro no canto inferior |
| `vazio` | mensagem cinza de estado vazio |

## Navegação (barra lateral)
- **Líder/Adm:** Painel · Produtividade · Projetos · Tarefas · Solicitações · Equipe · Usuários (só adm do sistema) · Setores (só adm do sistema).
- **Membro:** Minhas tarefas · Projetos · Solicitações · Equipe.
- Contador vermelho em Solicitações = pendentes para mim.
- Bloco "Meus setores" com pill do papel (Líder em dourado, Membro neutro).
- Rodapé: botão de tema, avatar, nome, "Líder de N setor(es)" / "Membro", sair.
- Topo da área: título + subtítulo + seletor de **Setor** + ações (ex.: "+ Nova tarefa").

## Visões de Tarefas
Tarefas sem projeto aparecem num grupo/coluna **"Sem projeto"** (Lista, Árvore, Kanban por projeto, Projetos). Itens de contexto (o membro só vê porque estão no caminho até um item seu) aparecem como cabeçalho de grupo, em `--muted`, sem ações.
Líder: alternador em pílula **"Só os meus" / "Toda a equipe"** ao lado do seletor de Setor.
Item alterado por um colega via tempo real: realce `--accent-soft` por 1,5 s (sem animação se `prefers-reduced-motion`).
Abas em pílula: Lista · Kanban · Árvore · Agenda · Mês · Semana · Linha do tempo · (líder) Por pessoa · Carga de trabalho · Dependências.

## Responsividade
- < 900px: barra lateral vira menu superior recolhível; página do item empilha as colunas; tabelas com scroll horizontal (`min-width` 860px dentro de `.tbl-wrap`).
- Nenhuma página com scroll horizontal no corpo.

## Acessibilidade
- Contraste AA nos dois temas (tokens acima já validados no protótipo).
- `:focus-visible` com outline 2px `--accent`.
- Todos os botões de ícone com `aria-label`; abas com `role="tablist"`/`aria-selected`.
- Respeitar `prefers-reduced-motion` (sem animações).
- Kanban: além de arrastar, menu "Mover para…" acessível por teclado.
- Animação de entrada `.fade` 0.24s.
