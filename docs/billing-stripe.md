# Fase 3.4 — Assinatura (Stripe)

Cobra a mensalidade do responsável via Stripe Checkout; o status fica em `subscriptions`.

## Setup no Stripe

1. Conta em https://dashboard.stripe.com (modo teste serve).
2. **Produto + Preço recorrente** (ex.: R$ 19,90/mês) → anote o **Price ID** (`price_...`).
3. Chave secreta em **Developers → API keys** (`sk_test_...`).
4. **Webhook**: Developers → Webhooks → Add endpoint:
   - URL: `https://rgrhfiviaedpdlbchjyu.supabase.co/functions/v1/stripe-webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`.
   - Anote o **Signing secret** (`whsec_...`).

## Backend

```bash
supabase db push                          # 0007_subscriptions.sql
supabase functions deploy create-checkout stripe-webhook

supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_PRICE_ID=price_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set DASHBOARD_URL=https://seu-painel.vercel.app   # p/ redirecionar após pagar
```

## Fluxo

1. No painel (`/assinatura`), o pai clica **Assinar agora** →
   `create-checkout` (autenticado por JWT) cria a sessão e devolve a URL.
2. O pai paga no Stripe → volta para `/assinatura?ok=1`.
3. O Stripe chama o `stripe-webhook` → grava/atualiza `subscriptions` (status, período).
4. O painel mostra **ATIVA** e a data de renovação.

## Testar (modo teste)

- Cartão de teste: `4242 4242 4242 4242`, validade futura, CVC qualquer.
- Após pagar, confira no SQL: `select * from subscriptions;` → `status='active'`.
- Para simular eventos sem UI: use o **Stripe CLI** (`stripe trigger checkout.session.completed`).

## Próximo passo (enforcement)

Hoje o status é apenas **registrado**. Para travar recursos por plano (ex.: exigir
assinatura ativa para o app enviar eventos, ou limitar nº de filhos), adicionar uma
checagem em `ingest`/painel consultando `subscriptions.status`.
