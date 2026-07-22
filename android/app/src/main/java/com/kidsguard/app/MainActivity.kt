package com.kidsguard.app

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

/**
 * Tela de pareamento + atalho para ativar o monitoramento.
 * O responsável cola a URL do backend e o código do aparelho (device_token),
 * salva, e ativa o serviço de Acessibilidade.
 */
class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val inputBaseUrl = findViewById<EditText>(R.id.inputBaseUrl)
        val inputToken = findViewById<EditText>(R.id.inputDeviceToken)
        val btnSave = findViewById<Button>(R.id.btnSave)
        val btnA11y = findViewById<Button>(R.id.btnOpenAccessibility)
        val statusPairing = findViewById<TextView>(R.id.statusPairing)

        // pré-preenche se já pareado
        Prefs.baseUrl(this)?.let { inputBaseUrl.setText(it) }
        Prefs.token(this)?.let { inputToken.setText(it) }
        if (Prefs.isPaired(this)) statusPairing.setText(R.string.status_paired)

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
