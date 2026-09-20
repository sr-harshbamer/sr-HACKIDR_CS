package ai.guardian.defense.notification.repository

import android.content.Context
import android.content.Intent
import ai.guardian.defense.engine.LocalRiskEngine
import ai.guardian.defense.engine.RiskVerdict
import ai.guardian.defense.notification.model.NotificationEvent
import ai.guardian.defense.service.GuardianOverlayService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

/**
 * Repository layer for real-time notification events.
 * Manages in-memory reactive state, deduplication, update tracking,
 * and asynchronous threat evaluation via LocalRiskEngine.
 */
class NotificationRepository private constructor(private val appContext: Context) {

    companion object {
        @Volatile
        private var instance: NotificationRepository? = null

        fun getInstance(context: Context): NotificationRepository {
            return instance ?: synchronized(this) {
                instance ?: NotificationRepository(context.applicationContext).also { instance = it }
            }
        }

        private const val MAX_EVENTS_IN_MEMORY = 100
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    // Reactive StateFlows for UI observation
    private val _isListenerConnected = MutableStateFlow(false)
    val isListenerConnected: StateFlow<Boolean> = _isListenerConnected.asStateFlow()

    private val _recentEvents = MutableStateFlow<List<NotificationEvent>>(emptyList())
    val recentEvents: StateFlow<List<NotificationEvent>> = _recentEvents.asStateFlow()

    private val _eventFlow = MutableSharedFlow<NotificationEvent>(extraBufferCapacity = 64)
    val eventFlow: SharedFlow<NotificationEvent> = _eventFlow.asSharedFlow()

    // Deduplication tracker: Key -> (postTime, contentHash)
    private val seenNotifications = ConcurrentHashMap<String, Pair<Long, Int>>()

    fun setListenerConnected(connected: Boolean) {
        _isListenerConnected.value = connected
    }

    /**
     * Process an incoming notification event off the main thread.
     * Performs deduplication, content change detection, risk triage, and state emission.
     */
    fun onNotificationReceived(event: NotificationEvent) {
        scope.launch {
            val key = event.notificationKey
            val currentHash = event.contentHash()
            val existing = seenNotifications[key]

            // 1. Exact duplicate check: Ignore if identical postTime and identical content
            if (existing != null && existing.first == event.postTime && existing.second == currentHash) {
                return@launch
            }

            val isUpdate = existing != null
            seenNotifications[key] = Pair(event.postTime, currentHash)

            // 2. Perform Scam Triage via LocalRiskEngine
            val combinedText = "${event.title} ${event.text} ${event.subText ?: ""}"
            val verdict = evaluateNotificationThreat(combinedText, event.packageName)

            val evaluatedEvent = event.copy(
                isUpdate = isUpdate,
                riskVerdict = verdict
            )

            // 3. Update reactive list state
            val currentList = _recentEvents.value.toMutableList()
            if (isUpdate) {
                val index = currentList.indexOfFirst { it.notificationKey == key }
                if (index != -1) {
                    currentList[index] = evaluatedEvent
                } else {
                    currentList.add(0, evaluatedEvent)
                }
            } else {
                currentList.add(0, evaluatedEvent)
            }

            if (currentList.size > MAX_EVENTS_IN_MEMORY) {
                _recentEvents.value = currentList.take(MAX_EVENTS_IN_MEMORY)
            } else {
                _recentEvents.value = currentList
            }

            _eventFlow.tryEmit(evaluatedEvent)

            // 4. Trigger High-Priority Overlay if Threat is Critical or High
            if (verdict.riskLevel == "CRITICAL" || verdict.riskLevel == "HIGH") {
                triggerThreatAlert(evaluatedEvent, verdict)
            }
        }
    }

    fun onNotificationRemoved(key: String) {
        scope.launch {
            seenNotifications.remove(key)
        }
    }

    fun clearEvents() {
        _recentEvents.value = emptyList()
        seenNotifications.clear()
    }

    private fun evaluateNotificationThreat(text: String, packageName: String): RiskVerdict {
        val lower = text.lowercase()

        // 1. Check for Phishing URLs embedded in notification body
        val urlMatch = Regex("https?://[\\w.-]+(?:/[^\\s]*)?").find(text)
        if (urlMatch != null) {
            val urlVerdict = LocalRiskEngine.analyzeUrl(urlMatch.value)
            if (urlVerdict.riskLevel != "SAFE") {
                return urlVerdict
            }
        }

        // 2. Check for Urgent OTP Solicitation or Extortion Cues in Notification
        if ((lower.contains("otp") || lower.contains("verification code") || lower.contains("passcode")) &&
            (lower.contains("share") || lower.contains("call") || lower.contains("urgent") || lower.contains("block") || lower.contains("kyc"))
        ) {
            return RiskVerdict(
                riskLevel = "CRITICAL",
                riskScore = 92,
                title = "SUSPICIOUS OTP / SECURITY CODE SOLICITATION",
                reasons = listOf(
                    "Notification attempts to coerce action regarding one-time verification codes.",
                    "Legitimate institutions will never ask you to disclose or forward OTPs."
                ),
                action = "OVERLAY_ALERT"
            )
        }

        // 3. Check for Fake Lottery / Reward Traps
        if ((lower.contains("won") || lower.contains("lottery") || lower.contains("cashback")) &&
            (lower.contains("claim") || lower.contains("transfer") || lower.contains("pay") || lower.contains("click"))
        ) {
            return RiskVerdict(
                riskLevel = "HIGH",
                riskScore = 65,
                title = "DECEPTIVE REWARD / CASHBACK CLAIM",
                reasons = listOf(
                    "Message contains unverified lottery or monetary reward claim requiring user interaction."
                ),
                action = "SHOW_WARNING_BANNER"
            )
        }

        return RiskVerdict(
            riskLevel = "SAFE",
            riskScore = 5,
            title = "Notification Verified Clean",
            reasons = listOf("No scam or phishing indicators found in notification payload."),
            action = "ALLOW"
        )
    }

    private fun triggerThreatAlert(event: NotificationEvent, verdict: RiskVerdict) {
        try {
            val intent = Intent(appContext, GuardianOverlayService::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("EXTRA_TITLE", "MALICIOUS NOTIFICATION DETECTED")
                putExtra("EXTRA_TARGET", "${event.appName}: ${event.title}")
                putExtra("EXTRA_RISK_LEVEL", verdict.riskLevel)
                putStringArrayListExtra("EXTRA_REASONS", ArrayList(verdict.reasons))
            }
            appContext.startService(intent)
        } catch (e: Exception) {
            // Ignored if background service start restriction or missing permission
        }
    }
}
