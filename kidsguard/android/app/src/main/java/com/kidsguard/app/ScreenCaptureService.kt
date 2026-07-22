package com.kidsguard.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
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
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

/**
 * Foreground Service que segura o MediaProjection e, ENQUANTO o Roblox está em
 * primeiro plano, tira 1 screenshot a cada ~5s, roda OCR (ML Kit, offline) e envia
 * o texto do chat para a `ingest` (mesma esteira do YouTube).
 *
 * Privacidade: a imagem é processada e DESCARTADA na hora — nada é guardado. Só sobe
 * para a nuvem o texto que passa no pré-filtro.
 */
class ScreenCaptureService : Service() {

    companion object {
        private const val TAG = "KidsGuard/Capture"
        private const val CHANNEL_ID = "kidsguard_capture"
        private const val NOTIF_ID = 42
        private const val SAMPLE_INTERVAL_MS = 5000L
        private const val ROBLOX_STALE_MS = 15000L   // sem sinal do Roblox por 15s = pausa
        private const val DOWNSCALE = 2               // 1/2 da resolução (economia)

        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"

        // Sinal vindo do AccessibilityService: "o Roblox está ativo agora".
        @Volatile private var lastRobloxPingMs = 0L
        fun pingRobloxForeground() { lastRobloxPingMs = SystemClock.elapsedRealtime() }
        private fun robloxIsForeground(): Boolean =
            SystemClock.elapsedRealtime() - lastRobloxPingMs < ROBLOX_STALE_MS
    }

    private var projection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val handler = Handler(Looper.getMainLooper())
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val recentLines = ArrayDeque<String>()   // dedup das últimas linhas enviadas
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
        width = metrics.widthPixels / DOWNSCALE
        height = metrics.heightPixels / DOWNSCALE
        dpi = metrics.densityDpi

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2)
        virtualDisplay = projection?.createVirtualDisplay(
            "KidsGuardCapture", width, height, dpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader?.surface, null, handler
        )
    }

    private val sampleLoop = object : Runnable {
        override fun run() {
            if (robloxIsForeground()) captureAndOcr()
            handler.postDelayed(this, SAMPLE_INTERVAL_MS)
        }
    }

    private fun captureAndOcr() {
        val image = imageReader?.acquireLatestImage() ?: return
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
                .addOnSuccessListener { result -> handleOcr(result.text) }
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
            // marca como visto (janela de dedup de ~40 linhas)
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
