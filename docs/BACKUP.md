# Backup do banco (Supabase → Google Drive)

O plano gratuito do Supabase **não guarda backups**. Por isso, todos os dias às **03:00 de Lisboa**, o workflow
`.github/workflows/backup-supabase.yml`:

1. faz o dump oficial do Supabase (usuários do banco, estrutura e dados — inclui os logins de `auth.users`);
2. **testa o restauro** num Supabase temporário dentro do próprio job e compara as linhas de cada tabela;
3. comprime (`gzip`) e **encripta** (GPG simétrico, AES256) → `nexus-backup-AAAA-MM-DD.sql.gz.gpg`;
4. envia para a pasta do **Drive partilhado** da empresa e mantém **os 30 últimos dias + o dia 1 de cada mês
   durante 12 meses** (os outros vão para a lixeira do Drive, que se esvazia sozinha em 30 dias).

Se qualquer passo falhar, o job fica vermelho e o GitHub manda e-mail a quem editou o workflow por último.
Também dá para rodar à mão: **Actions → Backup Supabase → Run workflow**.

Os **arquivos dos anexos** (que ficam no Storage, não no banco) têm uma cópia **semanal**, aos domingos, no
mesmo workflow (secção 8): `nexus-anexos-AAAA-MM-DD.tar.gpg`, guardando 8 semanas + o primeiro de cada mês por
12 meses.

> **Não está em nenhum backup:** as configurações do painel do Supabase (Auth/Google, URLs, hook) e os segredos
> das Edge Functions. O código das funções e as migrations estão no repositório.

---

## 1. A passphrase (faça antes de tudo)
Sem ela, nenhum backup abre — nem por nós.
1. Gere uma passphrase longa: `openssl rand -base64 32` (no Git Bash) ou um gerador de senhas.
2. Guarde-a **no gerenciador de senhas da empresa** (e, se possível, em papel num cofre).
3. Ela vai também para o secret `BACKUP_PASSPHRASE` (passo 4).
4. Se um dia trocar a passphrase, **guarde a antiga**: os backups anteriores continuam a precisar dela.

## 2. Conta de serviço do Google (quem envia ao Drive)
1. Entre em <https://console.cloud.google.com> com a conta da empresa e crie (ou escolha) um projeto, por
   exemplo **nexus-backup**.
2. **APIs e serviços → Biblioteca →** procure **Google Drive API** → **Ativar**.
3. **IAM e administrador → Contas de serviço → Criar conta de serviço**: nome `nexus-backup`.
   Não precisa de nenhum papel no projeto → **Concluir**.
4. Abra a conta criada → **Chaves → Adicionar chave → Criar nova chave → JSON**. O arquivo é baixado.
   - Se aparecer "a criação de chaves está desativada", um administrador do Google Workspace precisa liberar
     a política `iam.disableServiceAccountKeyCreation` para este projeto.
5. Copie o **e-mail** da conta de serviço (algo como `nexus-backup@<projeto>.iam.gserviceaccount.com`).
6. O conteúdo do JSON vai para o secret `GDRIVE_SERVICE_ACCOUNT_JSON` (passo 4). Depois **apague o arquivo
   baixado** do computador.

## 3. Dar acesso à pasta no Drive partilhado
A conta de serviço **não tem espaço próprio** no Drive: a pasta precisa estar num **Drive partilhado**
(não em "O meu Drive"), senão o envio falha com "storage quota exceeded".
1. No Google Drive, abra o **Drive partilhado** onde está a pasta de backups.
2. Clique no nome do Drive partilhado → **Gerir membros** (ou, só na pasta: botão direito → **Partilhar**).
3. Cole o e-mail da conta de serviço e escolha **Gestor de conteúdo** (*Content manager*).
   - É o papel mínimo para enviar arquivos **e** mandar os antigos para a lixeira.
   - Desmarque "Notificar pessoas" (a conta de serviço não lê e-mail).
4. O **ID da pasta** é a parte do link entre `/folders/` e `?` — vai só para o secret `GDRIVE_FOLDER_ID`.
   **Nunca** coloque o ID nem o link em arquivos do repositório.

## 4. Usuário do banco só de leitura (recomendado)
Assim, se o secret vazar, ninguém consegue apagar nem alterar dados.
1. Supabase → projeto → **SQL Editor**, rode (troque a senha por uma forte, sem `@` nem `:`):
   ```sql
   create role backup_leitura with login password 'TROQUE-POR-UMA-SENHA-FORTE';
   grant pg_read_all_data to backup_leitura;
   ```
2. Supabase → **Connect** (botão no topo) → **Session pooler** → copie a URI. Ela tem o formato
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-...pooler.supabase.com:5432/postgres`.
3. Troque `postgres.<ref>` por `backup_leitura.<ref>` e `[YOUR-PASSWORD]` pela senha do passo 1.
   - Use o **Session pooler (porta 5432)**: a ligação direta usa IPv6, que os servidores do GitHub não têm.
4. Essa URI completa vai para o secret `SUPABASE_DB_URL`.
5. Se a primeira execução falhar com "permission denied" no dump, use temporariamente o usuário `postgres`
   (mesma URI do passo 2 com a senha do banco) e avise para ajustarmos as permissões.

## 5. Os 4 secrets no GitHub
> Atalho: `node scripts/configurar-segredos.mjs` grava estes secrets (e os das Edge Functions) a partir de
> um `segredos.json` guardado **fora** do repositório — ver DEPLOY.md §Segredos de uma vez.

Repositório → **Settings → Secrets and variables → Actions → New repository secret**. Os nomes têm de ser
exatamente estes:

| Secret | O que colar |
|---|---|
| `SUPABASE_DB_URL` | URI do Session pooler do passo 4 (com usuário e senha) |
| `BACKUP_PASSPHRASE` | a passphrase do passo 1 |
| `GDRIVE_SERVICE_ACCOUNT_JSON` | o conteúdo **inteiro** do arquivo JSON do passo 2 (de `{` a `}`) |
| `GDRIVE_FOLDER_ID` | o ID da pasta do passo 3 |

Depois: **Actions → Backup Supabase → Run workflow** e confira, no fim, se o arquivo
`nexus-backup-AAAA-MM-DD.sql.gz.gpg` apareceu na pasta. O resumo do job mostra o tamanho do dump e o
número de tabelas e pessoas restauradas no teste (nunca o conteúdo).

---

## 6. Restaurar um backup (passo a passo)
Use quando for preciso recuperar dados. Restaure **sempre num projeto Supabase novo e vazio** — nunca por cima
do projeto em uso.

**Precisa de:** `gpg` (vem no **Git Bash** do Windows, ou instale o Gpg4win) e `psql` **17**
(Windows: instalador do PostgreSQL 17 marcando só "Command Line Tools").

1. **Baixe** o arquivo do Drive, por exemplo `nexus-backup-2026-11-30.sql.gz.gpg`, para uma pasta só sua.
2. **Desencripte** (pede a passphrase):
   ```bash
   gpg --output nexus.sql.gz --decrypt nexus-backup-2026-11-30.sql.gz.gpg
   ```
3. **Descomprima**:
   ```bash
   gunzip nexus.sql.gz        # gera nexus.sql
   ```
4. **Crie um projeto Supabase novo** (região Frankfurt). Não aplique migrations nele.
5. Copie a URI do **Session pooler** do projeto novo (usuário `postgres` e a senha do banco dele).
6. **Restaure** tudo numa transação (se der erro, nada fica pela metade):
   ```bash
   psql "postgresql://postgres.<ref-novo>:<senha>@aws-...pooler.supabase.com:5432/postgres" \
        --single-transaction -v ON_ERROR_STOP=1 -f nexus.sql
   ```
7. **Confira** no SQL Editor do projeto novo:
   ```sql
   select count(*) from public.perfis;
   select count(*) from public.itens;
   select max(criado_em) from public.itens;   -- última tarefa criada antes do backup
   ```
8. **Reconfigure o que não vai no backup** (DEPLOY.md): Auth → URL Configuration e Google; Auth → Hooks
   (`auth_hook_antes_criar_usuario`); `npx supabase functions deploy`; segredos das funções;
   `supabase/agendamentos.sql`; e, se for o novo projeto oficial, a URL e a chave publishable nas variáveis
   do Cloudflare Pages.
9. **Apague** `nexus.sql` e `nexus.sql.gz` do computador — têm os dados da empresa sem encriptação.

## 7. Testar o restauro num projeto de teste (recomendado a cada 3 meses)
Cada backup já é restaurado automaticamente num Supabase temporário dentro do job. Ainda assim, vale ensaiar o
processo inteiro de vez em quando, para ninguém aprender no dia da emergência:
1. Crie um projeto Supabase **nexus-restauro-teste**. O plano gratuito permite 2 projetos ativos: se for
   preciso, **pause** o de desenvolvimento durante o teste.
2. Faça os passos 1 a 7 da secção 6 com o backup mais recente.
3. Compare os números do passo 7 com o projeto de produção (podem diferir só pelo que foi feito depois das 03:00).
4. Opcional: aponte o `environment.development.ts` para o projeto de teste e entre no app com um perfil do
   backup.
5. **Apague o projeto de teste** (Settings → General → Delete project) e os arquivos baixados.
6. Anote a data do ensaio em DECISOES.md ou no ESTADO_ATUAL.md.

## 8. Cópia semanal dos anexos (arquivos do Storage)
Desde a T-52 os **arquivos anexados ficam no Google Drive partilhado** (o próprio Drive guarda versões e a lixeira por 30 dias); o Storage guarda só as imagens coladas no texto. Esta cópia continua a valer para elas.

Fica desligada até existirem os 4 secrets abaixo (enquanto isso o job só mostra um aviso amarelo).
1. Supabase → projeto → **Storage → S3 Configuration** (ou Settings → Storage): copie o **Endpoint** e a
   **Region**. Prefira o endereço `https://<ref>.storage.supabase.co/storage/v1/s3` (mais rápido para arquivos
   grandes).
2. Em **Access keys → New access key**, dê o nome `backup-github` e copie o **Access key ID** e o **Secret access
   key** (o secret só aparece uma vez).
   - ⚠️ Estas chaves dão acesso **total** ao Storage (não existe chave só de leitura). O workflow só lê, mas
     guarde-as apenas no GitHub e apague-as no painel se deixarem de ser usadas.
3. Crie no GitHub (Settings → Secrets and variables → Actions):

   | Secret | O que colar |
   |---|---|
   | `SUPABASE_S3_ENDPOINT` | o endpoint do passo 1 |
   | `SUPABASE_S3_REGION` | a região (ex.: `eu-central-1`) |
   | `SUPABASE_S3_ACCESS_KEY_ID` | Access key ID do passo 2 |
   | `SUPABASE_S3_SECRET_ACCESS_KEY` | Secret access key do passo 2 |
4. Teste: **Actions → Backup Supabase → Run workflow** (faz o banco e os anexos) e confira os dois arquivos no Drive.
5. Espaço: cada cópia tem o tamanho de todos os anexos (o plano gratuito do Supabase vai até 1 GB). Com ~20
   cópias guardadas, reserve no Drive partilhado até ~20× esse tamanho.

**Restaurar os anexos** (depois de restaurar o banco, secção 6 — os registros em `storage.objects` vêm do banco):
1. Baixe `nexus-anexos-AAAA-MM-DD.tar.gpg` e desencripte com a **mesma passphrase**:
   ```bash
   gpg --output anexos.tar --decrypt nexus-anexos-AAAA-MM-DD.tar.gpg
   tar -xf anexos.tar        # cria a pasta anexos/ com setor/item/arquivo
   ```
2. No projeto novo, crie chaves S3 (passos 1 e 2) e envie a pasta com o [rclone](https://rclone.org/install/):
   ```bash
   rclone copy anexos :s3:anexos --s3-provider Other --s3-endpoint "<endpoint>" --s3-region "<região>"      --s3-access-key-id "<id>" --s3-secret-access-key "<secret>" --s3-force-path-style
   ```
   (O bucket `anexos` já existe se as migrations ou o restauro do banco o criaram.)
3. Abra um item com anexo no app e clique no arquivo para conferir. Apague `anexos.tar` e a pasta do computador.

## Quando o backup falhar
- O e-mail do GitHub leva ao job: veja o passo vermelho.
- **Secret não configurado** → passo 5. **permission denied** no dump → passo 4.5.
- **storage quota exceeded** → a pasta não está num Drive partilhado (passo 3).
- **insufficient permissions / not found** no Drive → a conta de serviço não é Gestor de conteúdo (passo 3).
- **Tabelas que não voltaram no restauro** → não envie nada à mão; avise para investigar o dump.
- O projeto gratuito do Supabase **pausa após 7 dias sem uso**: o backup falha até alguém reativá-lo no painel.
