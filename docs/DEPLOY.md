# Deploy

## Ambientes
| ambiente | frontend | Supabase | uso |
|---|---|---|---|
| desenvolvimento | `npm start` → localhost:4200 | projeto **nexus-dev** na nuvem (`woroiluncnfscajlqoot`, Frankfurt, plano free) | dia a dia do Germano (PC com pouca RAM) |
| local / CI | `npm start` | `npx supabase start` (Docker) | testes pgTAP no CI; opcional em PC com RAM suficiente |
| produção | GitHub Pages https://projetoempresaficticia.github.io/nexus/ | projeto `nexus-prod` (região UE) — **até a T-40 os secrets apontam para o nexus-dev** | equipa |
> ⚠️ A CONFIRMAR: se haverá domínio próprio (ex.: `tarefas.preparaportugal.pt` via CNAME). Conta GitHub: `projetoempresaficticia` (confirmado).

## Variáveis
### Frontend (`src/environments/environment*.ts` — públicas)
| nome | exemplo |
|---|---|
| `supabaseUrl` | `https://xxxx.supabase.co` |
| `supabaseAnonKey` | publishable/anon key |
| `appUrl` | `https://<usuario>.github.io/nexus` |
- `environment.development.ts` (no Git): projeto **nexus-dev** + chave publishable dele (pública; RLS protege). Para usar o Supabase local, troque pela URL `http://127.0.0.1:54321` e a chave de `npx supabase status`.

### Projeto nexus-dev — configuração no painel (antes da T-12)
Auth → URL Configuration: Site URL `http://localhost:4200`; Redirect URLs `http://localhost:4200/**`. Auth → Providers → Email: desligar "Confirm email" (só no dev, para os logins do seed). Google: igual à produção, com o redirect do nexus-dev.
**É um ambiente de desenvolvimento:** só dados fictícios (seed.sql); `db push`/`db reset --linked` aqui é permitido, mas **nunca** no projeto de produção sem confirmação (NAO_FAZER #9).
- `environment.ts` (produção): vazio no Git; no deploy é **reescrito** a partir dos secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` antes do `ng build` (T-04).

### Supabase local (`supabase/.env`, fora do Git)
Para testar login Google localmente: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (cliente OAuth com redirect `http://127.0.0.1:54321/auth/v1/callback`). Sem eles, use o login por e-mail/senha local.

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
10. GitHub: Pages já está em "GitHub Actions" (T-04). **Trocar** os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` (hoje do nexus-dev) pelos do `nexus-prod`: `gh secret set SUPABASE_URL` / `gh secret set SUPABASE_ANON_KEY`.

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
