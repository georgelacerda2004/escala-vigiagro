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

        // Roblox: não dá para ler o chat pelos nós (é desenhado pelo motor do jogo).
        // Aqui só sinalizamos que o Roblox está em primeiro plano, para o
        // ScreenCaptureService amostrar a tela + OCR enquanto ele estiver ativo.
        if (pkg == "com.roblox.client") {
            ScreenCaptureService.pingRobloxForeground()
            return
        }

        if (!pkg.startsWith("com.google.android")) return

        val root = rootInActiveWindow ?: return
        try {
            val title = firstTextByIdSuffix(root, listOf("/title", "/video_title"))
            val channel = findChannel(root, skipText = title)

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

    /**
     * Busca texto por sufixo de resource ID.
     * Fallback: se não achar por ID, busca nós com texto significativo (>= 5 chars)
     * que pareçam título (prioridade: texto grande nas primeiras camadas).
     */
    private fun firstTextByIdSuffix(root: AccessibilityNodeInfo, suffixes: List<String>, skipText: String? = null): String? {
        // 1) Tenta pelo ID exato
        val exactId = findExactViewId(root, "com.google.android.youtube:id/title")
        if (!exactId.isNullOrBlank() && exactId != skipText) return exactId

        // 2) Tenta por sufixo
        val bySuffix = searchBySuffix(root, suffixes)
        if (!bySuffix.isNullOrBlank() && bySuffix != skipText) return bySuffix

        // 3) Fallback: primeiro texto grande ignorando o já encontrado
        return findLikelyTitle(root, skipText)
    }

    /** Busca canal: prefere texto começando com @. */
    private fun findChannel(root: AccessibilityNodeInfo, skipText: String?): String? {
        // 1) Tenta por sufixo de ID de canal
        val bySuffix = searchBySuffix(root, listOf("/channel_name", "/owner", "/channel", "/avatar", "/user"))
        if (!bySuffix.isNullOrBlank() && bySuffix != skipText) return bySuffix

        // 2) Tenta achar '@username'
        val atUser = findFirstTextStartingWith(root, "@")
        if (!atUser.isNullOrBlank()) return atUser

        // 3) Fallback genérico ignorando o título
        return findLikelyTitle(root, skipText)
    }

    private fun findFirstTextStartingWith(root: AccessibilityNodeInfo, prefix: String): String? {
        val stack = ArrayDeque<AccessibilityNodeInfo>()
        stack.addLast(root)
        var depth = 0
        while (stack.isNotEmpty() && depth < 4000) {
            depth++
            val node = stack.removeLast()
            val text = node.text?.toString()?.trim() ?: ""
            if (text.startsWith(prefix)) return text
            for (i in 0 until node.childCount) node.getChild(i)?.let { stack.addLast(it) }
        }
        return null
    }

    private fun findExactViewId(root: AccessibilityNodeInfo, targetId: String): String? {
        val stack = ArrayDeque<AccessibilityNodeInfo>()
        stack.addLast(root)
        var depth = 0
        while (stack.isNotEmpty() && depth < 4000) {
            depth++
            val node = stack.removeLast()
            val id = node.viewIdResourceName
            if (id == targetId) {
                val text = node.text?.toString()?.trim()
                if (!text.isNullOrBlank()) return text
            }
            for (i in 0 until node.childCount) node.getChild(i)?.let { stack.addLast(it) }
        }
        return null
    }

    private fun searchBySuffix(root: AccessibilityNodeInfo, suffixes: List<String>): String? {
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

    /** Fallback: acha o primeiro texto com >= 8 chars que não pareça botão/menu/label. */
    private fun findLikelyTitle(root: AccessibilityNodeInfo, skipText: String? = null): String? {
        // Labels de interface que NUNCA devem ser confundidas com título de vídeo
        val skipLabels = setOf(
            "inscrições", "subscriptions", "shorts", "youtube", "início", "home",
            "em alta", "trending", "biblioteca", "library", "explorar", "explore",
            "inscrever", "subscribe", "compartilhar", "share", "curtir", "like",
            "comentários", "comments", "salvar", "save", "playlist",
        )
        val candidates = mutableListOf<Pair<String, Int>>() // text, depth
        val stack = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        stack.addLast(root to 0)
        while (stack.isNotEmpty()) {
            val (node, depth) = stack.removeLast()
            if (depth > 200) break
            val text = node.text?.toString()?.trim()
            if (!text.isNullOrBlank() && text.length >= 8 && text != skipText
                && !skipLabels.contains(text.lowercase())) {
                val id = node.viewIdResourceName
                val className = node.className?.toString()?.lowercase() ?: ""
                // Ignora botões, labels de navegação, search bars, etc.
                val skipClasses = listOf("button", "imagebutton", "checkbox", "switch", "appcompat")
                val skipIds = listOf("search", "menu", "tab", "button", "action_bar", "top_bar")
                val isSkip = skipClasses.any { className.contains(it) } ||
                    (id != null && skipIds.any { id.lowercase().contains(it) })
                if (!isSkip) {
                    candidates.add(text to depth)
                }
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { stack.addLast(it to depth + 1) }
            }
        }
        // Retorna o texto MAIS RASO (menor profundidade) = mais provável título
        candidates.sortBy { it.second }
        return candidates.firstOrNull()?.first
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
