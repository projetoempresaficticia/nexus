-- Agendamentos do Nexus (T-36). NÃO é migration: depende da URL e do segredo de cada projeto.
-- Aplicar UMA vez por projeto (nexus-dev / produção), no SQL Editor, com confirmação do Germano,
-- DEPOIS de: (1) publicar a Edge Function enviar-notificacoes; (2) definir os segredos da função
-- (NOTIFICACOES_SEGREDO, APP_URL, EMAIL_PROVEDOR, SMTP_USUARIO, SMTP_SENHA_APP). Ver DEPLOY.md.
-- Troque os dois valores <...> abaixo antes de rodar. O segredo é o mesmo NOTIFICACOES_SEGREDO.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://<ref-do-projeto>.supabase.co/functions/v1/enviar-notificacoes',
                           'nexus_url_notificacoes');
select vault.create_secret('<mesmo valor de NOTIFICACOES_SEGREDO>', 'nexus_segredo_notificacoes');

-- E-mails pendentes: a cada 2 minutos
select cron.schedule('nexus-enviar-notificacoes', '*/2 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'nexus_url_notificacoes'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-nexus-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'nexus_segredo_notificacoes')),
    body := '{}'::jsonb)
$$);

-- Lembrete "vence amanhã" às 08:00 de Lisboa. O pg_cron usa UTC: roda às 07:00 e às 08:00 UTC
-- e só enfileira quando em Lisboa são 8h (cobre a hora de verão e a de inverno).
select cron.schedule('nexus-lembretes', '0 7,8 * * *', $$
  select privado.enfileirar_lembretes()
  where extract(hour from now() at time zone 'Europe/Lisbon') = 8
$$);

-- Conferir: select jobname, schedule from cron.job;
-- Desligar: select cron.unschedule('nexus-enviar-notificacoes'); select cron.unschedule('nexus-lembretes');
