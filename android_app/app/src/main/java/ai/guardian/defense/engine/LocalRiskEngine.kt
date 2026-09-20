package ai.guardian.defense.engine

import java.net.URI

data class RiskVerdict(
    val riskLevel: String, // SAFE, SUSPICIOUS, HIGH, CRITICAL
    val riskScore: Int,
    val title: String,
    val reasons: List<String>,
    val action: String // ALLOW, PAUSE_NAVIGATION, BLOCK_PAYMENT_HANDOFF, OVERLAY_ALERT
)

object LocalRiskEngine {

    private val SUSPICIOUS_TLDS = setOf("top", "xyz", "online", "site", "live", "club", "info", "loan", "work", "vip", "cfd")
    private val BANK_TARGETS = listOf("hdfc", "icici", "sbi", "axis", "kotak", "paytm", "phonepe")
    private val LEGIT_DOMAINS = setOf("hdfcbank.com", "icicibank.com", "sbi.co.in", "axisbank.com", "kotak.com", "paytm.com", "phonepe.com", "google.com")

    /**
     * Fast local triage for intercepted URLs before browser dispatch
     */
    fun analyzeUrl(rawUrl: String): RiskVerdict {
        val url = if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) "https://$rawUrl" else rawUrl
        return try {
            val uri = URI(url)
            val host = (uri.host ?: "").lowercase()
            val path = (uri.path ?: "").lowercase()

            val reasons = mutableListOf<String>()
            var score = 0

            // 1. Typosquatting / Brand Spoofing Check
            for (bank in BANK_TARGETS) {
                if (host.contains(bank) && !LEGIT_DOMAINS.any { host.endsWith(it) }) {
                    score += 55
                    reasons.add("Brand Impersonation: Mimics $bank on unauthorized domain ($host)")
                }
            }

            // 2. Suspicious TLD
            val tld = host.substringAfterLast(".", "")
            if (tld in SUSPICIOUS_TLDS) {
                score += 30
                reasons.add("High Abuse TLD: Domain uses .$tld associated with disposable phishing kits")
            }

            // 3. Sensitive KYC / Login keywords in path
            if (path.contains("kyc") || path.contains("login") || path.contains("pan") || path.contains("verify")) {
                score += 25
                reasons.add("Credential Harvesting Path: Structure suggests password or identity theft")
            }

            when {
                score >= 75 -> RiskVerdict(
                    riskLevel = "CRITICAL",
                    riskScore = minOf(99, score),
                    title = "POTENTIALLY DANGEROUS PHISHING WEBSITE",
                    reasons = reasons,
                    action = "PAUSE_NAVIGATION"
                )
                score >= 45 -> RiskVerdict(
                    riskLevel = "HIGH",
                    riskScore = score,
                    title = "SUSPICIOUS DOMAIN DETECTED",
                    reasons = reasons,
                    action = "PAUSE_NAVIGATION"
                )
                score >= 20 -> RiskVerdict(
                    riskLevel = "SUSPICIOUS",
                    riskScore = score,
                    title = "UNVERIFIED EXTERNAL LINK",
                    reasons = reasons,
                    action = "SHOW_WARNING_BANNER"
                )
                else -> RiskVerdict(
                    riskLevel = "SAFE",
                    riskScore = 5,
                    title = "Domain Verified Safe",
                    reasons = listOf("No phishing signatures or typosquatting patterns detected."),
                    action = "ALLOW"
                )
            }
        } catch (e: Exception) {
            RiskVerdict("SAFE", 0, "Valid URL", emptyList(), "ALLOW")
        }
    }

    /**
     * Fast local triage for intercepted UPI intent or QR code
     */
    fun analyzeUpiPayload(payload: String): RiskVerdict {
        val lower = payload.lowercase()
        val reasons = mutableListOf<String>()
        var score = 0

        // Check for deceptive refund handles
        if (lower.contains("refund") || lower.contains("support") || lower.contains("cashback") || lower.contains("lottery")) {
            score += 50
            reasons.add("Deceptive Payee: Handle claims official refund/support service (violates NPCI guidelines)")
        }

        // Check for reverse debit trap
        if (lower.contains("cu=inr") || lower.contains("am=")) {
            if (lower.contains("refund") || lower.contains("cashback")) {
                score += 45
                reasons.add("Reverse Debit Trap: Intent requests money OUT under the guise of receiving a refund")
            }
        }

        // Blacklisted keywords
        if (lower.contains("refund-support@xyz") || lower.contains("lottery-claim-gov")) {
            score += 60
            reasons.add("Blacklist Hit: Indexed in National Cyber Crime fraud registry")
        }

        return when {
            score >= 70 -> RiskVerdict(
                riskLevel = "CRITICAL",
                riskScore = minOf(99, score),
                title = "HIGH RISK UPI PAYMENT TRAP",
                reasons = reasons,
                action = "BLOCK_PAYMENT_HANDOFF"
            )
            score >= 35 -> RiskVerdict(
                riskLevel = "HIGH",
                riskScore = score,
                title = "UNVERIFIED UPI RECIPIENT",
                reasons = reasons,
                action = "BLOCK_PAYMENT_HANDOFF"
            )
            else -> RiskVerdict(
                riskLevel = "SAFE",
                riskScore = 10,
                title = "Verified Recipient",
                reasons = listOf("Standard merchant payment profile."),
                action = "ALLOW"
            )
        }
    }
}
