# Fase 3.1 — Segurança, privacidade e alertas por e-mail

## O que mudou

**Segurança**
- `0003_security_hardening.sql`: revoga `execute` de `handle_new_user`, `is_my_child`
  e `run_daily_summary` de `anon`/`authenticated` (não podem mais ser chamadas via
  `/rest/v1/rpc/...` — fecha o risco de um anônimo disparar IA/gasto).
- `config.toml`: `summarize`, `classify` e `notify` agora exigem **Bearer JWT**
  (`verify_jwt=true`). `ingest` e `classify-image` seguem por `x-device-token`.

**Privacidade (LGPD)**
- `devices.vision_enabled` (default **false**): a `classify-image` (envio da tela ao
  Claude) só roda **com opt-in do pai** — desligada por padrão.
- `0004_retention.sql`: cron diário (04:00 UTC) apaga `activity_events` com **>30 dias**
  (mantém `flags`/`daily_summaries`).

**Entrega de alertas por e-mail**
- Função `notify` + `0005_notify_cron.sql`: a cada 1 min, envia por **Resend** os
  alertas pendentes ao e-mail do pai e marca `sent`.

## Deploy (Hermes)

```bash
cd escala-vigiagro && git pull origin claude/kids-monitoring-youtube-roblox-7wnlwm
cd kidsguard/backend

supabase db push                          # migrations 0003, 0004, 0005
supabase functions deploy classify-image notify

# segredos do e-mail (no SQL nao — via CLI de secrets):
supabase secrets set RESEND_API_KEY=re_sua_chave
# opcional (dominio verificado); no teste pode omitir e usar onboarding@resend.dev:
supabase secrets set RESEND_FROM="KidsGuard <alertas@seu-dominio.com>"
```

### Toggles manuais no Dashboard
- **Auth → Providers/Policies:** ligar **Leaked Password Protection** (advisor).

## Testar

**1) E-mail chega ao pai.** Ponha um e-mail real no pai de teste e dispare um alerta:
```sql
-- no SQL Editor: usar seu e-mail para receber o teste
update parents set email = 'voce@seuemail.com'
where id = '00000000-0000-0000-0000-000000000001';
```
```bash
# gera um alerta (chat suspeito) via ingest
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "content-type: application/json" -H "x-device-token: dev_token_teste_123" \
  -d '{"events":[{"app":"roblox","event_type":"chat","content_text":"me manda seu whatsapp e uma foto"}]}'
```
Em até ~1 min o cron `notify` roda e o e-mail chega. Ou force na hora:
```sql
select run_notify();
```

**2) Endpoints trancados rejeitam anônimo.**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$SUPABASE_URL/functions/v1/summarize" \
  -H "content-type: application/json" -d '{}'
# esperado: 401
```

**3) Visão exige opt-in.** A `classify-image` responde `{"skipped":"vision_disabled"}`
até habilitar no aparelho:
```sql
update devices set vision_enabled = true where device_token = 'dev_token_teste_123';
```

**4) Retenção.** Conferir o job:
```sql
select jobname, schedule from cron.job where jobname = 'kidsguard-purge-events';
```
