package com.kidsguard.app

import android.content.Context

/** Guarda a configuração de pareamento: URL do backend + device token. */
object Prefs {
    private const val FILE = "kidsguard_prefs"
    private const val KEY_BASE_URL = "base_url"
    private const val KEY_TOKEN = "device_token"

    fun save(ctx: Context, baseUrl: String, token: String) {
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit()
            .putString(KEY_BASE_URL, baseUrl.trim().trimEnd('/'))
            .putString(KEY_TOKEN, token.trim())
            .apply()
    }

    fun baseUrl(ctx: Context): String? =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY_BASE_URL, null)

    fun token(ctx: Context): String? =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE).getString(KEY_TOKEN, null)

    fun isPaired(ctx: Context): Boolean =
        !baseUrl(ctx).isNullOrBlank() && !token(ctx).isNullOrBlank()
}
