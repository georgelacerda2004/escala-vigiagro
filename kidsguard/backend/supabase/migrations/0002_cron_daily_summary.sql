-- Cron diário: gera o resumo de todas as crianças automaticamente.
-- Roda 03:00 UTC = 00:00 America/Sao_Paulo, resumindo o dia que acabou (ontem em BRT).
--
-- PRÉ-REQUISITO (rodar UMA vez, com seus valores reais — ver docs/cron.md):
--   select vault.create_secret('https://SEU_REF.supabase.co', 'project_url');
--   select vault.create_secret('SUA_SERVICE_ROLE_KEY',        'service_role_key');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Função que dispara a Edge Function summarize para o dia anterior (BRT).
create or replace function run_daily_summary()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  base_url text;
  service_key text;
  target_day text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';
  if base_url is null or service_key is null then
    raise notice 'Segredos project_url / service_role_key não configurados no Vault; cron ignorado.';
    return;
  end if;

  target_day := to_char((now() at time zone 'America/Sao_Paulo')::date - 1, 'YYYY-MM-DD');

  perform net.http_post(
    url     := base_url || '/functions/v1/summarize',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || service_key
    ),
    body    := jsonb_build_object('date', target_day)
  );
end;
$$;

-- Agenda (evita duplicar se a migration rodar de novo).
select cron.unschedule('kidsguard-daily-summary')
where exists (select 1 from cron.job where jobname = 'kidsguard-daily-summary');

select cron.schedule('kidsguard-daily-summary', '0 3 * * *', 'select run_daily_summary();');
