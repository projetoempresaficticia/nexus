# Erros conhecidos

Formato de cada entrada:

```
## <título curto>
- **Sintoma:** o que se vê
- **Causa:** por que acontece
- **Solução:** o que fazer
- **Data / tarefa:** AAAA-MM-DD · T-XX
```

## Angular 22 não instala com Node 24.11
- **Sintoma:** `npm install` avisa/recusa `@angular/core` por `engines`.
- **Causa:** Angular 22 exige Node `^22.22.3 || ^24.15.0 || >=26`.
- **Solução:** `winget upgrade OpenJS.NodeJS.LTS` (ou instalador LTS de nodejs.org) e reabrir o VS Code.
- **Data / tarefa:** 2026-10-22 · T-01

## Aviso "install scripts not yet covered by allowScripts" no npm install
- **Sintoma:** npm 11.19 lista esbuild, lmdb, @parcel/watcher e msgpackr-extract.
- **Causa:** o npm novo não roda scripts de instalação sem aprovação.
- **Solução:** pode ignorar — o build e os testes funcionam (os binários vêm em pacotes opcionais). Se algum dia falhar, `npm install-scripts approve <pacote>`.
- **Data / tarefa:** 2026-10-22 · T-01

## Proteção da `main` recusada pelo GitHub (HTTP 403)
- **Sintoma:** "Upgrade to GitHub Pro or make this repository public to enable this feature."
- **Causa:** no plano gratuito, proteção de branch (e rulesets) só existe em repositório público.
- **Solução:** tornar o repositório público ou assinar GitHub Pro e rodar de novo o comando de proteção. Resolvido tornando o repositório público.
- **Data / tarefa:** 2026-10-22 · T-01

## Hook bloqueia commit com "service_role" que não é chave
- **Sintoma:** "✖ Parece haver uma chave service_role no commit" em arquivos sem segredo (skills, SQL com `grant … to service_role`).
- **Causa:** a regex antiga procurava a palavra `service_role`.
- **Solução:** regex agora procura o valor da chave (ver DECISOES). Se mesmo assim bloquear, confira a linha com `git diff --cached | grep -i service_role` — se for uma chave de verdade, **remova-a**.
- **Data / tarefa:** 2026-10-22 · T-02

## `supabase start` falha com DbConnectError / HealthCheckTimeoutError (PC com pouca RAM)
- **Sintoma:** "failed to connect to postgres: Connection terminated unexpectedly" ou "supabase_storage_nexus container is not ready"; cada tentativa demora 10+ min.
- **Causa:** PC com 6 GB de RAM no total; os ~12 contentores do Supabase completo fazem o Docker usar swap. O primeiro `initdb` levou ~13 min, e o CLI apaga o volume a cada falha (recomeça do zero).
- **Solução:** `npm run db:start` (sobe só banco, auth, API e realtime) e `health_timeout = "10m"` no config.toml. Fechar outros programas pesados ajuda. Storage (anexos) e Studio ficam de fora até serem precisos (T-07/T-23): aí, `npx supabase start` completo ou mais RAM.
- **Data / tarefa:** 2026-10-23 · T-03

## `supabase start` falha com `relation "public.perfis" does not exist`
- **Causa:** o seed.sql roda no start, mas as tabelas só nascem na T-05.
- **Solução:** `[db.seed] enabled = false` no config.toml até a T-05 — **religar na T-05**.
- **Data / tarefa:** 2026-10-23 · T-03

## Teste de data falha só perto da meia-noite
- **Sintoma:** teste de recorrência espera um dia a mais/menos; passa de dia e falha à noite.
- **Causa:** o banco roda em UTC (`current_date`), mas o Nexus calcula "hoje" em Lisboa (`(now() at time zone 'Europe/Lisbon')::date`). Entre 23h e 0h UTC as duas datas diferem.
- **Solução:** em SQL e testes, use sempre a data de Lisboa para "hoje"; nunca `current_date`.
- **Data / tarefa:** 2026-10-24 · T-11 (teste da T-09)

## Download de imagem Docker falha no CI com "toomanyrequests: Rate exceeded"
- **Causa:** limite de pedidos do registo de imagens (ECR público) no runner do GitHub.
- **Solução:** rodar de novo o job (`gh run rerun <id> --failed`). É temporário.
- **Data / tarefa:** 2026-10-24 · T-11

## Herdados do v26 (para não repetir)
## Datas viram objetos Date e quebram as visões de semana/mês
- **Sintoma:** prazos aparecem um dia antes/depois ou somem das visões.
- **Causa:** no v26 o Sheets convertia texto em `Date` com fuso.
- **Solução:** no v2 prazos são `date` no Postgres e tratados como texto `AAAA-MM-DD` no Angular (`utils/datas.ts`); nunca `new Date('AAAA-MM-DD')` sem fixar meio-dia/fuso.
- **Data / tarefa:** 2026-10-22 · referência

## Item concluído não podia ser reaberto para outro status
- **Sintoma:** só "Em andamento" funcionava ao reabrir.
- **Causa:** regra incompleta no v26.
- **Solução:** `mudar_status` aceita qualquer transição a partir de `concluida` (teste pgTAP em US-10).
- **Data / tarefa:** 2026-10-22 · referência

## Lentidão de 4–5 s por ação
- **Sintoma:** comentar/mudar tarefa demorava.
- **Causa:** várias idas ao servidor por ação e cache que não guardava tabelas grandes.
- **Solução:** 1 RPC por ação devolvendo o necessário + atualização otimista nas stores.
- **Data / tarefa:** 2026-10-22 · referência

## Imagem colada no comentário quebrava (base64)
- **Solução:** colar imagem → upload ao Storage → `<img src>` com URL do anexo; nunca base64 no HTML.
- **Data / tarefa:** 2026-10-22 · referência
