<!-- Título do PR: [T-XX] tipo(escopo): descrição   — ex.: [T-24] feat(solicitacoes): tela de solicitações -->

## Tipo de mudança
- [ ] Correção de bug (`fix`)
- [ ] Nova funcionalidade (`feat`)
- [ ] Chore (configuração, CI, dependências, docs)
- [ ] Release (só produção)

## Descrição
<!-- O que muda para o usuário e regras de negócio envolvidas. Mudanças estruturais (banco, RLS, auth)? -->

## Prints
<!-- Antes/depois das telas, tema claro e escuro quando fizer sentido. Compare com referencias/prototipo-aprovado.html -->

## Tarefa
<!-- T-XX de docs/TAREFAS.md e user stories cobertas (US-xx) -->
- Tarefa: T-
- User stories: US-

## Como testar
1.
2.

## Checklist
- [ ] Até ~400 linhas alteradas (sem contar arquivos gerados)
- [ ] Fiz a revisão do meu próprio código antes de abrir o PR (`/revisar`)
- [ ] `npm run lint` e `npm test` passam localmente
- [ ] `npx supabase test db` passa (se mexeu no banco)
- [ ] Testes novos para a funcionalidade/correção
- [ ] Comentários nas partes difíceis de entender
- [ ] Docs atualizados (SCHEMA / API / SEGURANCA / CHANGELOG / ESTADO_ATUAL), se aplicável
- [ ] Nenhuma chave secreta, `.env` ou dado real no PR

## Dependências
<!-- PRs que precisam entrar antes, ou N/A -->
N/A
