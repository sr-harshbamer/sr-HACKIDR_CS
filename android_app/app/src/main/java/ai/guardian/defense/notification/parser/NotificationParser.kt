package ai.guardian.defense.notification.parser

import android.app.Notification
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.service.notification.StatusBarNotification
import ai.guardian.defense.notification.model.NotificationEvent
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Production-grade parser for Android StatusBarNotification objects.
 * Safely extracts textual metadata across diverse Android API levels (API 26+)
 * and handles messaging, inbox, big text, and custom notification templates.
 */
class NotificationParser(private val context: Context) {

    private val packageManager: PackageManager = context.packageManager
    private val appNameCache = ConcurrentHashMap<String, String>()

    /**
     * Parse a StatusBarNotification into a normalized NotificationEvent.
     * Guaranteed to never throw an unhandled exception or crash the caller.
     */
    fun parse(sbn: StatusBarNotification): NotificationEvent {
        val packageName = sbn.packageName ?: "unknown.package"
        val notification = sbn.notification
        val extras: Bundle? = notification?.extras

        // 1. Resolve readable application name (cached)
        val appName = resolveAppName(packageName)

        // 2. Extract title safely
        val title = extractTitle(extras)

        // 3. Extract body text (handles BigText, InboxStyle, MessagingStyle)
        val text = extractBodyText(extras)

        // 4. Extract subtext / summary
        val subText = extractSubText(extras)
        val summaryText = extras?.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()?.trim()

        // 5. Extract category & channel
        val category = notification?.category
        val channelId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            notification?.channelId
        } else {
            null
        }

        // 6. Flags & timing
        val flags = notification?.flags ?: 0
        val isOngoing = (flags and Notification.FLAG_ONGOING_EVENT) != 0 || (flags and Notification.FLAG_FOREGROUND_SERVICE) != 0
        val isClearable = (flags and Notification.FLAG_NO_CLEAR) == 0 && (flags and Notification.FLAG_ONGOING_EVENT) == 0

        val notificationKey = sbn.key ?: "${packageName}_${sbn.id}_${sbn.postTime}"

        return NotificationEvent(
            id = UUID.randomUUID().toString(),
            notificationKey = notificationKey,
            packageName = packageName,
            appName = appName,
            title = sanitize(title, maxLength = 256),
            text = sanitize(text, maxLength = 2048),
            subText = subText?.let { sanitize(it, maxLength = 256) },
            summaryText = summaryText?.let { sanitize(it, maxLength = 256) },
            timestamp = System.currentTimeMillis(),
            postTime = sbn.postTime,
            notificationId = sbn.id,
            tag = sbn.tag,
            channelId = channelId,
            category = category,
            isOngoing = isOngoing,
            isClearable = isClearable
        )
    }

    private fun resolveAppName(packageName: String): String {
        return appNameCache.getOrPut(packageName) {
            try {
                val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    packageManager.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
                } else {
                    @Suppress("DEPRECATION")
                    packageManager.getApplicationInfo(packageName, 0)
                }
                packageManager.getApplicationLabel(appInfo).toString()
            } catch (e: Exception) {
                packageName.substringAfterLast('.')
            }
        }
    }

    private fun extractTitle(extras: Bundle?): String {
        if (extras == null) return ""

        // Try standard title
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        if (!title.isNullOrBlank()) return title.trim()

        // Try big title
        val bigTitle = extras.getCharSequence(Notification.EXTRA_TITLE_BIG)?.toString()
        if (!bigTitle.isNullOrBlank()) return bigTitle.trim()

        // Try conversation title
        val convTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()
        if (!convTitle.isNullOrBlank()) return convTitle.trim()

        return ""
    }

    private fun extractBodyText(extras: Bundle?): String {
        if (extras == null) return ""

        // 1. Try Big Text (expanded notification content)
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        if (!bigText.isNullOrBlank()) return bigText.trim()

        // 2. Try Standard Notification Text
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        if (!text.isNullOrBlank()) return text.trim()

        // 3. Try InboxStyle Text Lines (e.g. multi-line emails or chat batches)
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (!textLines.isNullOrEmpty()) {
            val combinedLines = textLines.filterNotNull().joinToString("\n") { it.toString().trim() }
            if (combinedLines.isNotBlank()) return combinedLines
        }

        // 4. Try Info Text
        val infoText = extras.getCharSequence(Notification.EXTRA_INFO_TEXT)?.toString()
        if (!infoText.isNullOrBlank()) return infoText.trim()

        // 5. Try Summary Text
        val summary = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()
        if (!summary.isNullOrBlank()) return summary.trim()

        return ""
    }

    private fun extractSubText(extras: Bundle?): String? {
        if (extras == null) return null
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()
        return if (!subText.isNullOrBlank()) subText.trim() else null
    }

    /**
     * Sanitize input: Strip control characters and clamp length to prevent memory abuse
     * or malicious format payloads.
     */
    private fun sanitize(input: String, maxLength: Int): String {
        if (input.isEmpty()) return ""
        val clean = input.replace(Regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]"), "").trim()
        return if (clean.length > maxLength) clean.substring(0, maxLength) else clean
    }
}
