package com.kidsguard.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import org.json.JSONObject
import java.util.concurrent.Executors

/**
 * Lê um QR de pareamento gerado no painel: JSON {"url":"...","token":"..."}.
 * Ao ler, salva em Prefs e retorna. É a alternativa a digitar o token à mão.
 */
class ScanActivity : AppCompatActivity() {

    private val TAG = "KidsGuard/Scan"
    private val analysisExecutor = Executors.newSingleThreadExecutor()
    private val scanner = BarcodeScanning.getClient()
    @Volatile private var handled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val preview = PreviewView(this)
        setContentView(preview)

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)
        } else {
            startCamera(preview)
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
            startCamera(findViewById<android.view.View>(android.R.id.content) as? PreviewView
                ?: PreviewView(this).also { setContentView(it) })
        } else {
            Toast.makeText(this, "Sem permissão de câmera", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun startCamera(previewView: PreviewView) {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            val provider = future.get()
            val preview = Preview.Builder().build().also {
                it.setSurfaceProvider(previewView.surfaceProvider)
            }
            val analysis = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
            analysis.setAnalyzer(analysisExecutor) { proxy -> analyze(proxy) }

            provider.unbindAll()
            provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, analysis)
        }, ContextCompat.getMainExecutor(this))
    }

    @androidx.camera.core.ExperimentalGetImage
    private fun analyze(proxy: androidx.camera.core.ImageProxy) {
        val media = proxy.image
        if (media == null || handled) { proxy.close(); return }
        val image = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { codes ->
                codes.firstOrNull { it.valueType == Barcode.TYPE_TEXT || it.rawValue != null }
                    ?.rawValue?.let { onQr(it) }
            }
            .addOnCompleteListener { proxy.close() }
    }

    private fun onQr(raw: String) {
        if (handled) return
        try {
            val obj = JSONObject(raw)
            val url = obj.getString("url")
            val token = obj.getString("token")
            handled = true
            Prefs.save(this, url, token)
            runOnUiThread {
                Toast.makeText(this, "Pareado! ✅", Toast.LENGTH_SHORT).show()
                setResult(RESULT_OK)
                finish()
            }
        } catch (e: Exception) {
            Log.w(TAG, "QR inválido: ${e.message}")
        }
    }

    override fun onDestroy() {
        analysisExecutor.shutdown()
        super.onDestroy()
    }
}
