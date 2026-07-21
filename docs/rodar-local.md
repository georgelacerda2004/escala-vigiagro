# Rodar o KidsGuard localmente (custo US$ 0)

Testa a esteira completa na sua máquina, sem criar nada na nuvem. Quando validar,
aí sim sobe para um projeto Supabase novo e dedicado.

## Pré-requisitos

- **Docker** aberto (o Supabase local roda em contêineres).
- **Supabase CLI** — https://supabase.com/docs/guides/cli
- Uma **chave da API do Claude** (`sk-ant-...`).

## Passo a passo

```bash
cd kidsguard/backend

# 1. sobe o stack local (Postgres, Auth, Storage, etc.)
supabase start
#    anote a "API URL" que aparecer (geralmente http://127.0.0.1:54321)

# 2. aplica o schema + carrega os dados de teste (seed.sql)
supabase db reset

# 3. chave da IA (fica só local; o .gitignore já ignora este arquivo)
echo "ANTHROPIC_API_KEY=sk-ant-SUA_CHAVE" > supabase/functions/.env

# 4. sobe as Edge Functions
supabase functions serve --env-file supabase/functions/.env
```

## Testes

### A) IA classificando um texto (função `classify`)

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/classify" \
  -H "content-type: application/json" \
  -d '{"text":"oi, quantos anos vc tem? me manda uma foto no pv","app":"roblox","kind":"chat"}'
```
Esperado: `is_concerning: true`, `category: "grooming"`, `severity: "critical"`,
com uma `explanation` em português.

### B) Esteira completa (função `ingest`) — usa o aparelho de teste do seed

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/ingest" \
  -H "content-type: application/json" \
  -H "x-device-token: dev_token_teste_123" \
  -d '{"events":[
        {"app":"youtube","event_type":"video","video_title":"Como fazer slime","channel":"Canal Kids"},
        {"app":"roblox","event_type":"chat","content_text":"me manda seu whatsapp e uma foto sua"}
      ]}'
```
Esperado: o 1º evento entra sem alerta; o 2º passa no pré-filtro, a IA marca como
risco e um registro aparece em `flags` (+ `alerts`).

### C) Ver o que foi gravado

No Supabase Studio local (a URL do Studio também aparece no `supabase start`):
tabelas `activity_events`, `flags`, `alerts`. Ou via SQL:

```sql
select category, severity, explanation from flags order by created_at desc;
```

### D) Resumo diário (função `summarize`)

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/summarize" \
  -H "content-type: application/json" \
  -d '{"child_id":"00000000-0000-0000-0000-0000000000c1"}'
```

## Dados de teste (do seed.sql)

- Pai: `pai@teste.com`
- Criança: **Lucas (teste)** — id `00000000-0000-0000-0000-0000000000c1`
- Aparelho: token **`dev_token_teste_123`**

## Problemas comuns

- `supabase start` falha → Docker não está rodando.
- `classify` retorna erro de API → confira a `ANTHROPIC_API_KEY` no `.env` e reinicie o `functions serve`.
- Porta ocupada → `supabase stop` e `supabase start` de novo.
