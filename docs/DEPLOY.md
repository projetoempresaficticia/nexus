# Deploy

## Ambientes
| ambiente | frontend | Supabase | uso |
|---|---|---|---|
| local | `npm start` → localhost:4200 | `npx supabase start` (Docker) | desenvolvimento e testes |
| produção | GitHub Pages `https://<usuario>.github.io/nexus/` | projeto `nexus-prod` (região UE) | equipa |
> ⚠️ A CONFIRMAR: conta/organização do GitHub (pessoal do Germano ou da empresa) e se haverá domínio próprio (ex.: `tarefas.preparaportugal.pt` via CNAME).

## Variáveis
### Frontend (`src/environments/environment*.ts` — públicas)
| nome | exemplo |
|---|---|
| `supabaseUrl` | `https://xxxx.supabase.co` |
| `supabaseAnonKey` | publishable/anon key |
| `appUrl` | `https://<usuario>.github.io/nexus` |
No CI, `environment.prod.ts` é gerado a partir dos **secrets** do repositório `SUPABASE_URL` e `SUPABASE_ANON_KEY` (não ficam no Git).

### Edge Functions (segredos do Supabase)
`SUPABASE_SERVICE_ROLE_KEY` (automático) · `RESEND_API_KEY` · `EMAIL_REMETENTE` · `APP_URL` · `CRON_SECRET`

### Scripts locais (`.env`, fora do Git) — ver `.env.example`

## Configuração única de produção (T-40)
1. Criar projeto Supabase `nexus-prod`, região **eu-central-1 (Frankfurt)**.
2. Google Cloud: cliente OAuth "Web" (tipo Interno do Workspace); redirect `https://<ref>.supabase.co/auth/v1/callback`. Colar Client ID/Secret em Auth → Providers → Google.
3. Auth → URL Configuration: Site URL = `appUrl`; Redirect URLs = `appUrl/**` e `http://localhost:4200/**`.
4. Auth → Hooks: ligar "Before User Created" → `public.auth_hook_antes_criar_usuario`.
5. Desligar provedor Email em produção.
6. `npx supabase link --project-ref <ref>` → `npx supabase db push` (**com confirmação**).
7. `npx supabase functions deploy` + `npx supabase secrets set ...` (**com confirmação**).
8. Ativar `pg_cron` e `pg_net`; criar os jobs da migration de notificações.
9. Inserir os 2 admins em `perfis` (Germano e Camila) com `is_admin = true`.
10. GitHub: Settings → Pages → Source "GitHub Actions"; Secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`.

## Publicação do frontend (automática)
Merge na `main` → `deploy.yml`: `npm ci` → gera environment → `ng build --configuration production --base-href /nexus/` → copia `index.html` para `404.html` → `actions/deploy-pages`.

## Publicação do banco e funções (manual, com confirmação)
```bash
npx supabase db diff          # confere o que vai mudar
npx supabase db push          # aplica migrations novas
npx supabase functions deploy <nome>
```

## Checklist pré-publicação
- [ ] CI verde (lint, unit, pgTAP, build).
- [ ] `get_advisors` (segurança e desempenho) sem alertas críticos.
- [ ] Nenhuma chave secreta no bundle (`grep -r service_role dist/` vazio).
- [ ] Migrations novas testadas localmente com `db reset`.
- [ ] CHANGELOG.md atualizado.
- [ ] Teste rápido em produção: login, criar tarefa, comentar, solicitação, e-mail recebido.

## Checklist da virada (T-42)
- [ ] Avisar a equipa com data e hora.
- [ ] v26: implantação em modo só leitura (flag no Apps Script).
- [ ] Export final das abas em CSV → `scripts/importar-v26.ts --dry-run` → conferir contagens → rodar de verdade.
- [ ] Validar: nº de perfis, setores, itens por status, solicitações pendentes, comentários.
- [ ] Testar com 2 pessoas de setores diferentes.
- [ ] Trocar o link oficial e enviar o e-mail de lançamento.
- [ ] Manter o v26 só leitura por 30 dias.

## Rollback
- Frontend: reverter o merge na `main` (deploy automático da versão anterior).
- Banco: nova migration que desfaz; nunca editar a anterior. Backups diários do Supabase (plano Pro) ou `pg_dump` manual antes de cada `db push`.
- Em último caso: reativar o v26 em modo escrita.

## Remoção de dados pessoais (pedido de uma pessoa)
Adm: desativar → `update perfis set nome = 'Pessoa removida', email = 'removido-<id>@estudeemportugal.org'` → registrar em CHANGELOG (sem dados).
