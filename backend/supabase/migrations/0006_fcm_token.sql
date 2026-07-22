-- Fase 3.2 — Push: guarda o token FCM de cada aparelho.
alter table devices
  add column if not exists fcm_token text;
