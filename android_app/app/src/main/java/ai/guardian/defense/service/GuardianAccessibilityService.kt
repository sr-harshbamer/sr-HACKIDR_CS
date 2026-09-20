package ai.guardian.defense.service

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import ai.guardian.defense.engine.LocalRiskEngine
import java.util.regex.Pattern

class GuardianAccessibilityService : AccessibilityService() {

    private val urlPattern = Pattern.compile("https?://[\\w\\.-]+(?:\\.[a-zA-Z]{2,})[\\S]*", Pattern.CASE_INSENSITIVE)
    private val upiPattern = Pattern.compile("upi://pay\\?[\\S]+|[\\w\\.-]+@[a-zA-Z]{2,}", Pattern.CASE_INSENSITIVE)
    private var lastCheckedUrl: String = ""
    private var lastCheckedUpi: String = ""

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val source = rootInActiveWindow ?: return

        // 1. Scan active screen elements for URLs or UPI payment triggers
        findSecuritySensitives(source)
    }

    private fun findSecuritySensitives(node: AccessibilityNodeInfo) {
        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val combined = "$text $contentDesc"

        // Check for URLs
        if (combined.isNotEmpty()) {
            val urlMatcher = urlPattern.matcher(combined)
            if (urlMatcher.find()) {
                val foundUrl = urlMatcher.group()
                if (foundUrl != lastCheckedUrl) {
                    lastCheckedUrl = foundUrl
                    val verdict = LocalRiskEngine.analyzeUrl(foundUrl)
                    if (verdict.riskLevel == "CRITICAL" || verdict.riskLevel == "HIGH") {
                        triggerIntervention(verdict.title, foundUrl, verdict.riskLevel, verdict.reasons)
                    }
                }
            }

            // Check for UPI Handles / Pay intents
            val upiMatcher = upiPattern.matcher(combined)
            if (upiMatcher.find()) {
                val foundUpi = upiMatcher.group()
                if (foundUpi != lastCheckedUpi) {
                    lastCheckedUpi = foundUpi
                    val verdict = LocalRiskEngine.analyzeUpiPayload(foundUpi)
                    if (verdict.riskLevel == "CRITICAL" || verdict.riskLevel == "HIGH") {
                        triggerIntervention(verdict.title, foundUpi, verdict.riskLevel, verdict.reasons)
                    }
                }
            }
        }

        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { findSecuritySensitives(it) }
        }
    }

    private fun triggerIntervention(title: String, target: String, riskLevel: String, reasons: List<String>) {
        val intent = Intent(this, GuardianOverlayService::class.java).apply {
            putExtra("EXTRA_TITLE", title)
            putExtra("EXTRA_TARGET", target)
            putExtra("EXTRA_RISK_LEVEL", riskLevel)
            putStringArrayListExtra("EXTRA_REASONS", ArrayList(reasons))
        }
        startService(intent)
    }

    override fun onInterrupt() {}
}
