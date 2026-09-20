"""
Job offer analysis.

Targets recruiter scams, fake job offers, and advance-fee employment fraud.
Checks include: unrealistic pay, upfront fees, free-email recruiters,
rushed hiring, premature PII requests, and non-verifiable companies.
"""
from __future__ import annotations

import re
from typing import List, Tuple

from .schemas import Severity, Signal, ThreatCategory
from .message_analysis import _find_matches  # reuse matching helper


# Free / consumer email domains — a legitimate recruiter almost never uses these
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "live.com", "aol.com", "proton.me", "protonmail.com",
    "yandex.com", "mail.com", "icloud.com", "gmx.com",
}

UNREALISTIC_PAY_PATTERNS = [
    r"\$\s?\d{3,}\s*(/|per)\s*(hour|hr|day|jam|hari)",
    r"earn\s+\$\s?\d{3,}.*(daily|per day|weekly)",
    r"rp\s?\d{1,3}(\.\d{3})+\s*(per hari|/hari|per jam|/jam)",
    r"no experience.*\$\s?\d{3,}",
    r"\bguaranteed salary\b", r"\bguaranteed income\b",
    r"\bpart[- ]time\b.*\$\s?\d{3,}",
]

UPFRONT_FEE_PATTERNS = [
    r"\b(registration|training|equipment|processing|visa|kit)\s+fee\b",
    r"\bbiaya\s+(registrasi|pelatihan|training|admin|proses)\b",
    r"\bdeposit (required|refundable|needed)\b",
    r"\bpay.*(deposit|fee).*(first|before|upfront|dulu)\b",
    r"\bsend.*(money|uang).*(first|dulu)\b",
    r"\btransfer\s+(rp|idr|\$)\s?[\d,.]+.*(first|before)\b",
]

RUSHED_HIRING_PATTERNS = [
    r"\bhired? (immediately|on the spot|today)\b",
    r"\bstart (today|tomorrow|immediately)\b",
    r"\bno interview (required|needed)\b",
    r"\binstant (offer|hire)\b",
    r"\blimited (slots?|positions?) (available|left)\b",
    r"\bditerima.*(hari ini|langsung)\b",
]

PREMATURE_PII_PATTERNS = [
    r"\bsend.*(passport|id card|ktp|driver.?s? license)\b",
    r"\bprovide.*(ssn|social security|nomor rekening|bank account)\b",
    r"\bupload.*(selfie with id|foto ktp)\b",
    r"\bphotocopy.*(passport|id|ktp)\b",
    r"\bbank.*(details|account number).*(for (setup|processing|verification))\b",
]

VAGUE_ROLE_PATTERNS = [
    r"\bwork from home\b.*\bflexible hours\b",
    r"\bonline (data entry|review) job\b",
    r"\bno (skills?|experience|qualifications?) (required|needed)\b",
    r"\breshipp?ing (agent|job)\b",           # classic mule scam
    r"\bpayment processor\b.*\bpersonal account\b",
    r"\bmystery shopper\b.*\bdeposit\b",
]

PLATFORM_OFF_CHANNEL_PATTERNS = [
    r"\bcontact.*(whatsapp|telegram|wa)\s*[:@]?\s*\+?\d",
    r"\bdm me on (telegram|whatsapp|wa)\b",
    r"\bchat on telegram\b", r"\btext\s+\+?\d[\d\s\-]{7,}",
]


def _extract_recruiter_email(text: str) -> str | None:
    match = re.search(r"[\w.\-+]+@[\w.\-]+\.\w+", text)
    return match.group(0).lower() if match else None


def analyze_job_offer(text: str) -> Tuple[List[Signal], ThreatCategory]:
    signals: List[Signal] = []
    body = text.strip()

    # --- Unrealistic compensation -------------------------------------------
    pay_hits = _find_matches(body, UNREALISTIC_PAY_PATTERNS)
    if pay_hits:
        signals.append(Signal(
            id="unrealistic_pay",
            label="Unrealistic or guaranteed-high compensation",
            severity=Severity.HIGH,
            evidence=pay_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Upfront fees (strongest single signal) -----------------------------
    fee_hits = _find_matches(body, UPFRONT_FEE_PATTERNS)
    if fee_hits:
        signals.append(Signal(
            id="upfront_fee",
            label="Requests an upfront fee, deposit, or payment",
            severity=Severity.CRITICAL,
            evidence=fee_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Rushed hiring -------------------------------------------------------
    rush_hits = _find_matches(body, RUSHED_HIRING_PATTERNS)
    if rush_hits:
        signals.append(Signal(
            id="rushed_hiring",
            label="Hiring process is skipped or artificially rushed",
            severity=Severity.HIGH,
            evidence=rush_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Premature PII requests ---------------------------------------------
    pii_hits = _find_matches(body, PREMATURE_PII_PATTERNS)
    if pii_hits:
        signals.append(Signal(
            id="premature_pii",
            label="Asks for identity documents or bank details too early",
            severity=Severity.CRITICAL,
            evidence=pii_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Vague or mule-style role -------------------------------------------
    vague_hits = _find_matches(body, VAGUE_ROLE_PATTERNS)
    if vague_hits:
        signals.append(Signal(
            id="vague_role",
            label="Role description fits a common scam template",
            severity=Severity.MEDIUM,
            evidence=vague_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Off-channel contact push -------------------------------------------
    off_hits = _find_matches(body, PLATFORM_OFF_CHANNEL_PATTERNS)
    if off_hits:
        signals.append(Signal(
            id="off_channel_contact",
            label="Pushes contact to WhatsApp / Telegram instead of a company channel",
            severity=Severity.MEDIUM,
            evidence=off_hits,
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    # --- Free-email recruiter ------------------------------------------------
    email = _extract_recruiter_email(body)
    if email:
        domain = email.split("@", 1)[1]
        if domain in FREE_EMAIL_DOMAINS:
            signals.append(Signal(
                id="free_email_recruiter",
                label="Recruiter uses a personal free-email address, not a company domain",
                severity=Severity.HIGH,
                evidence=[email],
                category_hint=ThreatCategory.FAKE_JOB_OFFER,
            ))

    # --- No verifiable company information ----------------------------------
    # Heuristic: offer mentions "company" or "perusahaan" but there is no
    # explicit company name pattern or website.
    has_website = bool(re.search(r"https?://|www\.|\b\w+\.(com|co|io|id|org)\b", body, re.I))
    if not has_website and any(k in body.lower() for k in ["company", "perusahaan", "firm", "employer"]):
        signals.append(Signal(
            id="no_verifiable_company",
            label="No verifiable company website or official domain",
            severity=Severity.MEDIUM,
            evidence=["(no company website detected in offer text)"],
            category_hint=ThreatCategory.FAKE_JOB_OFFER,
        ))

    category = _pick_category(signals)
    return signals, category


def _pick_category(signals: List[Signal]) -> ThreatCategory:
    if not signals:
        return ThreatCategory.NONE
    # Any job-offer signal → fake job offer category
    return ThreatCategory.FAKE_JOB_OFFER
