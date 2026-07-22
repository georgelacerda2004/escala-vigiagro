# KidsGuard 🛡️

Monitoramento parental de **YouTube** e **Roblox** no celular da criança, com **IA**
que resume a atividade e **alerta** quando aparece conteúdo inadequado (mensagem de
estranho, bullying, vídeo impróprio).

> **Produto para vender**, Android como carro-chefe e iOS como versão "supervisão light".
> Veja `docs/arquitetura.md` para o porquê de cada decisão.

## Como funciona (a esteira)

```
[App Android da criança]  captura título/canal do YouTube, chat do Roblox (fase 2),
        │                 notificações e tempo de uso; faz um pré-filtro no aparelho
        ▼ (HTTPS + x-device-token)
[Supabase Edge Function: ingest]  grava o evento → pré-filtro → IA (Claude) classifica
        │                          → grava alerta (flags) → enfileira notificação
        ▼
[Painel do pai (Next.js)]  timeline + alertas + resumo diário   ·   push/e-mail
```

## Estrutura

```
kidsguard/
  backend/supabase/
    migrations/0001_init.sql          # banco + RLS (dado de menor é sensível)
    functions/ingest/                 # app da criança envia eventos aqui
    functions/classify/               # endpoint de teste da IA
    functions/summarize/              # resumo diário (cron)
    functions/_shared/claude.ts       # integração Claude (classificação + resumo)
  dashboard/                          # painel web do pai (Next.js)
  docs/arquitetura.md · docs/privacidade.md
```

## Rodar o backend (Fase 1)

Pré-requisitos: [Supabase CLI](https://supabase.com/docs/guides/local-development), uma
chave da API do Claude, e um projeto Supabase.

```bash
cd backend
supabase link --project-ref <SEU_PROJECT_REF>

# aplica o schema
supabase db push

# segredo da IA (fica só no servidor, nunca no app)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# publica as funções
supabase functions deploy ingest classify summarize
```

### Testar a IA rápido (sem app Android)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/classify" \
  -H "content-type: application/json" \
  -d '{"text":"oi, quantos anos vc tem? me manda uma foto sua no pv", "app":"roblox", "kind":"chat"}'
# → is_concerning=true, category="grooming", severity="critical"
```

### Simular o envio de um evento pelo aparelho

```bash
curl -X POST "$SUPABASE_URL/functions/v1/ingest" \
  -H "content-type: application/json" \
  -H "x-device-token: <token_do_device>" \
  -d '{"events":[{"app":"youtube","event_type":"video","video_title":"...","channel":"..."}]}'
```

## Roadmap

- **Fase 1 (MVP):** YouTube no Android + esteira de IA + painel + alertas + cron do
  resumo diário. ✅
- **Fase 2:** Roblox via **captura de tela + OCR on-device** (reusa a `ingest`);
  controles parentais oficiais do Roblox documentados. ✅ (ver `docs/roblox.md`)
- **Fase 2.1:** escalonamento por **visão do Claude** (`classify-image`) para frames
  que o OCR erra — acionado só quando o OCR falha e no máx. 1x/min. ✅
- **Fase 3 (em andamento):**
  - 3.1 segurança + privacidade (opt-in visão, retenção) + **alertas por e-mail**. ✅
  - 3.2 **push (FCM)** no celular do responsável. ✅ (`docs/push-fcm.md`)
  - 3.3 **onboarding + pareamento por QR + multi-filhos** no painel. ✅
  - 3.4 **assinatura (Stripe)** — checkout + webhook + status no painel. ✅ (`docs/billing-stripe.md`)
  - 3.5 **robustez do app** (Device Admin/anti-desinstalação, aviso no boot,
    permissão de notificação) + **enforcement de assinatura** (opcional via
    `ENFORCE_SUBSCRIPTION`). ✅
  - 3.6 (a fazer) iOS "light" (Screen Time + filtro).

Guia de teste ponta a ponta: `docs/testes-hermes.md`.

## Aviso

Ferramenta de **controle parental** para monitorar o **próprio filho menor**, com
transparência (notificação persistente no aparelho). Não é software de espionagem.
Veja `docs/privacidade.md`.
