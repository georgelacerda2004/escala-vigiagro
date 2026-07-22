package com.kidsguard.app

import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Tela de pareamento + atalho para ativar o monitoramento.
 * O responsável cola a URL do backend e o código do aparelho (device_token),
 * salva, e ativa o serviço de Acessibilidade.
 */
class MainActivity : AppCompatActivity() {

    // Recebe o resultado do pedido de captura de tela (MediaProjection).
    private val projectionLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val statusRoblox = findViewById<TextView>(R.id.statusRoblox)
            if (result.resultCode == RESULT_OK && result.data != null) {
                val svc = Intent(this, ScreenCaptureService::class.java).apply {
                    putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, result.resultCode)
                    putExtra(ScreenCaptureService.EXTRA_RESULT_DATA, result.data)
                }
                ContextCompat.startForegroundService(this, svc)
                statusRoblox.setText(R.string.status_roblox_on)
            } else {
                statusRoblox.setText(R.string.status_roblox_denied)
            }
        }

    // Reabre a tela após o scanner salvar URL+token, para refletir nos campos.
    private val scanLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK) recreate()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val inputBaseUrl = findViewById<EditText>(R.id.inputBaseUrl)
        val inputToken = findViewById<EditText>(R.id.inputDeviceToken)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnScanQr = findViewById<Button>(R.id.btnScanQr)
        val btnA11y = findViewById<Button>(R.id.btnOpenAccessibility)
        val btnRoblox = findViewById<Button>(R.id.btnStartRoblox)
        val statusPairing = findViewById<TextView>(R.id.statusPairing)

        // pré-preenche se já pareado
        Prefs.baseUrl(this)?.let { inputBaseUrl.setText(it) }
        Prefs.token(this)?.let { inputToken.setText(it) }
        if (Prefs.isPaired(this)) statusPairing.setText(R.string.status_paired)

        // escanear QR de pareamento (preenche URL + token automaticamente)
        btnScanQr.setOnClickListener {
            scanLauncher.launch(Intent(this, ScanActivity::class.java))
        }

        btnSave.setOnClickListener {
            val url = inputBaseUrl.text.toString().trim()
            val token = inputToken.text.toString().trim()
            if (url.isBlank() || token.isBlank()) {
                Toast.makeText(this, R.string.status_not_paired, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            Prefs.save(this, url, token)
            statusPairing.setText(R.string.status_paired)
            Toast.makeText(this, R.string.status_paired, Toast.LENGTH_SHORT).show()
        }

        // abre as configurações de Acessibilidade para o usuário ligar o serviço
        btnA11y.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        // inicia o monitor do Roblox: pede permissão de captura de tela
        btnRoblox.setOnClickListener {
            if (!Prefs.isPaired(this)) {
                Toast.makeText(this, R.string.status_not_paired, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val mpm = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            projectionLauncher.launch(mpm.createScreenCaptureIntent())
        }
    }

    override fun onResume() {
        super.onResume()
        val statusService = findViewById<TextView>(R.id.statusService)
        statusService.setText(
            if (isAccessibilityEnabled()) R.string.status_service_on
            else R.string.status_service_off
        )
    }

    private fun isAccessibilityEnabled(): Boolean {
        val expected = "$packageName/${YouTubeAccessibilityService::class.java.name}"
        val am = getSystemService(ACCESSIBILITY_SERVICE) as AccessibilityManager
        if (!am.isEnabled) return false
        val enabled = Settings.Secure.getString(
            contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: return false
        val splitter = TextUtils.SimpleStringSplitter(':')
        splitter.setString(enabled)
        while (splitter.hasNext()) {
            if (splitter.next().equals(expected, ignoreCase = true)) return true
        }
        return false
    }
}
