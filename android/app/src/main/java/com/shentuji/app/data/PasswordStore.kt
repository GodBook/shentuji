package com.shentuji.app.data

import android.content.Context
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class PasswordStore(context: Context) {
    private val preferences = context.getSharedPreferences("vault_lock", Context.MODE_PRIVATE)

    val isConfigured: Boolean get() = preferences.contains(KeyHash)

    fun configure(password: CharArray) {
        require(password.size >= 10) { "密码至少需要 10 个字符" }
        check(!isConfigured) { "密码已经设置" }
        val salt = ByteArray(24).also(SecureRandom()::nextBytes)
        val hash = derive(password, salt)
        preferences.edit()
            .putString(KeySalt, Base64.getEncoder().encodeToString(salt))
            .putString(KeyHash, Base64.getEncoder().encodeToString(hash))
            .apply()
        password.fill('\u0000')
    }

    fun verify(password: CharArray): Boolean {
        val salt = preferences.getString(KeySalt, null)?.let(Base64.getDecoder()::decode) ?: return false
        val expected = preferences.getString(KeyHash, null)?.let(Base64.getDecoder()::decode) ?: return false
        val actual = derive(password, salt)
        password.fill('\u0000')
        return MessageDigest.isEqual(expected, actual)
    }

    private fun derive(password: CharArray, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password, salt, Iterations, 256)
        return try {
            SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded
        } finally {
            spec.clearPassword()
        }
    }

    private companion object {
        const val KeySalt = "salt"
        const val KeyHash = "hash"
        const val Iterations = 210_000
    }
}
