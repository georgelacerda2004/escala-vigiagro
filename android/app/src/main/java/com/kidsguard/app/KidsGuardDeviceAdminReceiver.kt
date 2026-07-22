package com.kidsguard.app

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

/**
 * Administrador do dispositivo. Enquanto ativo, o KidsGuard não pode ser desinstalado
 * sem desativar o admin — dificulta a criança remover o monitoramento.
 * (Uso legítimo de controle parental; a ativação é transparente e feita pelo responsável.)
 */
class KidsGuardDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Desativar o KidsGuard removerá a proteção e o monitoramento do seu filho."
    }
}
