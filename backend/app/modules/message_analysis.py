"""
Message analysis.

Detects red flags commonly found in phishing, OTP scams, impersonation attempts,
and social-engineering SMS/chat messages. Each detected pattern becomes a
`Signal` with the exact snippet(s) that triggered it — no hand-wavy output.
"""
from __future__ import annotations

import re
from typing import List, Tuple

from .schemas import Severity, Signal, ThreatCategory


# ---- Pattern banks ----------------------------------------------------------
# Phrases deliberately cover both English and Indonesian fraud patterns since
# Veridra is aimed at ordinary users in mixed-language environments.

URGENCY_PATTERNS = [
    r"\bact now\b", r"\bimmediately\b", r"\bwithin\s+\d+\s*(minutes?|hours?)\b",
    r"\bfinal warning\b", r"\bexpires?\s+(today|soon|in)\b",
    r"\burgent\b", r"\blast chance\b", r"\bsuspended?\b",
    r"\bblocked?\b.*\baccount\b", r"\bverify (now|immediately)\b",
    r"\bsegera\b", r"\bdalam\s+\d+\s*(menit|jam)\b", r"\bterakhir\b",
]

CREDENTIAL_REQUEST_PATTERNS = [
    r"\botp\b", r"\bone[- ]time password\b", r"\bverification code\b",
    r"\bkode (otp|verifikasi)\b",
    r"\bpassword\b", r"\bkata sandi\b", r"\bpin\b",
    r"\bcvv\b", r"\bcard number\b", r"\bnomor kartu\b",
    r"\bconfirm.*(account|identity|kyc)\b",
    r"\bshare.*(code|otp|pin)\b", r"\bkirim.*(otp|kode|pin)\b",
]

IMPERSONATION_PATTERNS = [
    r"\b(bank|bca|bri|mandiri|bni|cimb)\b", r"\bpaypal\b", r"\bapple\b",
    r"\bmicrosoft\b", r"\bgoogle\b", r"\bnetflix\b", r"\bamazon\b",
    r"\bdhl\b", r"\bfedex\b", r"\bups\b", r"\bpos indonesia\b", r"\bjnt\b|\bj&t\b",
    r"\bshopee\b", r"\btokopedia\b", r"\bgojek\b", r"\bgrab\b",
    r"\birs\b", r"\bhmrc\b", r"\bdjp\b", r"\btax (office|authority)\b",
]

REWARD_BAIT_PATTERNS = [
    r"\byou.?ve won\b", r"\bcongratulations\b", r"\bselamat.*menang\b",
    r"\bfree\s+(gift|prize|iphone|voucher)\b", r"\bhadiah\b",
    r"\bclaim.*(prize|reward|gift|bonus)\b", r"\bclaim now\b",
    r"\blottery\b", r"\bundian\b",
]

FINANCIAL_FRAUD_PATTERNS = [
    r"\btransfer\s+(rp|idr|usd|\$)\s?[\d,.]+", r"\bwire transfer\b",
    r"\bpay.*(fee|biaya|admin)\b", r"\bdeposit.*(first|dulu|upfront)\b",
    r"\binheritance\b", r"\bwarisan\b", r"\btax refund\b",
    r"\binvestment.*guaranteed\b", r"\bguaranteed (return|profit)\b",
    r"\bdouble your money\b", r"\buang.*kembali.*dua kali\b",
]

THREAT_PATTERNS = [
    r"\byour account will be (closed|deleted|terminated)\b",
    r"\blegal action\b", r"\btuntutan hukum\b",
    r"\bfine\b.*\b(if|unless)\b", r"\bpolice\b.*\b(report|case)\b",
]


def _find_matches(text: str, patterns: List[str]) -> List[str]:
    """Return the exact phrases matched by any of the given patterns."""
    hits: List[str] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            snippet = match.group(0).strip()
            if snippet and snippet.lower() not in [h.lower() for h in hits]:
                hits.append(snippet)
    return hits


def analyze_message(text: str) -> Tuple[List[Signal], ThreatCategory]:
    """
    Run all message-level checks and return detected signals plus the most
    likely threat category. Ordering of categories below matters — more
    specific categories win ties.
    """
    signals: List[Signal] = []
    normalized = text.strip()

    # --- Credential / OTP requests (strongest phishing indicator) -----------
    cred_hits = _find_matches(normalized, CREDENTIAL_REQUEST_PATTERNS)
    if cred_hits:
        signals.append(Signal(
            id="credential_request",
            label="Requests sensitive credentials",
            severity=Severity.CRITICAL,
            evidence=cred_hits,
            category_hint=ThreatCategory.OTP_SCAM if any(
                "otp" in h.lower() or "code" in h.lower() or "kode" in h.lower()
                for h in cred_hits
            ) else ThreatCategory.PHISHING,
        ))

    # --- Urgency / pressure -------------------------------------------------
    urgency_hits = _find_matches(normalized, URGENCY_PATTERNS)
    if urgency_hits:
        signals.append(Signal(
            id="urgency_pressure",
            label="Urgency or time pressure",
            severity=Severity.HIGH,
            evidence=urgency_hits,
            category_hint=ThreatCategory.PHISHING,
        ))

    # --- Impersonation of trusted brands ------------------------------------
    imp_hits = _find_matches(normalized, IMPERSONATION_PATTERNS)
    if imp_hits:
        signals.append(Signal(
            id="brand_impersonation",
            label="References a trusted institution or brand",
            severity=Severity.MEDIUM,
            evidence=imp_hits,
            category_hint=ThreatCategory.IMPERSONATION,
        ))

    # --- Reward / prize bait ------------------------------------------------
    reward_hits = _find_matches(normalized, REWARD_BAIT_PATTERNS)
    if reward_hits:
        signals.append(Signal(
            id="reward_bait",
            label="Prize, reward, or winnings bait",
            severity=Severity.HIGH,
            evidence=reward_hits,
            category_hint=ThreatCategory.FINANCIAL_FRAUD,
        ))

    # --- Financial fraud wording --------------------------------------------
    fraud_hits = _find_matches(normalized, FINANCIAL_FRAUD_PATTERNS)
    if fraud_hits:
        signals.append(Signal(
            id="financial_fraud_wording",
            label="Money transfer, fee, or guaranteed-return language",
            severity=Severity.HIGH,
            evidence=fraud_hits,
            category_hint=ThreatCategory.FINANCIAL_FRAUD,
        ))

    # --- Coercive threats ---------------------------------------------------
    threat_hits = _find_matches(normalized, THREAT_PATTERNS)
    if threat_hits:
        signals.append(Signal(
            id="coercive_threat",
            label="Coercive threat or consequence language",
            severity=Severity.HIGH,
            evidence=threat_hits,
            category_hint=ThreatCategory.PHISHING,
        ))

    # --- Embedded suspicious URL hint ---------------------------------------
    # A message that contains ANY URL combined with urgency or credential
    # asks is a much stronger phishing indicator than either alone.
    url_match = re.search(r"https?://\S+|\b\w+\.(xyz|top|click|link|tk|ml|cf|gq|info)\b",
                          normalized, flags=re.IGNORECASE)
    if url_match and (cred_hits or urgency_hits):
        signals.append(Signal(
            id="url_plus_pressure",
            label="Suspicious link combined with pressure or credential request",
            severity=Severity.CRITICAL,
            evidence=[url_match.group(0)],
            category_hint=ThreatCategory.PHISHING,
        ))

    # --- Choose most likely threat category ---------------------------------
    category = _pick_category(signals)
    return signals, category


def _pick_category(signals: List[Signal]) -> ThreatCategory:
    """Pick the category with the highest-severity supporting signal."""
    if not signals:
        return ThreatCategory.NONE

    severity_rank = {
        Severity.LOW: 1, Severity.MEDIUM: 2,
        Severity.HIGH: 3, Severity.CRITICAL: 4,
    }

    # Score each category by summed severity of signals that hint at it
    tally: dict[ThreatCategory, int] = {}
    for sig in signals:
        if sig.category_hint:
            tally[sig.category_hint] = tally.get(sig.category_hint, 0) + severity_rank[sig.severity]

    if not tally:
        return ThreatCategory.UNKNOWN_SUSPICIOUS

    return max(tally.items(), key=lambda kv: kv[1])[0]
