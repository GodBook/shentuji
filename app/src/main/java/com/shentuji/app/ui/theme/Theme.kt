package com.shentuji.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Acid = Color(0xFFD7FF45)
val Coral = Color(0xFFFF7557)
val Ink = Color(0xFFF6F5EF)
val Canvas = Color(0xFF0B0C0E)
val Panel = Color(0xFF18191B)
val Muted = Color(0xFF9D9D97)

private val Scheme = darkColorScheme(
    primary = Acid,
    onPrimary = Color(0xFF15170F),
    secondary = Color(0xFF9D8CFF),
    tertiary = Coral,
    background = Canvas,
    onBackground = Ink,
    surface = Panel,
    onSurface = Ink,
    surfaceVariant = Color(0xFF242528),
    onSurfaceVariant = Muted,
    error = Coral,
)

@Composable
fun ShentujiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, content = content)
}
