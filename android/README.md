# KidsGuard — App Android (Fase 1: YouTube)

App que roda no celular da criança, **captura o que ela assiste no YouTube**
(título + canal) e **envia para o backend** (`/functions/v1/ingest`), onde a IA
classifica e gera alertas/resumos. Também detecta texto suspeito visível na tela.

> Transparente por design: o serviço aparece na lista de Acessibilidade e tem
> rótulo/descrição claros (exigência das lojas — nada de app oculto).

## Como é a captura

- Um **AccessibilityService** (`YouTubeAccessibilityService`) observa **apenas** o
  app do YouTube e lê os textos da tela (título/canal/comentários).
- Envia os eventos via **OkHttp** para a Edge Function `ingest`, autenticando com o
  header `x-device-token`.
- Pré-filtro on-device (`Prefilter`) evita mandar texto irrelevante para a nuvem.

## Rodar (Android Studio)

1. Abra a pasta `kidsguard/android/` no **Android Studio** (ele baixa o Gradle/deps).
2. Rode em um **aparelho/emulador Android** (min. Android 8 / API 26).
3. Na tela do app:
   - **URL do backend:** `https://rgrhfiviaedpdlbchjyu.supabase.co`
   - **Código do aparelho:** o `device_token` da criança. No teste, use
     `dev_token_teste_123` (o do seed).
   - Toque em **Salvar**.
4. Toque em **Ativar monitoramento** → nas Configurações de Acessibilidade, ligue
   o **KidsGuard**.
5. Abra o **YouTube** e assista a um vídeo.

## Verificar que funcionou

- No **Logcat** (filtro `KidsGuard`) devem aparecer linhas `Vídeo: '...' — canal: ...`.
- No **Supabase Studio** (projeto `rgrhfiviaedpdlbchjyu`), a tabela `activity_events`
  recebe as linhas; se algo suspeito aparecer, vira `flags`/`alerts`.
- No **painel web**, o vídeo entra na timeline e o resumo do dia passa a incluí-lo.

## Limitações desta fase (a refinar)

- Os **resource-ids do YouTube mudam** entre versões do app. A heurística busca ids
  terminando em `/title`, `/channel_name`, etc. Se num aparelho o título não for
  capturado, inspecione os ids reais (Layout Inspector / `uiautomatorviewer`) e ajuste
  a lista em `YouTubeAccessibilityService.firstTextByIdSuffix`.
- Sem **Foreground Service** ainda: em uso prolongado o sistema pode limitar o
  serviço. Fase seguinte: adicionar Foreground Service + reinício no boot.
- **Roblox** não entra aqui — o chat é desenhado pelo motor do jogo e exige captura de
  tela + OCR (Fase 2).

## Próximos passos (Fase 1.1 / 2)

- Pareamento por **QR code** (em vez de digitar o token).
- **Foreground Service** persistente + `RECEIVE_BOOT_COMPLETED` (reinício).
- `UsageStatsManager` para **tempo de uso** por app.
- Captura de **comentários** de forma mais estruturada.
- Roblox via **MediaProjection + OCR** (Fase 2).
