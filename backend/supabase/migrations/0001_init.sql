-- KidsGuard — schema inicial
-- Monitoramento parental de atividade infantil (YouTube/Roblox).
-- Dado de menor é sensível: RLS restringe tudo ao "pai" (auth.users) dono.

-- =====================================================================
-- Extensões
-- =====================================================================
create extension if not exists "pgcrypto";

-- =====================================================================
-- Enums
-- =====================================================================
create type app_kind        as enum ('youtube', 'roblox', 'other');
create type event_kind      as enum ('video', 'comment', 'chat', 'notification', 'search');
create type platform_kind   as enum ('android', 'ios');
create type flag_category   as enum (
  'bullying', 'sexual', 'grooming', 'violence', 'self_harm',
  'profanity', 'personal_info', 'drugs', 'hate', 'scam', 'other'
);
create type severity_level  as enum ('low', 'medium', 'high', 'critical');
create type alert_channel    as enum ('push', 'email');
create type alert_status     as enum ('pending', 'sent', 'failed', 'read');

-- =====================================================================
-- Tabelas
-- =====================================================================

-- O "pai" é o próprio usuário autenticado (auth.users). Guardamos o perfil.
create table parents (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);

create table children (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references parents(id) on delete cascade,
  name        text not null,
  birth_date  date,
  created_at  timestamptz not null default now()
);
create index on children (parent_id);

create table devices (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  platform      platform_kind not null,
  device_name   text,
  -- token opaco usado pelo app do aparelho para postar eventos (via função ingest)
  device_token  text unique not null default encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'),
  pairing_code  text,                 -- código de 6 dígitos exibido no pareamento
  paired_at     timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index on devices (child_id);
create index on devices (device_token);

create table activity_events (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  device_id     uuid references devices(id) on delete set null,
  app           app_kind not null,
  event_type    event_kind not null,
  content_text  text,                 -- texto capturado (chat, comentário, busca)
  video_id      text,
  video_title   text,
  channel       text,
  url           text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index on activity_events (child_id, occurred_at desc);

create table flags (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references activity_events(id) on delete cascade,
  child_id        uuid not null references children(id) on delete cascade,
  category        flag_category not null,
  severity        severity_level not null,
  matched_excerpt text,
  explanation     text,               -- explicação da IA em linguagem natural (PT-BR)
  model           text,
  created_at      timestamptz not null default now()
);
create index on flags (child_id, created_at desc);
create index on flags (event_id);

create table daily_summaries (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references children(id) on delete cascade,
  summary_date  date not null,
  summary_text  text,                 -- resumo em linguagem natural (PT-BR)
  counts        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  unique (child_id, summary_date)
);
create index on daily_summaries (child_id, summary_date desc);

create table alerts (
  id          uuid primary key default gen_random_uuid(),
  flag_id     uuid not null references flags(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  channel     alert_channel not null,
  status      alert_status not null default 'pending',
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index on alerts (child_id, created_at desc);

-- =====================================================================
-- Row Level Security — tudo restrito ao pai dono (auth.uid())
-- As Edge Functions usam a service_role key, que ignora RLS para ingestão.
-- =====================================================================
alter table parents         enable row level security;
alter table children        enable row level security;
alter table devices         enable row level security;
alter table activity_events enable row level security;
alter table flags           enable row level security;
alter table daily_summaries enable row level security;
alter table alerts          enable row level security;

-- parents: cada um só vê/edita a si mesmo
create policy parents_self on parents
  for all using (id = auth.uid()) with check (id = auth.uid());

-- children: só do pai autenticado
create policy children_owner on children
  for all using (parent_id = auth.uid()) with check (parent_id = auth.uid());

-- helper: um child pertence ao pai autenticado?
create or replace function is_my_child(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from children c where c.id = cid and c.parent_id = auth.uid());
$$;

create policy devices_owner on devices
  for all using (is_my_child(child_id)) with check (is_my_child(child_id));

create policy events_owner on activity_events
  for select using (is_my_child(child_id));

create policy flags_owner on flags
  for select using (is_my_child(child_id));

create policy summaries_owner on daily_summaries
  for select using (is_my_child(child_id));

create policy alerts_owner on alerts
  for all using (is_my_child(child_id)) with check (is_my_child(child_id));

-- =====================================================================
-- Trigger: cria linha em parents quando um usuário se cadastra
-- =====================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.parents (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
