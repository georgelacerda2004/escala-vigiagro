# Arquitetura & Decisões — KidsGuard

## Por que Android é o carro-chefe

Monitorar **conteúdo** (chat, vídeo) exige ler o que está na tela de outros apps.
- **Android:** permite via `AccessibilityService` (texto na tela), `NotificationListenerService`
  (notificações) e `UsageStatsManager` (tempo de uso). É como Bark/Qustodio funcionam.
- **iOS:** a Apple **não permite** apps de terceiros lerem conteúdo de outros apps, e já
  **removeu** apps de controle parental baseados em MDM. No iPhone dá só tempo de uso +
  filtro web (VPN/DNS). Por isso iOS = "supervisão light", vendido de forma honesta.

## YouTube vs Roblox

| | Como capturar | Fase |
|---|---|---|
| **YouTube** | AccessibilityService lê título, canal e comentários visíveis; enriquecer com YouTube Data API v3 | 1 |
| **Roblox** | Chat é renderizado pelo **motor do jogo** → AccessibilityService NÃO lê. Precisa **MediaProjection (screenshot) + OCR/IA de visão**. Complementar com os **controles parentais oficiais** do Roblox (vínculo de conta, restrição de chat, PIN) | 2 |

## Componentes

- **App da criança (Android/Kotlin):** Foreground Service + AccessibilityService +
  NotificationListener + UsageStats (+ MediaProjection/OCR na fase 2). Faz um
  **pré-filtro on-device** (lista de termos / ML Kit) para só enviar à nuvem o que
  interessa — reduz custo de IA e melhora privacidade.
- **Backend (Supabase):** Postgres + RLS, Auth, Edge Functions (Deno), Realtime, Storage.
- **IA (Claude, `claude-opus-4-8`):** classificação com *structured outputs* (JSON validado)
  e resumo diário em linguagem natural. Visão para screenshots do Roblox (fase 2).
- **Painel do pai (Next.js):** timeline, alertas, resumo. Push (FCM) + e-mail.

## Modelo de dados (resumo)

`parents` (= auth.users) → `children` → `devices` → `activity_events` → `flags` → `alerts`;
`daily_summaries` por criança/dia. RLS garante que cada pai só vê os próprios filhos; as
Edge Functions usam `service_role` para ingestão. Detalhes em
`backend/supabase/migrations/0001_init.sql`.

## Segurança do fluxo

- App autentica no backend por **device_token** opaco (não expõe credenciais do pai).
- Chave da IA fica **só no servidor** (`supabase secrets`), nunca no app.
- Pré-filtro no aparelho minimiza dados enviados; retenção curta (ver `privacidade.md`).

## Custo de IA (ordem de grandeza)

O pré-filtro on-device evita mandar tudo à nuvem. Só trechos suspeitos vão ao Claude
(`effort: "low"`, respostas curtas via structured outputs). Estimar por criança/dia com
dados reais antes de precificar a assinatura.
