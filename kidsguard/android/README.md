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
3. Na tela do app, **pareie** de uma das formas:
   - **📷 Escanear QR** — no painel web (`/criancas`), crie a criança/aparelho e
     escaneie o QR gerado. Preenche URL + token automaticamente. *(recomendado)*
   - **Manual:** URL = `https://rgrhfiviaedpdlbchjyu.supabase.co`, código =
     `device_token` (no teste, `dev_token_teste_123`), toque em **Salvar**.
4. Toque em **Ativar monitoramento** → nas Configurações de Acessibilidade, ligue
   o **KidsGuard**.
5. Abra o **YouTube** e assista a um vídeo.

## Verificar que funcionou

- No **Logcat** (filtro `KidsGuard`) devem aparecer linhas `Vídeo: '...' — canal: ...`.
- No **Supabase Studio** (projeto `rgrhfiviaedpdlbchjyu`), a tabela `activity_events`
  recebe as linhas; se algo suspeito aparecer, vira `flags`/`alerts`.
- No **painel web**, o vídeo entra na timeline e o resumo do dia passa a incluí-lo.

## Testar o monitor do Roblox (Fase 2)

1. Faça o pareamento (URL + token) e ative a Acessibilidade (passos acima).
2. Toque em **"Ativar monitor do Roblox (captura de tela)"**.
   - Na 1ª vez ele abre **"Acesso de uso"** → ative o **KidsGuard** e volte
     (necessário para detectar o Roblox em primeiro plano de forma confiável).
   - Toque de novo → aceite o pedido de **captura de tela** (indicador de gravação).
3. Abra o **Roblox**, entre num jogo com chat e digite algo suspeito
   (ex.: `me passa seu whats` ou `quantos anos vc tem`).
4. No **Logcat** (filtro `KidsGuard/Capture`) você deve ver, a cada ~3s:
   - `tick foreground=com.roblox.client robloxActive=true`
   - `OCR len=NN` (quanto o OCR leu naquele frame)
   - `Chat suspeito (OCR): '...'` quando bater no pré-filtro → vira `flag`/`alert`.
5. **Reforço por visão** (quando o OCR lê pouco): habilite o opt-in no aparelho de teste:
   `update devices set vision_enabled=true where device_token='dev_token_teste_123';`

**Diagnóstico rápido pelo Logcat:**
- `foreground=?` sempre → falta conceder **Acesso de uso**.
- `robloxActive=false` com Roblox aberto → idem (ou UsageStats atrasado).
- `OCR len=0` sempre → captura vindo preta (raro) ou tela sem texto.
- `OCR len>0` mas nada sobe → o texto não bateu no pré-filtro (me manda o log que ajusto).

Como funciona: um Foreground Service segura o `MediaProjection`, tira ~1 screenshot a
cada 5s **só com o Roblox aberto**, roda **OCR (ML Kit, offline)** e envia à nuvem
apenas o texto suspeito. Nenhuma imagem é armazenada. Detalhes em `../docs/roblox.md`.

## Robustez (Fase 3.5)

- **Proteção contra desinstalação:** botão "🔒 Proteger contra desinstalação" ativa o
  app como **administrador do dispositivo** — enquanto ativo, não dá para desinstalar
  sem desativar o admin. Uso legítimo de controle parental, feito pelo responsável.
- **Após reiniciar o aparelho:** o monitor do YouTube volta sozinho; o do Roblox exige
  novo consentimento de captura, então o app envia uma notificação pedindo para reabrir.
- **Notificações (Android 13+):** o app pede a permissão `POST_NOTIFICATIONS` na 1ª vez
  (necessária para push e avisos).

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
