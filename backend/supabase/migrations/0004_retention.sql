-- Fase 3.1 — Retenção/minimização (LGPD): apaga eventos brutos antigos.
-- Mantém flags e daily_summaries (o que importa para o histórico do pai).

create or replace function purge_old_events()
returns void
language sql
security definer
set search_path = public
as $$
  delete from activity_events where occurred_at < now() - interval '30 days';
$$;

revoke execute on function public.purge_old_events() from anon, authenticated;

-- Roda todo dia às 04:00 UTC (01:00 BRT), depois do resumo diário.
select cron.unschedule('kidsguard-purge-events')
where exists (select 1 from cron.job where jobname = 'kidsguard-purge-events');

select cron.schedule('kidsguard-purge-events', '0 4 * * *', 'select purge_old_events();');
