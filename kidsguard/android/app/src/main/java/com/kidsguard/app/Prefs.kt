package com.kidsguard.app

import android.content.Context

/** Guarda a configuração de pareamento: URL do backend + device token. */
object Prefs {
    private const val FILE = "kidsguard_prefs"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_TOKEN = "device_token"
    private const val KEY_CONSENT = "parental_consent"

    fun save(ctx: Context, baseUrl: String, token: String) {
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit()
            .putString(KEY_BASE_URL, baseUrl.trim().trimEnd('/'))
            .putString(KEY_TOKEN, token.trim())
            .apply()
    }

    /** O responsável marcou o consentimento (é o responsável e autoriza o monitoramento)? */
    fun hasConsent(ctx: Context): Boolean =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).getBoolean(KEY_CONSENT, false)

    fun setConsent(ctx: Context, value: Boolean) {
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit()
            .putBoolean(KEY_CONSENT, value)
            .apply()
    }

    fun baseUrl(ctx: Context): String? =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY_BASE_URL, null)

    fun token(ctx: Context): String? =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY_TOKEN, null)

    fun isPaired(ctx: Context): Boolean =
        !baseUrl(ctx).isNullOrBlank() && !token(ctx).isNullOrBlank()
}
