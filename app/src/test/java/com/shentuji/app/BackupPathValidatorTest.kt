package com.shentuji.app

import com.shentuji.app.util.BackupPathValidator
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BackupPathValidatorTest {
    @Test
    fun acceptsOnlySafeImagePaths() {
        assertTrue(BackupPathValidator.isSafeImagePath("images/abc-123.png"))
        assertFalse(BackupPathValidator.isSafeImagePath("images/../../secret.png"))
        assertFalse(BackupPathValidator.isSafeImagePath("images\\secret.png"))
        assertFalse(BackupPathValidator.isSafeImagePath("images/payload.svg"))
    }
}
