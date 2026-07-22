package com.kidsguard.app

import android.accessibilityservice.AccessibilityService
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * Captura, na tela do YouTube, o TÍTULO e o CANAL do vídeo atual e envia ao backend.
 * Também varre comentários visíveis e, se algum texto for suspeito (pré-filtro),
 * envia para classificação da IA.
 *
 * Heurística: os resource-ids do YouTube mudam entre versões, então buscamos por nós
 * cujo id termina em "/title", "/channel_name"/"owner", "/comment". É um ponto de
 * partida real — refinar com os ids da versão instalada (ver README do Android).
 */
class YouTubeAccessibilityService : AccessibilityService() {

    private val TAG = "KidsGuard/A11y"
    private var lastTitle: String? = null
    private var lastSuspicious: String? = null

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        val pkg = event?.packageName?.toString() ?: return
        if (!pkg.startsWith("com.google.android")) return

        val root = rootInActiveWindow ?: return
        try {
            val title = firstTextByIdSuffix(root, listOf("/title", "/video_title"))
            val channel = firstTextByIdSuffix(root, listOf("/channel_name", "/owner", "/channel"))

            // 1) vídeo atual → sempre envia (compõe o resumo diário)
            if (!title.isNullOrBlank() && title != lastTitle) {
                lastTitle = title
                Log.d(TAG, "Vídeo: '$title' — canal: ${channel ?: "?"}")
                ApiClient.sendEvent(
                    this, app = "youtube", eventType = "video",
                    videoTitle = title, channel = channel,
                )
            }

            // 2) comentários/texto suspeito → só sobe o que passa no pré-filtro
            val suspicious = firstSuspiciousText(root)
            if (!suspicious.isNullOrBlank() && suspicious != lastSuspicious) {
                lastSuspicious = suspicious
                Log.d(TAG, "Texto suspeito: '$suspicious'")
                ApiClient.sendEvent(
                    this, app = "youtube", eventType = "comment",
                    contentText = suspicious, videoTitle = title, channel = channel,
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Erro ao ler a tela: ${e.message}")
        } finally {
            root.recycle()
        }
    }

    override fun onInterrupt() {}

    // --- helpers de travessia ---

    private fun firstTextByIdSuffix(root: AccessibilityNodeInfo, suffixes: List<String>): String? {
        val stack = ArrayDeque<AccessibilityNodeInfo>()
        stack.addLast(root)
        var depth = 0
        while (stack.isNotEmpty() && depth < 4000) {
            depth++
            val node = stack.removeLast()
            val id = node.viewIdResourceName
            if (id != null && suffixes.any { id.endsWith(it) }) {
                val text = node.text?.toString()?.trim()
                if (!text.isNullOrBlank()) return text
            }
            for (i in 0 until node.childCount) node.getChild(i)?.let { stack.addLast(it) }
        }
        return null
    }

    private fun firstSuspiciousText(root: AccessibilityNodeInfo): String? {
        val stack = ArrayDeque<AccessibilityNodeInfo>()
        stack.addLast(root)
        var depth = 0
        while (stack.isNotEmpty() && depth < 4000) {
            depth++
            val node = stack.removeLast()
            val text = node.text?.toString()?.trim()
            if (Prefilter.isSuspicious(text)) return text
            for (i in 0 until node.childCount) node.getChild(i)?.let { stack.addLast(it) }
        }
        return null
    }
}
