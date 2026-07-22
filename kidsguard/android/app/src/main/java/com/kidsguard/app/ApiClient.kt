package com.kidsguard.app

import android.content.Context
import android.util.Log
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

/** Envia eventos capturados para a Edge Function `ingest` do Supabase. */
object ApiClient {
    private const val TAG = "KidsGuard/Api"
    private val JSON = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient()

    /**
     * Posta um único evento. Campos seguem o contrato de `ingest/index.ts`:
     * app, event_type, content_text, video_id, video_title, channel, url.
     */
    fun sendEvent(
        ctx: Context,
        app: String,
        eventType: String,
        videoTitle: String? = null,
        channel: String? = null,
        contentText: String? = null,
        videoId: String? = null,
        url: String? = null,
    ) {
        val baseUrl = Prefs.baseUrl(ctx)
        val token = Prefs.token(ctx)
        if (baseUrl.isNullOrBlank() || token.isNullOrBlank()) {
            Log.w(TAG, "Não pareado; evento descartado.")
            return
        }

        val event = JSONObject().apply {
            put("app", app)
            put("event_type", eventType)
            videoTitle?.let { put("video_title", it) }
            channel?.let { put("channel", it) }
            contentText?.let { put("content_text", it) }
            videoId?.let { put("video_id", it) }
            url?.let { put("url", it) }
        }
        val body = JSONObject().put("events", JSONArray().put(event))

        val req = Request.Builder()
            .url("$baseUrl/functions/v1/ingest")
            .header("content-type", "application/json")
            .header("x-device-token", token)
            .post(body.toString().toRequestBody(JSON))
            .build()

        http.newCall(req).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.w(TAG, "Falha ao enviar evento: ${e.message}")
            }
            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!it.isSuccessful) Log.w(TAG, "ingest HTTP ${it.code}: ${it.body?.string()}")
                    else Log.d(TAG, "Evento enviado ($app/$eventType).")
                }
            }
        })
    }
}
