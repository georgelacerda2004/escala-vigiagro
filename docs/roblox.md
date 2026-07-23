# Fase 2 — Monitoramento do Roblox

## Por que é diferente do YouTube

No YouTube, o app lê o texto da tela pelos **nós de acessibilidade**. No Roblox isso
**não funciona**: o chat é desenhado pelo **motor do jogo** (uma superfície gráfica),
não por componentes nativos do Android. Logo, a única forma de ler o chat é
**capturar a tela e extrair o texto**.

## Como o KidsGuard faz (OCR no aparelho)

1. **Detecta o Roblox em primeiro plano** — o `YouTubeAccessibilityService` recebe
   eventos do pacote `com.roblox.client` e "pinga" o serviço de captura.
2. **Captura a tela** — `ScreenCaptureService` (Foreground Service, tipo
   `mediaProjection`) tira 1 screenshot a cada ~5s, **só enquanto o Roblox está ativo**
   (para de amostrar 15s após o Roblox sair do foreground).
3. **OCR offline** — **ML Kit Text Recognition** lê o texto do frame **no próprio
   aparelho** (grátis, sem enviar imagem pra nuvem).
4. **Pré-filtro + envio** — linhas novas passam pelo `Prefilter`; o que é suspeito
   sobe para a `ingest` como `app="roblox", event_type="chat"` → **mesma esteira**:
   IA classifica, grava `flags`, dispara alerta, entra no resumo.

## Privacidade e desempenho

- **Nenhum screenshot é armazenado.** O frame é processado e descartado na hora.
- Só o **texto suspeito** (pós pré-filtro) vai para a nuvem.
- Resolução reduzida à metade e amostragem só com o Roblox aberto → economia de
  bateria e dados.
- O Android exibe o **consentimento de captura** e um **indicador de gravação de tela**
  enquanto ativo — transparência exigida pelas lojas (nada oculto).

## Limitações desta fase (a refinar)

- O OCR depende da nitidez/fonte do chat. Fontes estilizadas ou sobreposição podem
  falhar → ver "Escalonamento por visão" abaixo.
- ~~Detecção de foreground por heurística (ping + timeout de 15s).~~ **Corrigido:**
  agora usa `UsageStatsManager` (exige o usuário conceder "Acesso de uso"); o ping do
  a11y fica como reforço. Captura em **resolução cheia** (melhor OCR) e amostra a cada 3s.
- Sem recorte fixo da região do chat ainda — hoje faz OCR do frame todo e filtra por
  linha. Próximo passo: recortar a área do chat para reduzir ruído.
- Notificação do Foreground Service: no Android 13+ pode exigir a permissão
  `POST_NOTIFICATIONS` concedida em runtime para aparecer.

## Escalonamento por visão (Fase 2.1) ✅ construído

Para os casos que o OCR erra, o frame vai ao **Claude com visão**:
- `_shared/claude.ts` → `classifyImage(base64, mediaType)` (bloco `image` + mesmo schema).
- `functions/classify-image/index.ts` → autentica por `x-device-token`, classifica,
  e se for risco grava `activity_event` + `flag` + `alert`. **Não guarda a imagem.**
- **App:** o `ScreenCaptureService` só escala para visão quando o **OCR leu pouco
  texto** (`< 15` chars = provável chat gráfico), e **no máximo 1x/min** — assim o
  custo fica contido e a maioria dos frames é resolvida de graça pelo OCR.

### Testar a visão (sem Android)
```bash
# base64 de um print com texto suspeito:
B64=$(base64 -w0 print_teste.png)
curl -X POST "$SUPABASE_URL/functions/v1/classify-image" \
  -H "content-type: application/json" \
  -H "x-device-token: dev_token_teste_123" \
  -d "{\"image_base64\":\"$B64\",\"media_type\":\"image/png\"}"
```

## Base de segurança: controles parentais OFICIAIS do Roblox

O monitoramento é **complemento**, não substituto. Orientar o responsável a ativar
no Roblox (e vender isso como parte do produto):

- **Vincular a conta** do responsável à conta da criança (Parent/Teen linking).
- **Restrição de chat por idade** e definição de conta como conta de criança (<13).
- **PIN de responsável** para travar as configurações.
- **Limite de tempo de tela** e **controles de gastos** (Robux).
- **Filtros de conteúdo/maturidade** por faixa etária.

Esses controles reduzem o risco na origem; o KidsGuard entra observando e avisando.
