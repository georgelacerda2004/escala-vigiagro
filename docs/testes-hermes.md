# Guia de teste consolidado — Hermes

Estado atual: Fases 1, 2, 2.1, 3.1–3.5 construídas. Este guia leva do deploy ao teste
ponta a ponta no projeto `rgrhfiviaedpdlbchjyu`.

## 1. Atualizar e publicar tudo

```bash
cd kidsguard && git pull
cd backend

supabase db push        # migrations 0001..0007
supabase functions deploy ingest classify classify-image summarize notify \
  register-token create-checkout stripe-webhook
```

## 2. Segredos (o que já dá para testar sem tudo)

Mínimo p/ o núcleo + e-mail:
```bash
# já configurados antes: ANTHROPIC_API_KEY, Vault (project_url, service_role_key)
supabase secrets set RESEND_API_KEY=re_...          # alertas por e-mail
```
Opcionais (ativam recursos extras):
```bash
supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"  # push
supabase secrets set STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_ID=price_... \
                     STRIPE_WEBHOOK_SECRET=whsec_... DASHBOARD_URL=http://localhost:3000
# enforcement de assinatura (DEIXE OFF para testar o resto):
# supabase secrets set ENFORCE_SUBSCRIPTION=true
```

## 3. Testes de backend (curl / SQL)

**a) Esteira + alerta + e-mail** (ponha seu e-mail no pai de teste antes):
```sql
update parents set email='voce@email.com' where id='00000000-0000-0000-0000-000000000001';
```
```bash
curl -X POST "$URL/functions/v1/ingest" -H "content-type: application/json" \
  -H "x-device-token: dev_token_teste_123" \
  -d '{"events":[{"app":"roblox","event_type":"chat","content_text":"me manda seu whatsapp e uma foto"}]}'
```
→ vira `flag`/`alert`; em ~1 min o cron `notify` manda o e-mail (ou `select run_notify();`).

**b) Endpoints trancados rejeitam anônimo:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$URL/functions/v1/summarize" \
  -H "content-type: application/json" -d '{}'   # esperado 401
```

**c) Visão exige opt-in:** `classify-image` responde `vision_disabled` até:
```sql
update devices set vision_enabled=true where device_token='dev_token_teste_123';
```

**d) Enforcement de assinatura:** com `ENFORCE_SUBSCRIPTION=true`, a `ingest` responde
402 `no_subscription` até existir uma linha ativa em `subscriptions` para o pai.

**e) Crons ativos:**
```sql
select jobname, schedule from cron.job;   -- summary, notify, purge-events
```

## 4. Painel (Next.js)

```bash
cd ../dashboard && npm install
# .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```
- `/login` → link mágico → `/` (painel: alertas + resumos).
- `/criancas` → adicionar filho, criar aparelho, ver **QR** e token, toggle de visão.
- `/assinatura` → botão Assinar (precisa dos secrets do Stripe).

## 5. App Android (aparelho real)

Abrir `android/` no Android Studio.
- **Sem Firebase ainda?** comente as 2 linhas do plugin `com.google.gms.google-services`
  nos `build.gradle.kts` para compilar sem push. Com push: siga `docs/push-fcm.md`.
- Parear via **QR** (do `/criancas`) ou manual.
- Ativar Acessibilidade → testar **YouTube** (assistir vídeo → aparece em activity_events).
- Ativar **monitor do Roblox** (captura) → digitar chat suspeito → vira alerta.
- (opcional) **Proteger contra desinstalação** (device admin).

## O que reportar
Para cada teste, o resultado (ok/erro) e, se erro, a saída completa + de qual passo.
Prioridade: 3a (e-mail), 3b (trancado), 4 (painel/QR). O resto é bônus conforme os
segredos que você tiver configurado.
