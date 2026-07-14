package com.shentuji.app.util

import java.text.Normalizer
import java.util.Locale

object KeywordNormalizer {
    const val MaxLength = 32
    const val MaxPerImage = 30

    fun displayName(raw: String): String = Normalizer.normalize(raw, Normalizer.Form.NFKC)
        .trim()
        .replace(Regex("\\s+"), " ")

    fun normalized(raw: String): String = displayName(raw).lowercase(Locale.US)

    fun normalizeAll(values: Iterable<String>): List<Pair<String, String>> {
        val seen = mutableSetOf<String>()
        return values.mapNotNull { raw ->
            val name = displayName(raw)
            val key = normalized(raw)
            if (name.isBlank() || name.length > MaxLength || !seen.add(key)) null else name to key
        }.take(MaxPerImage)
    }

    fun parse(raw: String): List<String> = normalizeAll(raw.split(Regex("[,，\\n]")))
        .map { it.first }
}
