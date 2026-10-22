# Ferramentas de pesquisa e apoio

Quando houver dúvida técnica, **pesquise antes de inventar**. Ordem: docs do projeto → skills → fontes oficiais → perguntar ao Germano.

## Skills do projeto (instaladas em T-02, em `.claude/skills/`, versionadas no Git)
| skill | instalar | usar para |
|---|---|---|
| `angular-developer`, `angular-new-app` | `npx skills add https://github.com/angular/skills -a claude-code -s '*' -y --copy` | componentes, signals, rotas, formulários, testes, criação do projeto |
| `supabase`, `supabase-postgres-best-practices` | `npx skills add supabase/agent-skills -a claude-code -s '*' -y --copy` | migrations, RLS, funções SQL, Storage, Auth, Edge Functions |

Atualizar: `npx skills update -p -y` (revise o diff antes do commit — skills rodam com as permissões do agente).

## findskills (procurar outras skills)
- Comando nesta máquina: `npx skills find <termos>` (ex.: `npx skills find playwright`).
- Na criação do kit, a pesquisa não devolveu resultados no ambiente usado; tente de novo no seu computador.
- Ler a descrição antes; **instalar só com aprovação** e registrar em DECISOES.md.

## Hermes
- **Não encontrado** nesta máquina na criação do kit. Se for instalado depois, registrar aqui o comando e usar para comparar soluções (prós/contras) antes de decisões técnicas.

## Sem as ferramentas acima: WebSearch / WebFetch
Fontes oficiais, nesta ordem:
- Angular: https://angular.dev (e https://angular.dev/ai para IA)
- Supabase: https://supabase.com/docs (RLS: /guides/database/postgres/row-level-security; Auth hooks: /guides/auth/auth-hooks; Edge Functions: /guides/functions)
- GitHub Pages / Actions: https://docs.github.com/pages
- TipTap: https://tiptap.dev/docs · DOMPurify: https://github.com/cure53/DOMPurify
- Playwright: https://playwright.dev · Vitest: https://vitest.dev · pgTAP: https://pgtap.org

## MCP do Supabase (se estiver ligado no Claude Code)
Útil para `list_tables`, `get_advisors` (segurança/desempenho), `search_docs` e `generate_typescript_types`. **Não** use `apply_migration`/`execute_sql` em produção sem confirmação (NAO_FAZER #9).

## Comando `/pesquisar`
Junta tudo isto: recebe a dúvida, procura skill, pesquisa fontes oficiais, traz 2–3 opções com recomendação e registra a escolha em DECISOES.md.
