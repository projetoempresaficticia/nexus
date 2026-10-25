# API — RPCs, consultas e Edge Functions

O frontend fala com o Supabase via `supabase-js`. Leituras simples usam `select` nas tabelas/views (protegidas por RLS). Tudo que muda mais de uma linha ou tem regra de negócio é **RPC** (função SQL `security definer`, valida permissão no início, roda numa transação).

Erros: as funções usam `raise exception using errcode = 'P0001', message = '<codigo>'`. O frontend traduz `<codigo>` com GLOSSARIO_UI.md §Erros.
| código | quando |
|---|---|
| `sem_permissao` | permissão negada |
| `nao_encontrado` | registo não existe ou não é visível |
| `motivo_obrigatorio` | bloquear sem motivo |
| `aprovador_obrigatorio` | aguardar aprovação sem aprovador |
| `nivel_invalido` | criar filho de subtarefa, projeto com pai etc. |
| `ciclo_dependencia` | dependência circular |
| `ciclo_setor` | setor pai dentro dos próprios descendentes |
| `ja_respondida` | responder solicitação que não está pendente |
| `resposta_invalida` | aprovar/recusar algo que não é aprovação, ou "resolver" uma aprovação |
| `arquivo_grande` | anexo > 20 MB |
| `setor_obrigatorio` | tarefa avulsa sem setor |
| `responsavel_fora_do_setor` | responsável sem vínculo no setor do item |

## Leituras (select)
| recurso | consulta | notas |
|---|---|---|
| itens | `from('vw_itens').select('*').in('setor_id', ids)` | a RLS já devolve só o que a pessoa pode ver; filtros de status/responsável/prazo no servidor; filtro "Só os meus" do líder: `.overlaps('meu_envolvimento', ['responsavel','criador','aprovador','solicitacao','mencao'])` |
| item | `from('vw_itens').select('*, checklist_itens(*), dependencias!item_id(*)').eq('id', id).single()` | |
| comentários | `from('comentarios').select('*, anexos(*)').eq('item_id', id).order('criado_em')` | |
| anexos do item | `from('anexos').select('*').eq('item_id', id).is('comentario_id', null)` | |
| solicitações | `from('solicitacoes').select('*, solicitacao_mensagens(*), itens(id,nome,setor_id)')` | abas filtram por `para_id`/`de_id`/setor |
| histórico | `from('historico').select('*').eq('tabela','itens').eq('registro_id', id).order('criado_em', {ascending:false})` | |
| produtividade | `from('vw_produtividade').select('*').in('setor_id', ids).gte('concluido_em', de).lte('concluido_em', ate)` | KPIs calculados no frontend |
| notificações (sino, T-59) | `from('notificacoes').select('*, autor:perfis!notificacoes_autor_id_fkey(nome)').order('criado_em',{ascending:false}).limit(50)` | a RLS já devolve só as da pessoa; marcar como lida: `update({lido_em: now})` (coluna liberada por `grant update (lido_em)`, carimbada de novo pelo banco) |

## RPCs
| função | entrada | saída | permissão | US |
|---|---|---|---|---|
| `carregar_inicial()` | — | `{perfil, vinculos[], setores[], pessoas[], setores_administrados[]}` | perfil ativo | US-01 |
| `criar_item(p jsonb)` | `{setor_id?, pai_id?, nivel, nome, descricao_html, responsaveis uuid[], inicio, prazo, prioridade, recorrencia}` — tarefa avulsa: `nivel 1`, `pai_id` nulo, `setor_id` obrigatório | linha de `vw_itens` | sem pai: vínculo no setor ou administra; com pai: pode_ver_item(pai) | US-07, US-08, US-34 |
| `atualizar_item(id, campos jsonb)` | campos permitidos: **nome**, descricao_html, inicio, prazo, prioridade, recorrencia, ordem, pai_id (mover tarefa avulsa para um projeto ou tirar do projeto) | linha | pode_editar_item | US-09 |
| `definir_responsaveis(item_id, perfis uuid[])` | lista completa desejada (substitui) | `uuid[]` final | pode_editar_item; cada perfil precisa de vínculo no setor do item | US-35 |
| `mudar_status(id, status, motivo_html?, aprovador_id?)` | | `{item, novo_item_recorrente?}` | pode_editar_item | US-10, US-14 |
| `contar_descendentes(id)` | | `int` | pode_ver_item | US-13 |
| `excluir_item(id)` | | `{apagados int, caminhos_storage text[]}` | administra setor, ou criador sem filhos | US-13 |
| `definir_dependencia(item_id, depende_de_id, ligar bool)` | | ok | pode_editar_item | US-12 |
| `abrir_solicitacao(item_id, para_id, tipo, texto_html)` | | `{solicitacao, item}` | pode_ver_item | US-15 |
| `responder_solicitacao(id, resultado, mensagem_html?)` | resultado: resolvida/aprovada/recusada | `{solicitacao, item}` | para_id = eu ou administra setor do item | US-16 |
| `editar_solicitacao(id, texto_html)` | | `{solicitacao, item}` | de_id = eu e pendente | US-38 |
| `cancelar_solicitacao(id)` | exclui | `{item}` | de_id = eu (qualquer status) | US-16, US-38 |
| `salvar_comentario(id?, item_id, texto_html)` | id nulo = novo | comentário | criar: pode_ver_item; editar: autor | US-18, US-19 |
| `resumo_painel(setores uuid[])` | | `{abertas, atrasadas, bloqueadas, aguardando, concluidas_mes, parados[]}` | administra todos os setores pedidos | US-28 |
| `carga_trabalho(setores uuid[], de date, ate date)` | | `[{perfil_id, semana, qtd}]` | administra | US-26 |

Admin (`eh_admin()`): `salvar_setor(p jsonb)`, `salvar_vinculos(perfil_id, vinculos jsonb)`, `reatribuir_itens(de_perfil, para_perfil, ids uuid[])`, `cadastrar_usuario(email, nome, vinculos jsonb)` → perfil (+ `boas_vindas`; erros `email_invalido`, `email_ja_cadastrado`, `nome_obrigatorio`), `desativar_usuario(id)` → itens abertos dela para reatribuir (erro `nao_desativa_a_si`), `reativar_usuario(id)`, `excluir_setor(id)` (só setor vazio; erros `setor_com_subsetores`, `setor_com_itens`, `setor_com_pessoas` — T-51) (T-33; substituem as Edge Functions previstas).
Todos: `pessoas_inativas()` → id, nome, iniciais de quem foi desativado (para mostrar o nome em comentários e histórico, US-04).

## Tempo real (Supabase Realtime)
Um único canal por sessão, aberto pelo `RealtimeService` depois do login:
```ts
supabase.channel('nexus')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'itens' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'item_responsaveis' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacao_mensagens' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comentarios' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_itens' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'dependencias' }, h)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'anexos' }, h)
  .subscribe()
```
O handler entrega o evento à store certa, que faz *merge* por `id` (ignora eventos da própria ação já aplicada de forma otimista, comparando `atualizado_em`). Ao reconectar, a store recarrega o que mudou desde o último `atualizado_em` conhecido.

## Edge Functions
| função | chamada por | o que faz | auth |
|---|---|---|---|
| `url-anexo` | download de anexo | verifica `pode_ver_item`; devolve URL assinada (60 s) | JWT |
| `enviar-anexo` | anexar arquivo (FormData: `item_id`, `comentario_id?`, `arquivo`) | sobe para o Drive partilhado (pasta do setor, criada na 1.ª vez e achada por `appProperties.nexus_setor_id`), dá leitura ao domínio pelo link, grava a linha com o login da pessoa (RLS) e completa `drive_id` com a service role; devolve o anexo. Erros: `arquivo_grande` (413), `sem_permissao` (403), `drive_falhou` (502), `drive_nao_configurado` (503 → o Angular usa o Storage) | JWT + RLS do item |
| `limpar-anexos` | após `excluir_item` e anexo apagado | remove objetos do Storage e manda para a lixeira do Drive os arquivos da fila `anexos_drive_lixeira` (lote de 100) | JWT + verifica que o registo já não existe; a fila vem do banco |
| `enviar-notificacoes` | pg_cron (2 min) | lê `notificacoes` pendentes (lote 50), monta e-mail (GLOSSARIO_UI §E-mails), envia, marca enviado/erro; máx. 3 tentativas. Pula (marca `enviado_em`, erro `preferencia_desligada`) quem desligou `perfis.receber_email_notificacoes` — a notificação já está no sino de qualquer jeito (T-59) | segredo do cron |

## Integrações externas
- **Google OAuth** (Auth do Supabase).
- **E-mail:** SMTP do Google Workspace (`smtp.gmail.com:465`, SSL) com uma conta da empresa e **senha de app**; limite do Gmail ~2000 e-mails/dia por conta. As Edge Functions bloqueiam as portas 25 e 587. Toda a lógica fica em `supabase/functions/_shared/email.ts` (T-49).
- **Importação v26:** `scripts/importar-v26.ts` lê CSVs exportados das abas (Usuarios, Setores, Vinculos, Itens, Solicitacoes, Mensagens, Comentarios, Anexos), faz upsert por `legacy_id` com a service role. Anexos do Drive **não** são copiados: viram `link_externo` apontando ao Drive.
