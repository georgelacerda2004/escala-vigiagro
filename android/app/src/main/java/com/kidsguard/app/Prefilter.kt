package com.kidsguard.app

/**
 * Pré-filtro on-device: decide se um texto merece ser enviado ao backend.
 * Reduz custo de IA e volume de dados. Espelha a lista do backend (_shared/supabase.ts).
 *
 * Observação: para o YouTube, mandamos SEMPRE o evento de vídeo (título/canal) para
 * compor o resumo diário — o pré-filtro aqui é usado para chat/comentários/notificações,
 * onde só o suspeito precisa subir.
 */
object Prefilter {
    private val HINT_TERMS = listOf(
        "foto", "nudes", "pelado", "pelada", "sexo", "sexy", "namorad", "encontr",
        "endereço", "onde você mora", "quantos anos", "idade", "whatsapp", "telefone",
        "segredo", "não conta", "nao conta", "burro", "idiota", "morre", "se mata",
        "matar", "arma", "droga", "maconha", "discord", "manda no pv", "chama no",
    )

    fun isSuspicious(text: String?): Boolean {
        if (text.isNullOrBlank()) return false
        val t = text.lowercase()
        return HINT_TERMS.any { t.contains(it) }
    }
}
