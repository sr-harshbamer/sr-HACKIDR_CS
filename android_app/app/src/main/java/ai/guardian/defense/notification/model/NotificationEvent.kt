package ai.guardian.defense.notification.model

import ai.guardian.defense.engine.RiskVerdict

/**
 * Normalized internal data model for parsed Android StatusBarNotifications.
 * Contains only fields required for real-time scam triage and security visualization.
 */
data class NotificationEvent(
    val id: String,
    val notificationKey: String,
    val packageName: String,
    val appName: String,
    val title: String,
    val text: String,
    val subText: String? = null,
    val summaryText: String? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val postTime: Long = 0L,
    val notificationId: Int = 0,
    val tag: String? = null,
    val channelId: String? = null,
    val category: String? = null,
    val isOngoing: Boolean = false,
    val isClearable: Boolean = true,
    val isUpdate: Boolean = false,
    val riskVerdict: RiskVerdict? = null
) {
    /**
     * Compute a content hash to determine if an updated notification's user-visible
     * text has actually changed.
     */
    fun contentHash(): Int {
        var result = packageName.hashCode()
        result = 31 * result + title.hashCode()
        result = 31 * result + text.hashCode()
        result = 31 * result + (subText?.hashCode() ?: 0)
        return result
    }
}
