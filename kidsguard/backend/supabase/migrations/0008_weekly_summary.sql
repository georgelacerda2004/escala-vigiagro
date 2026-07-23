-- Relatório semanal: tabela weekly_summaries + cron de segunda-feira.
-- Espelha daily_summaries. A janela é seg..dom; o cron resume a semana que fechou.
--
-- PRÉ-REQUISITO: os mesmos segredos do Vault já usados pelo resumo diário
--   (project_url, service_role_key) — ver docs/cron.md.

create table if not exists weekly_summaries (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  week_start    date not null,           -- segunda-feira da semana
  summary_text  text,                    -- resumo em linguagem natural (PT-BR)
  counts        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (child_id, week_start)
);
create index if not exists weekly_summaries_child_week_idx
  on weekly_summaries (child_id, week_start desc);

-- RLS: cada responsável só vê os resumos das próprias crianças (mesmo padrão das demais).
alter table weekly_summaries enable row level security;

drop policy if exists weekly_summaries_owner on weekly_summaries;
create policy weekly_summaries_owner on weekly_summaries
  for select using (is_my_child(child_id));

-- Função que dispara a Edge Function weekly-summary para a semana anterior.
create or replace function run_weekly_summary()
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
    raise notice 'Segredos project_url / service_role_key não configurados no Vault; cron ignorado.';
    return;
  end if;

  -- Sem week_start no corpo → a função resume a semana anterior completa.
  perform net.http_post(
    url     := base_url || '/functions/v1/weekly-summary',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || service_key
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Só o serviço/cron pode executar (fecha RPC anônimo — mesmo padrão do resumo diário).
revoke execute on function run_weekly_summary() from anon, authenticated;

-- Segunda-feira 05:00 UTC (02:00 BRT) — resume a semana seg..dom que acabou de fechar.
select cron.unschedule('kidsguard-weekly-summary')
where exists (select 1 from cron.job where jobname = 'kidsguard-weekly-summary');

select cron.schedule('kidsguard-weekly-summary', '0 5 * * 1', 'select run_weekly_summary();');
