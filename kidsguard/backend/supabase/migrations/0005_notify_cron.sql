-- Fase 3.1 — Cron que entrega os alertas por e-mail (chama a Edge Function notify).
-- Roda a cada 1 minuto; usa os segredos já existentes no Vault (project_url, service_role_key).

create or replace function run_notify()
returns void
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  base_url text;
  service_key text;
begin
  select decrypted_secret into base_url
    from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into service_key
    from vault.decrypted_secrets where name = 'service_role_key';
  if base_url is null or service_key is null then
    raise notice 'Segredos do Vault ausentes; notify ignorado.';
    return;
  end if;

  perform net.http_post(
    url     := base_url || '/functions/v1/notify',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || service_key
    ),
    body    := '{}'::jsonb
  );
end;
$$;

revoke execute on function public.run_notify() from anon, authenticated;

select cron.unschedule('kidsguard-notify')
where exists (select 1 from cron.job where jobname = 'kidsguard-notify');

select cron.schedule('kidsguard-notify', '* * * * *', 'select run_notify();');
