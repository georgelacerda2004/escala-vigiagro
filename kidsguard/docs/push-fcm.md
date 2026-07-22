# Fase 3.2 — Push (FCM)

Envia os alertas como **notificação no celular** do responsável, além do e-mail.

## Pré-requisito externo: projeto Firebase

Push exige um projeto Firebase (grátis). Passos:

1. Crie um projeto em https://console.firebase.google.com.
2. **Adicione um app Android** com o pacote `com.kidsguard.app`.
3. Baixe o **`google-services.json`** e coloque em `kidsguard/android/app/`.
   - Sem esse arquivo o app **não compila com push** (comente as linhas do plugin
     `com.google.gms.google-services` nos `build.gradle.kts` para buildar sem push).
4. Em **Project Settings → Service accounts → Generate new private key**: baixa um
   JSON de conta de serviço (contém `client_email`, `private_key`, `project_id`).

## Backend

```bash
supabase db push                         # 0006_fcm_token.sql (coluna devices.fcm_token)
supabase functions deploy register-token notify

# conta de serviço do Firebase (JSON inteiro como string):
supabase secrets set FCM_SERVICE_ACCOUNT="$(cat caminho/service-account.json)"
```

- A função `notify` já foi estendida: além do e-mail, envia **push** para os alertas
  com `channel='push'` (que a `ingest`/`classify-image` já criam), usando o
  `fcm_token` de cada aparelho da criança. Só roda se `FCM_SERVICE_ACCOUNT` existir.

## App

- Ao abrir **pareado**, o app registra o token FCM na `register-token`.
- `KidsGuardMessagingService` recebe o push e mostra a notificação.
- No Android 13+, conceder a permissão **POST_NOTIFICATIONS** (o app pede/an usuário
  ativa nas configurações) para as notificações aparecerem.

## Testar

1. App pareado num aparelho real → confirme no banco que `devices.fcm_token` foi
   preenchido para aquele device.
2. Dispare um alerta (curl no `ingest` com chat suspeito).
3. Em ~1 min o cron `notify` roda → chega o **e-mail** e o **push** no celular.
   Para forçar na hora: `select run_notify();` no SQL Editor.

## Nota

O push depende do Firebase (setup acima) e da conta de serviço. Sem `FCM_SERVICE_ACCOUNT`
o sistema continua funcionando **só com e-mail** — o push é um extra opcional.
