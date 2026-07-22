-- Fase 3.4 — Assinaturas (Stripe).
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  parent_id               uuid not null unique references parents(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  status                  text not null default 'inactive',  -- active, trialing, past_due, canceled...
  plan                    text,
  current_period_end      timestamptz,
  updated_at              timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- O pai vê a própria assinatura; escrita só via service role (webhook do Stripe).
create policy subscriptions_owner on subscriptions
  for select using (parent_id = auth.uid());
