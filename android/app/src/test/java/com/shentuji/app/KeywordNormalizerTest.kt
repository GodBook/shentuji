package com.shentuji.app

import com.shentuji.app.util.KeywordNormalizer
import org.junit.Assert.assertEquals
import org.junit.Test

class KeywordNormalizerTest {
    @Test
    fun trimsFoldsCaseAndDeduplicates() {
        assertEquals(
            listOf("Cat" to "cat", "猫猫" to "猫猫"),
            KeywordNormalizer.normalizeAll(listOf(" Cat ", "cat", "猫猫")),
        )
    }

    @Test
    fun parsesChineseCommaAndNewline() {
        assertEquals(
            listOf("沙雕", "猫猫", "聊天表情"),
            KeywordNormalizer.parse("沙雕，猫猫\n聊天表情"),
        )
    }
}
