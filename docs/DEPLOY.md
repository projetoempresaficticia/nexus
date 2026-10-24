# Deploy

## Ambientes
| ambiente | frontend | Supabase | uso |
|---|---|---|---|
| desenvolvimento | `npm start` → localhost:4200 | projeto **nexus-dev** na nuvem (`woroiluncnfscajlqoot`, Frankfurt, plano free) | dia a dia do Germano (PC com pouca RAM) |
| local / CI | `npm start` | `npx supabase start` (Docker) | testes pgTAP no CI; opcional em PC com RAM suficiente |
| produção | **Cloudflare Pages** (`https://<projeto>.pages.dev`, a partir do repositório privado) — antes: GitHub Pages | projeto `nexus-prod` (região UE) — **até a T-40 as variáveis apontam para o nexus-dev** | equipa |
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
1. Auth → URL Configuration: Site URL `http://localhost:4200`; Redirect URLs `http://localhost:4200/**` e `https://projetoempresaficticia.github.io/nexus/**`.
2. Auth → Providers → Email: desligar "Confirm email" (só no dev, para criar senha dos perfis do seed na tela de login).
3. Auth → Hooks → **Before User Created** → Postgres → `public` → `auth_hook_antes_criar_usuario` (sem isto, qualquer e-mail cria conta — a RLS ainda bloqueia os dados, mas o login não mostra "Acesso não autorizado").
4. Google: igual à produção, com o redirect do nexus-dev (`https://woroiluncnfscajlqoot.supabase.co/auth/v1/callback`).
5. Carregar o `supabase/seed.sql` (SQL Editor) e aplicar as migrations pendentes — ver ESTADO_ATUAL.
**É um ambiente de desenvolvimento:** só dados fictícios (seed.sql); `db push`/`db reset --linked` aqui é permitido, mas **nunca** no projeto de produção sem confirmação (NAO_FAZER #9).
- `environment.ts` (produção): vazio no Git; no deploy é **reescrito** a partir dos secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` antes do `ng build` (T-04).

### Supabase local (`supabase/.env`, fora do Git)
Para testar login Google localmente: `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` e `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` (cliente OAuth com redirect `http://127.0.0.1:54321/auth/v1/callback`). Sem eles, use o login por e-mail/senha local.

### Edge Functions (segredos do Supabase)
`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_URL` (automáticos) · `NOTIFICACOES_SEGREDO` (longo e aleatório; o pg_cron manda no cabeçalho `x-nexus-segredo`) · `APP_URL` (ex.: `https://projetoempresaficticia.github.io/nexus`) · `EMAIL_PROVEDOR` (`nenhum` = só registra no log, padrão; `smtp` = envia) · `SMTP_USUARIO` (a conta Google da empresa que envia, ex.: `nexus@estudeemportugal.org`) · `SMTP_SENHA_APP` (senha de app dessa conta) · opcionais: `EMAIL_REMETENTE` (padrão `"Nexus — Prepara Portugal" <SMTP_USUARIO>`; só a própria conta ou um alias dela), `SMTP_HOST` (`smtp.gmail.com`), `SMTP_PORTA` (`465` — 25 e 587 são bloqueadas nas Edge Functions). Anexos no Drive (T-52): `GDRIVE_SERVICE_ACCOUNT_JSON` (o mesmo JSON da conta de serviço do backup), `GDRIVE_ANEXOS_FOLDER_ID` (id da pasta "Anexos" no Drive partilhado — não vai para o Git), opcional `GDRIVE_DOMINIO` (padrão `estudeemportugal.org`). Sem os dois primeiros, os anexos ficam no Storage.
**Senha de app do Google (uma vez):** na conta que vai enviar, ative a **verificação em 2 passos**
(myaccount.google.com → Segurança) e crie uma **senha de app** (myaccount.google.com/apppasswords, nome "Nexus").
Se a opção não aparecer, o administrador do Workspace precisa permitir verificação em 2 passos/senhas de app.
Recomendado: uma conta só para o sistema (ex.: `nexus@...`) em vez da conta de uma pessoa.

### Segredos de uma vez (`scripts/configurar-segredos.mjs`)
Os valores ficam num `segredos.json` **fora** do repositório (padrão `C:\Users\devel\nexus-segredos\`, com um
`LEIA-ME.md` ao lado explicando cada campo) e o JSON da conta de serviço em `conta-servico.json` na mesma pasta.
`node scripts/configurar-segredos.mjs [arquivo]` mostra só os **nomes** do que vai gravar, pede confirmação e grava
nos secrets do GitHub (valor pela entrada padrão do `gh`) e do Supabase do projeto ligado (`.env` temporário apagado
na hora). Com `SMTP_USUARIO`, `SMTP_SENHA_APP` e `APP_URL` preenchidos, também põe `EMAIL_PROVEDOR=smtp` e roda
o `supabase/agendamentos.sql` com o mesmo `NOTIFICACOES_SEGREDO`. Recusa arquivo dentro da pasta do projeto.
No nexus-dev (2026-10-24) o usuário `backup_leitura` já foi criado e a passphrase, a URL do banco, o id da pasta de
backups, o endpoint/região S3 e o `NOTIFICACOES_SEGREDO` já foram gravados.

### Scripts locais (`.env`, fora do Git) — ver `.env.example`

## Configuração única de produção (T-40)
1. Criar projeto Supabase `nexus-prod`, região **eu-central-1 (Frankfurt)**.
2. Google Cloud: cliente OAuth "Web" (tipo Interno do Workspace); redirect `https://<ref>.supabase.co/auth/v1/callback`. Colar Client ID/Secret em Auth → Providers → Google.
3. Auth → URL Configuration: Site URL = `appUrl`; Redirect URLs = `appUrl/**` e `http://localhost:4200/**`.
4. Auth → Hooks: ligar "Before User Created" → `public.auth_hook_antes_criar_usuario`.
5. Desligar provedor Email em produção.
6. `npx supabase link --project-ref <ref>` → `npx supabase db push` (**com confirmação**).
7. `npx supabase functions deploy` + `npx supabase secrets set ...` (**com confirmação**).
8. Notificações: `npx supabase functions deploy enviar-notificacoes` (**com confirmação**; `verify_jwt = false` já está no `config.toml`), `npx supabase secrets set NOTIFICACOES_SEGREDO=... APP_URL=... EMAIL_PROVEDOR=smtp SMTP_USUARIO=... SMTP_SENHA_APP=...`, e rodar **uma vez** o `supabase/agendamentos.sql` no SQL Editor (trocando os dois `<...>`): ativa `pg_cron`/`pg_net` e agenda o envio a cada 2 min e o lembrete das 08:00 de Lisboa.
8b. Anexos no Drive: no Drive partilhado, crie a pasta **Anexos do Nexus**; adicione o e-mail da conta de serviço como **Gestor de conteúdo** do Drive partilhado; copie o id da pasta (o trecho depois de `/folders/` no endereço). `npx supabase secrets set GDRIVE_SERVICE_ACCOUNT_JSON="$(cat conta.json)" GDRIVE_ANEXOS_FOLDER_ID=...` e `npx supabase functions deploy enviar-anexo limpar-anexos` (**com confirmação**). Teste: anexe um arquivo a um item e veja-o aparecer na pasta do setor.
9. Inserir os 2 admins em `perfis` (Germano e Camila) com `is_admin = true`.
10. GitHub: Pages já está em "GitHub Actions" (T-04). **Trocar** os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` (hoje do nexus-dev) pelos do `nexus-prod`: `gh secret set SUPABASE_URL` / `gh secret set SUPABASE_ANON_KEY`.

## Publicação do frontend (automática, Cloudflare Pages — T-48)
Merge na `main` → o Cloudflare Pages faz o build e publica sozinho; cada PR ganha um endereço de pré-visualização.
O build roda `npm run build:cloudflare`: `scripts/gerar-environment.mjs` escreve o `environment.ts` a partir das
variáveis do Cloudflare (recusa chave `sb_secret_`/`service_role`) e depois `ng build --configuration production`
→ `dist/nexus/browser`. `public/_redirects` (`/* /index.html 200`) faz as rotas do Angular funcionarem ao
recarregar a página; `public/_headers` põe cabeçalhos de segurança.

### Ligar o repositório no Cloudflare (uma vez)
1. <https://dash.cloudflare.com> → **Workers & Pages → Create → Pages → Connect to Git**.
2. Autorize o app **Cloudflare Pages** no GitHub **só para o repositório `nexus`** (funciona com repositório privado).
3. **Production branch:** `main`.
4. **Framework preset:** `None` (o preset "Angular" usa outra pasta de saída).
5. **Build command:** `npm run build:cloudflare`
6. **Build output directory:** `dist/nexus/browser`
7. **Environment variables** (Production e Preview):
   | nome | valor |
   |---|---|
   | `NODE_VERSION` | `24` (o `.nvmrc` também indica 24) |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` (hoje o nexus-dev) |
   | `SUPABASE_ANON_KEY` | a chave **publishable** (`sb_publishable_...`) — nunca a secret |
   | `APP_URL` | o endereço do site, ex.: `https://nexus.pages.dev` |
8. **Save and Deploy**. Depois, no Supabase do mesmo ambiente: **Auth → URL Configuration** → Site URL = `APP_URL`
   e Redirect URLs com `https://<projeto>.pages.dev/**` e `https://*.<projeto>.pages.dev/**` (pré-visualizações).
9. (Opcional) **Custom domains** no Cloudflare, se a empresa quiser um domínio próprio.

O `deploy.yml` antigo (GitHub Pages) ficou só manual e pode ser apagado depois da virada: com o repositório
privado no plano gratuito do GitHub, o Pages não funciona.

## Publicação do banco e funções (manual, com confirmação)
```bash
npx supabase db diff          # confere o que vai mudar
npx supabase db push          # aplica migrations novas
npx supabase functions deploy <nome>
```

## Checklist pré-publicação
- [ ] CI verde (lint, unit, pgTAP, build).
- [ ] `get_advisors` (segurança e desempenho) sem alertas críticos.
- [ ] Nenhuma chave secreta no bundle (`bash .github/scripts/sem-segredos.sh dist` — roda também no CI).
- [ ] Último backup do dia verde em Actions → Backup Supabase (docs/BACKUP.md).
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
- Frontend no Cloudflare: **Deployments → … → Rollback** numa versão anterior (imediato).
- Banco: nova migration que desfaz; nunca editar a anterior. Backup diário encriptado no Google Drive (docs/BACKUP.md; restauro na secção 6) — rode o backup à mão antes de cada `db push` em produção.
- Em último caso: reativar o v26 em modo escrita.

## Remoção de dados pessoais (pedido de uma pessoa)
Adm: desativar → `update perfis set nome = 'Pessoa removida', email = 'removido-<id>@estudeemportugal.org'` → registrar em CHANGELOG (sem dados).
