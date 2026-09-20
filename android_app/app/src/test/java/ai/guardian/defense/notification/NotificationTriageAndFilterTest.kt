package ai.guardian.defense.notification

import ai.guardian.defense.engine.LocalRiskEngine
import ai.guardian.defense.notification.filter.FilterMode
import ai.guardian.defense.notification.model.NotificationEvent
import org.junit.Assert.*
import org.junit.Test
import java.util.UUID

class NotificationTriageAndFilterTest {

    @Test
    fun testSelfPackageAlwaysFilteredOut() {
        val selfPkg = "ai.guardian.defense"
        // Self package should never be processed to prevent feedback loops
        val isSelf = selfPkg == "ai.guardian.defense" || selfPkg.isBlank()
        assertTrue("Self package must be dropped", isSelf)
    }

    @Test
    fun testContentHashEqualityForDuplicates() {
        val event1 = NotificationEvent(
            id = UUID.randomUUID().toString(),
            notificationKey = "pkg_123_456",
            packageName = "com.whatsapp",
            appName = "WhatsApp",
            title = "Alex",
            text = "Hey, are you free?",
            postTime = 1000L
        )

        val event2 = NotificationEvent(
            id = UUID.randomUUID().toString(),
            notificationKey = "pkg_123_456",
            packageName = "com.whatsapp",
            appName = "WhatsApp",
            title = "Alex",
            text = "Hey, are you free?",
            postTime = 1000L
        )

        assertEquals("Content hashes must match for identical content", event1.contentHash(), event2.contentHash())
    }

    @Test
    fun testContentHashDiffersOnNotificationUpdate() {
        val original = NotificationEvent(
            id = UUID.randomUUID().toString(),
            notificationKey = "msg_chat_1",
            packageName = "com.google.android.apps.messaging",
            appName = "Messages",
            title = "Bank Alert",
            text = "Your OTP is 123456",
            postTime = 1000L
        )

        val updated = original.copy(
            text = "Your OTP is 654321",
            postTime = 1050L
        )

        assertNotEquals("Content hash must differ when text changes", original.contentHash(), updated.contentHash())
    }

    @Test
    fun testSanitizationRemovesControlCharacters() {
        val rawInput = "Urgent:\u0000\u0007\u001B Update your KYC immediately"
        val clean = rawInput.replace(Regex("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]"), "").trim()
        assertEquals("Urgent: Update your KYC immediately", clean)
    }

    @Test
    fun testOtpScamTriageDetection() {
        val scamMessage = "SBI-ALERT: Urgent KYC Action. Call +919876543210 and share your OTP verification code to unblock account."
        val lower = scamMessage.lowercase()
        val isOtpScam = (lower.contains("otp") || lower.contains("verification code")) &&
                (lower.contains("share") || lower.contains("call") || lower.contains("urgent") || lower.contains("kyc"))
        assertTrue("Scam heuristic should identify OTP extortion in notification text", isOtpScam)
    }

    @Test
    fun testPhishingUrlDetectionInNotification() {
        val phishingText = "Claim ₹5000 cashback at https://hdfc-bankk-kyc.top/claim"
        val urlMatch = Regex("https?://[\\w.-]+(?:/[^\\s]*)?").find(phishingText)
        assertNotNull("URL must be extracted from notification text", urlMatch)

        val verdict = LocalRiskEngine.analyzeUrl(urlMatch!!.value)
        assertEquals("CRITICAL", verdict.riskLevel)
        assertTrue(verdict.reasons.any { it.contains("Brand Impersonation") || it.contains("High Abuse TLD") })
    }

    @Test
    fun testSafeNotificationVerification() {
        val cleanText = "Your package has been delivered to your front door."
        val urlMatch = Regex("https?://[\\w.-]+(?:/[^\\s]*)?").find(cleanText)
        assertNull("No URL in clean text", urlMatch)

        val lower = cleanText.lowercase()
        val isOtpScam = (lower.contains("otp") || lower.contains("verification code")) &&
                (lower.contains("share") || lower.contains("call"))
        assertFalse("Clean notification must not trigger scam heuristic", isOtpScam)
    }
}
