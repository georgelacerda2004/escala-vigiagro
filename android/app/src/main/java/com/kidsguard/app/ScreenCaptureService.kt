package com.kidsguard.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Base64
import android.util.DisplayMetrics
import android.util.Log
import java.io.ByteArrayOutputStream
import android.view.WindowManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Foreground Service que segura o MediaProjection e, ENQUANTO o Roblox está em
 * primeiro plano, tira 1 screenshot a cada ~3s, roda OCR (ML Kit, offline) e envia
 * o texto do chat para a `ingest` (mesma esteira do YouTube).
 *
 * Detecção de foreground: usa UsageStatsManager (confiável), pois o Roblox quase não
 * emite eventos de acessibilidade. O "ping" do a11y é mantido como reforço.
 *
 * Privacidade: a imagem é processada e DESCARTADA na hora — nada é guardado. Só sobe
 * para a nuvem o texto que passa no pré-filtro.
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "KidsGuard/Capture"
        private const val CHANNEL_ID = "kidsguard_capture"
        private const val NOTIF_ID = 42
        private const val SAMPLE_INTERVAL_MS = 3000L
        private const val ROBLOX_STALE_MS = 15000L   // reforço via ping do a11y
        private const val VISION_INTERVAL_MS = 60000L // no máx. 1 escalonamento/min (custo)
        private const val WEAK_OCR_CHARS = 15         // OCR "fraco" = provável falha de leitura
        private const val ROBLOX_PKG = "com.roblox.client"

        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"

        // Reforço vindo do AccessibilityService.
        @Volatile private var lastRobloxPingMs = 0L
        fun pingRobloxForeground() { lastRobloxPingMs = SystemClock.elapsedRealtime() }
        private fun pingFresh(): Boolean =
            SystemClock.elapsedRealtime() - lastRobloxPingMs < ROBLOX_STALE_MS
    }

    private var projection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val handler = Handler(Looper.getMainLooper())
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val recentLines = ArrayDeque<String>()   // dedup das últimas linhas enviadas
    private var lastVisionMs = 0L
    private var width = 0
    private var height = 0
    private var dpi = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIF_ID, buildNotification())

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val data = intent?.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
        if (resultCode == 0 || data == null) {
            Log.w(TAG, "Sem permissão de captura; encerrando.")
            stopSelf()
            return START_NOT_STICKY
        }

        val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projection = mpm.getMediaProjection(resultCode, data).also {
            it.registerCallback(object : MediaProjection.Callback() {
                override fun onStop() { cleanup() }
            }, handler)
        }

        setupCapture()
        handler.postDelayed(sampleLoop, SAMPLE_INTERVAL_MS)
        return START_STICKY
    }

    private fun setupCapture() {
        val metrics = DisplayMetrics()
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        @Suppress("DEPRECATION") wm.defaultDisplay.getRealMetrics(metrics)
        // Resolução CHEIA — o texto do chat do Roblox é pequeno; reduzir atrapalha o OCR.
        width = metrics.widthPixels
        height = metrics.heightPixels
        dpi = metrics.densityDpi

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = projection?.createVirtualDisplay(
            "KidsGuardCapture", width, height, dpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, handler
        )
    }

    /** App atualmente em foreground segundo o UsageStats (null se sem permissão/dado). */
    private fun currentForegroundApp(): String? {
        return try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val events = usm.queryEvents(now - 10_000, now)
            var pkg: String? = null
            val e = UsageEvents.Event()
            while (events.hasNextEvent()) {
                events.getNextEvent(e)
                if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) pkg = e.packageName
            }
            pkg
        } catch (_: Exception) { null }
    }

    private fun robloxActive(): Boolean {
        val fg = currentForegroundApp()
        // Se o UsageStats respondeu, ele manda; senão, cai no reforço do ping do a11y.
        val active = if (fg != null) fg == ROBLOX_PKG else pingFresh()
        Log.d(TAG, "tick foreground=${fg ?: "?"} robloxActive=$active")
        return active
    }

    private val sampleLoop = object : Runnable {
        override fun run() {
            if (robloxActive()) captureAndOcr()
            handler.postDelayed(this, SAMPLE_INTERVAL_MS)
        }
    }

    private fun captureAndOcr() {
        val image = imageReader?.acquireLatestImage()
        if (image == null) { Log.d(TAG, "sem frame disponível"); return }
        try {
            val plane = image.planes[0]
            val rowStride = plane.rowStride
            val pixelStride = plane.pixelStride
            val rowPadding = rowStride - pixelStride * width
            val bmp = Bitmap.createBitmap(
                width + rowPadding / pixelStride, height, Bitmap.Config.ARGB_8888
            )
            bmp.copyPixelsFromBuffer(plane.buffer)

            recognizer.process(InputImage.fromBitmap(bmp, 0))
                .addOnSuccessListener { result ->
                    Log.d(TAG, "OCR len=${result.text.length}")
                    handleOcr(result.text)
                    maybeEscalateToVision(result.text, bmp)
                }
                .addOnFailureListener { e -> Log.w(TAG, "OCR falhou: ${e.message}") }
        } catch (e: Exception) {
            Log.w(TAG, "Erro na captura: ${e.message}")
        } finally {
            image.close()
        }
    }

    private fun handleOcr(text: String) {
        if (text.isBlank()) return
        for (raw in text.split("\n")) {
            val line = raw.trim()
            if (line.length < 4) continue
            if (recentLines.contains(line)) continue
            recentLines.addLast(line)
            if (recentLines.size > 40) recentLines.removeFirst()

            if (Prefilter.isSuspicious(line)) {
                Log.d(TAG, "Chat suspeito (OCR): '$line'")
                ApiClient.sendEvent(
                    this, app = "roblox", eventType = "chat", contentText = line,
                )
            }
        }
    }

    /**
     * Reforço por visão: quando o OCR leu POUCO texto (provável chat gráfico que ele
     * não decifra), envia o frame ao Claude-visão. Rate-limit de 1x/min para conter custo.
     */
    private fun maybeEscalateToVision(ocrText: String, bmp: Bitmap) {
        if (ocrText.trim().length >= WEAK_OCR_CHARS) return
        val now = SystemClock.elapsedRealtime()
        if (now - lastVisionMs < VISION_INTERVAL_MS) return
        lastVisionMs = now

        try {
            val out = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, 70, out)
            val base64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            Log.d(TAG, "OCR fraco → escalonando para visão do Claude.")
            ApiClient.sendImage(this, base64, "image/jpeg")
        } catch (e: Exception) {
            Log.w(TAG, "Falha ao preparar imagem: ${e.message}")
        }
    }

    private fun buildNotification(): Notification {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Monitoramento KidsGuard",
                    NotificationManager.IMPORTANCE_LOW)
            )
        }
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("KidsGuard ativo")
            .setContentText("Monitorando o Roblox para a segurança da criança.")
            .setSmallIcon(android.R.drawable.ic_menu_view)
            .setOngoing(true)
            .build()
    }

    private fun cleanup() {
        handler.removeCallbacksAndMessages(null)
        virtualDisplay?.release(); virtualDisplay = null
        imageReader?.close(); imageReader = null
        projection?.stop(); projection = null
    }

    override fun onDestroy() {
        cleanup()
        super.onDestroy()
    }
}
