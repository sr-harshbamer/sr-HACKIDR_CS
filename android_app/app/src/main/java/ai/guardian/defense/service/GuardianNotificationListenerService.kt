package ai.guardian.defense.service

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import ai.guardian.defense.notification.filter.NotificationFilterManager
import ai.guardian.defense.notification.parser.NotificationParser
import ai.guardian.defense.notification.repository.NotificationRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Production-ready Android NotificationListenerService for Guardian AI.
 * Receives and processes notification events in near real time, filtering and dispatching
 * them asynchronously to prevent any main thread blockage.
 */
class GuardianNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "GuardianNotifListener"
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private lateinit var parser: NotificationParser
    private lateinit var filterManager: NotificationFilterManager
    private lateinit var repository: NotificationRepository

    override fun onCreate() {
        super.onCreate()
        parser = NotificationParser(applicationContext)
        filterManager = NotificationFilterManager(applicationContext)
        repository = NotificationRepository.getInstance(applicationContext)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        repository.setListenerConnected(true)
        Log.d(TAG, "Notification listener connected successfully")

        // Perform initial synchronization of currently active notifications off the main thread
        serviceScope.launch {
            try {
                val active = activeNotifications
                if (active != null) {
                    for (sbn in active) {
                        val pkg = sbn.packageName ?: continue
                        if (filterManager.shouldProcess(pkg)) {
                            val event = parser.parse(sbn)
                            repository.onNotificationReceived(event)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error synchronizing active notifications on connect", e)
            }
        }
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        repository.setListenerConnected(false)
        Log.d(TAG, "Notification listener disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: return

        // 1. Fast package filtering before parsing or background scheduling
        if (!filterManager.shouldProcess(packageName)) {
            return
        }

        // 2. Offload parsing and scam evaluation immediately to background worker dispatcher
        serviceScope.launch {
            try {
                val event = parser.parse(sbn)
                repository.onNotificationReceived(event)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing incoming notification from $packageName", e)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
        val key = sbn?.key ?: return
        repository.onNotificationRemoved(key)
    }

    override fun onDestroy() {
        super.onDestroy()
        repository.setListenerConnected(false)
        serviceScope.cancel()
    }
}
