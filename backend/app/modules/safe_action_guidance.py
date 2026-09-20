"""
Safe action guidance (Layer 5).

Returns context-specific recommended actions based on the detected threat
category and which signals fired.
"""
from __future__ import annotations

from typing import List

from .schemas import AnalysisMode, Signal, ThreatCategory


def build_safe_actions(
    mode: AnalysisMode,
    category: ThreatCategory,
    signals: List[Signal],
) -> List[str]:
    ids = {s.id for s in signals}
    actions: List[str] = []

    # Baseline actions per category
    if category == ThreatCategory.OTP_SCAM:
        actions += [
            "Do not share the OTP, PIN, or verification code with anyone — including someone claiming to be from your bank.",
            "If you already sent an OTP, contact your bank through the number on the back of your card and ask them to lock the session.",
        ]
    elif category == ThreatCategory.PHISHING:
        actions += [
            "Do not click any link in the message. Open the company's official site or app yourself and sign in there if you need to check something.",
            "If you already clicked and entered credentials, change that password immediately and enable two-factor authentication.",
        ]
    elif category == ThreatCategory.IMPERSONATION:
        actions += [
            "Verify the sender through a channel you already trust — a number on an official website, a receipt, or your app — not a number or link in the message itself.",
            "Treat any request for action from this sender as unverified until you confirm it independently.",
        ]
    elif category == ThreatCategory.FINANCIAL_FRAUD:
        actions += [
            "Do not transfer money or pay any fee based on this message.",
            "If a payment has already been made, contact your bank immediately to request a reversal or a freeze on the destination account.",
        ]
    elif category == ThreatCategory.SUSPICIOUS_LINK:
        actions += [
            "Do not open the link. If you must, use a device that does not hold sensitive accounts and never enter credentials.",
            "Check the brand's real site by typing the domain manually in your browser.",
        ]
    elif category == ThreatCategory.FAKE_JOB_OFFER:
        actions += [
            "Do not pay any fee, deposit, or training cost — legitimate employers never charge you to be hired.",
            "Look up the company on its official website and LinkedIn, and confirm the recruiter's identity through the company's HR page.",
            "Do not send copies of your passport, ID card, or bank details until a real signed offer and verified employer are in place.",
        ]
    else:
        actions += [
            "Do not respond or act on the message until you have verified the sender through an independent channel.",
        ]

    # Signal-specific additions
    if "credential_request" in ids or "url_plus_pressure" in ids:
        actions.append("If an account may be compromised, change its password and revoke active sessions from the account's security settings.")
    if "upfront_fee" in ids:
        actions.append("Keep the original message as evidence in case you choose to file a report with your local cybercrime or consumer-protection authority.")
    if "premature_pii" in ids:
        actions.append("If you already sent identity documents, monitor your credit reports and consider placing a fraud alert with your bank.")
    if "typosquatting" in ids or "brand_in_subdomain" in ids:
        actions.append("Bookmark the official site of the real brand so you do not have to rely on links in future messages.")

    # Deduplicate while preserving order
    seen: set[str] = set()
    result: List[str] = []
    for a in actions:
        if a not in seen:
            seen.add(a)
            result.append(a)
    return result
