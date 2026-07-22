package com.kidsguard.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

/**
 * Após reiniciar o aparelho:
 * - O monitor do YouTube (AccessibilityService) volta sozinho (o sistema religa).
 * - O monitor do Roblox (captura de tela) NÃO pode voltar sozinho — o Android exige
 *   novo consentimento de captura. Então avisamos o responsável para reabrir o app.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!Prefs.isPaired(context)) return

        val ch = "kidsguard_boot"
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(ch, "KidsGuard", NotificationManager.IMPORTANCE_DEFAULT)
            )
        }
        val pi = PendingIntent.getActivity(
            context, 0, Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n = NotificationCompat.Builder(context, ch)
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("KidsGuard")
            .setContentText("Toque para retomar o monitor do Roblox após reiniciar.")
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        nm.notify(7, n)
    }
}
