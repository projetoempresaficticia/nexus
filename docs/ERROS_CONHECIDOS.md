# Erros conhecidos

Formato de cada entrada:

```
## <título curto>
- **Sintoma:** o que se vê
- **Causa:** por que acontece
- **Solução:** o que fazer
- **Data / tarefa:** AAAA-MM-DD · T-XX
```

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
