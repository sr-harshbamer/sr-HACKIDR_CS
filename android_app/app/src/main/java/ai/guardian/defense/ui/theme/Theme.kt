package ai.guardian.defense.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Slate950 = Color(0xFF020617)
val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Emerald500 = Color(0xFF10B981)
val Emerald600 = Color(0xFF059669)
val Cyan400 = Color(0xFF22D3EE)
val Rose500 = Color(0xFFF43F5E)

private val DarkColorScheme = darkColorScheme(
    primary = Emerald500,
    secondary = Cyan400,
    background = Slate950,
    surface = Slate900,
    onPrimary = Color.White,
    onSecondary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
)

@Composable
fun GuardianTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
