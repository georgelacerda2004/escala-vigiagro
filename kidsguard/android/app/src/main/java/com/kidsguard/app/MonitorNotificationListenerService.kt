package com.kidsguard.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Canal COMPLEMENTAR ao OCR: lê notificações de apps monitorados (Roblox DMs em
 * segundo plano, e mensagens de WhatsApp/Instagram/Discord/etc.). Só sobe o que passa
 * no pré-filtro. NÃO captura o chat AO VIVO dentro do jogo Roblox (isso é o OCR/visão).
 *
 * Requer o usuário conceder "Acesso a notificações" ao KidsGuard.
 */
class MonitorNotificationListenerService : NotificationListenerService() {

    private val TAG = "KidsGuard/Notif"

    // Apps cujas notificações interessam. Roblox mapeia para "roblox"; o resto, "other".
    private val monitored = mapOf(
        "com.roblox.client" to "roblox",
        "com.whatsapp" to "other",
        "com.instagram.android" to "other",
        "com.discord" to "other",
        "org.telegram.messenger" to "other",
        "com.facebook.orca" to "other",
    )

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val pkg = sbn?.packageName ?: return
        val app = monitored[pkg] ?: return

        // Ignora notificações persistentes (ex.: "Roblox está em execução").
        if (sbn.notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
        val content = listOf(title, text).filter { it.isNotBlank() }.joinToString(": ")
        if (content.isBlank()) return

        if (Prefilter.isSuspicious(content)) {
            Log.d(TAG, "Notificação suspeita ($pkg): '$content'")
            ApiClient.sendEvent(
                this, app = app, eventType = "notification", contentText = content,
            )
        }
    }
}
