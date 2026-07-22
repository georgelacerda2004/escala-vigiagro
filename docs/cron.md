# Cron do resumo diário — KidsGuard

A migration `0002_cron_daily_summary.sql` agenda um job que, todo dia à **meia-noite
de Brasília**, gera o resumo de **todas as crianças** referente ao dia anterior.

## Configurar os 2 segredos (uma vez, no projeto da nuvem)

O cron lê a URL do projeto e a `service_role_key` do **Vault** do Supabase — nada
fica exposto no código. No **SQL Editor** do projeto (Dashboard → SQL), rode:

```sql
select vault.create_secret('https://rgrhfiviaedpdlbchjyu.supabase.co', 'project_url');
select vault.create_secret('SUA_SERVICE_ROLE_KEY_AQUI', 'service_role_key');
```

> A `service_role_key` está em **Dashboard → Project Settings → API → service_role**.
> Ela é secreta; por isso vai no Vault, não no repositório.

Depois aplique a migration (`supabase db push`) — ou rode o conteúdo dela no SQL Editor.

## Testar sem esperar a meia-noite

```sql
select run_daily_summary();          -- dispara agora (resumo de ontem)
```
ou, para um dia específico, chame a função direto:
```bash
curl -X POST "$SUPABASE_URL/functions/v1/summarize" \
  -H "content-type: application/json" \
  -d '{"date":"2026-07-21"}'          -- sem child_id = todas as crianças
```

## Ver / gerenciar o agendamento

```sql
select jobname, schedule, active from cron.job;                 -- lista
select * from cron.job_run_details order by start_time desc;    -- histórico de execuções
select cron.unschedule('kidsguard-daily-summary');              -- desativa
```

## Horário

`'0 3 * * *'` = 03:00 UTC = 00:00 em `America/Sao_Paulo` (horário padrão BRT, UTC-3).
Para mudar, altere a expressão cron na migration e reagende.
