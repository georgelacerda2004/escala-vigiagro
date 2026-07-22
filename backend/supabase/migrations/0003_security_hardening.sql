-- Fase 3.1 — Endurecimento de segurança e privacidade.

-- 1) Funções internas não devem ser chamáveis via REST/RPC por anônimos ou logados.
--    (advisors 0028/0029). Especialmente run_daily_summary, que dispara IA.
revoke execute on function public.handle_new_user()       from anon, authenticated;
revoke execute on function public.is_my_child(uuid)        from anon, authenticated;
revoke execute on function public.run_daily_summary()      from anon, authenticated;

-- 2) Opt-in da VISÃO por aparelho (LGPD): a captura de tela enviada ao Claude
--    (classify-image) fica DESLIGADA por padrão; só liga com consentimento do pai.
alter table devices
  add column if not exists vision_enabled boolean not null default false;
