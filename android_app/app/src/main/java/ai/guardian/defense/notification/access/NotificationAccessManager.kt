package ai.guardian.defense.notification.access

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import ai.guardian.defense.service.GuardianNotificationListenerService

/**
 * Helper to check and request Android Notification Listener access permissions.
 */
object NotificationAccessManager {

    /**
     * Check if Notification Listener access has been explicitly granted by the user.
     */
    fun isNotificationAccessGranted(context: Context): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        if (!flat.isNullOrEmpty()) {
            val names = flat.split(":")
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && cn.packageName == packageName) {
                    return true
                }
            }
        }
        return false
    }

    /**
     * Safely launch Android Notification Access Settings screen.
     */
    fun openNotificationAccessSettings(context: Context): Boolean {
        return try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            try {
                // Fallback to general settings if listener settings action is unsupported on device
                val fallbackIntent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                context.startActivity(fallbackIntent)
                true
            } catch (e2: Exception) {
                false
            }
        }
    }
}
