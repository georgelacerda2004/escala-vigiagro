-- Seed de teste — APENAS para desenvolvimento local (supabase db reset roda isto).
-- Cria um pai, uma criança e um aparelho com device_token FIXO para facilitar os testes.

-- Usuário de auth (o trigger on_auth_user_created cria a linha em parents).
insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-000000000001', 'pai@teste.com', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Garante o perfil do pai (idempotente).
insert into public.parents (id, email, full_name)
values ('00000000-0000-0000-0000-000000000001', 'pai@teste.com', 'Pai de Teste')
on conflict (id) do nothing;

-- Uma criança.
insert into public.children (id, parent_id, name, birth_date)
values ('00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-000000000001',
        'Lucas (teste)', '2016-04-10')
on conflict (id) do nothing;

-- Um aparelho com token fixo → use este token no header x-device-token dos testes.
insert into public.devices (id, child_id, platform, device_name, device_token, paired_at)
values ('00000000-0000-0000-0000-0000000000d1',
        '00000000-0000-0000-0000-0000000000c1',
        'android', 'Celular do Lucas', 'dev_token_teste_123', now())
on conflict (id) do nothing;
