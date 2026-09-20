"""
Block / report guidance (Layer 6).

Platform-agnostic steps. Veridra does NOT automatically block or report
anything — this module only tells the user how to do it themselves.
"""
from __future__ import annotations

from typing import List

from .schemas import AnalysisMode, ThreatCategory


def build_block_report_guidance(
    mode: AnalysisMode,
    category: ThreatCategory,
) -> List[str]:
    """
    Return a list of concrete, platform-agnostic steps the user can take to
    block the sender and report the content. These are suggestions only —
    Veridra does not perform any of them on the user's behalf.
    """
    guidance: List[str] = []

    if mode == AnalysisMode.MESSAGE:
        guidance += [
            "Block the sender in the app where you received the message (SMS, WhatsApp, Telegram, email, etc.) using its built-in block feature.",
            "Report the message as spam or phishing from the same app — most messaging platforms expose this directly in the message menu.",
            "If the message impersonates a real company, forward it to that company's official abuse or phishing address (commonly listed on their website under security or support).",
            "In many countries you can also report SMS scams to your mobile carrier by forwarding the message to a short code published on the carrier's site.",
        ]
        if category in (ThreatCategory.OTP_SCAM, ThreatCategory.FINANCIAL_FRAUD):
            guidance.append(
                "If the message targets a bank account, contact the bank through the number on the back of your card and report the attempt so they can monitor the account."
            )
        if category == ThreatCategory.IMPERSONATION:
            guidance.append(
                "Report the impersonation to the real brand's support channel so they can issue takedown requests for any associated pages."
            )

    elif mode == AnalysisMode.LINK:
        guidance += [
            "Do not visit the link again from an account-bearing device.",
            "Report the URL to a public phishing database — for example, Google Safe Browsing, PhishTank, or APWG — so other users are warned.",
            "If the link impersonates a specific brand, use that brand's official abuse or phishing report form (usually linked from their security page).",
            "If you received the link in a message or email, also block the sender and report the original message as phishing.",
        ]

    elif mode == AnalysisMode.JOB_OFFER:
        guidance += [
            "On LinkedIn, Indeed, or the job board where you saw the offer, use the built-in Report option on the posting or recruiter profile.",
            "If the recruiter contacted you directly, block the profile or number and mark the conversation as spam or fraud in the messaging platform.",
            "Report the company or recruiter to the genuine employer — if an attacker is impersonating a real company, that company's HR or security team usually has a dedicated channel for fraudulent-offer reports.",
            "If you paid any fee or shared documents, file a report with your local cybercrime or consumer-protection authority and keep the original messages as evidence.",
        ]

    # Universal closing step
    guidance.append(
        "Save a copy of the original content (screenshot or export) before deleting it, in case you later need evidence for a report."
    )
    return guidance
