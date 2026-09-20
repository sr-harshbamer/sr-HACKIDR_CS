"""
Explanation Agent: Translates technical risk signals into plain, actionable human explanations.
Produces Why Flagged, Consequences, Safe Actions, and Official Block/Report Guidance.
"""
from __future__ import annotations

from typing import Dict, Any, List


class ExplanationAgent:
    """Generates user-centric explanations with zero jargon."""

    @staticmethod
    def generate_explanation(
        channel: str,
        signals: List[Dict[str, Any]],
        risk_level: str,
        entity_info: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        entity_info = entity_info or {}

        # 1. Why it was flagged
        why_flagged = []
        for s in signals:
            why_flagged.append(f"{s.get('title')}: {s.get('description')}")
        if not why_flagged:
            why_flagged.append("No active security threats, brand impersonations, or fraud patterns detected.")

        # 2. Plain-language consequences
        why_not_proceed = []
        if channel == "URL":
            if risk_level in ["CRITICAL", "HIGH"]:
                why_not_proceed.append("Entering your banking login, PAN, or passwords on this site will compromise your accounts directly to scammers.")
                why_not_proceed.append("This site may attempt drive-by downloads or steal autofill credentials from your browser.")
            else:
                why_not_proceed.append("Always verify the web address directly through official bookmarks.")
        elif channel == "UPI":
            if risk_level in ["CRITICAL", "HIGH"]:
                why_not_proceed.append("Money sent via UPI is debited instantly from your bank account and is non-reversible once authorized with your PIN.")
                why_not_proceed.append("Scammers use deceptive refund handles to trick victims into paying money instead of receiving it.")
            else:
                why_not_proceed.append("Verify recipient details before authenticating with your secret UPI PIN.")
        elif channel == "CALL":
            if risk_level in ["CRITICAL", "HIGH"]:
                why_not_proceed.append("Reading your OTP to the caller allows them to drain your bank balance or reset your netbanking credentials.")
                why_not_proceed.append("Genuine police and cyber cell officials NEVER conduct digital arrests or demand money transfers over telephone calls.")
            else:
                why_not_proceed.append("Never share sensitive credentials over incoming phone calls.")

        # 3. Tailored safe action
        safe_actions = []
        if channel == "URL":
            safe_actions.append("Close this browser window or return to your previous page immediately.")
            safe_actions.append("Type the bank's official website URL directly into your address bar.")
            safe_actions.append("If you already entered passwords, change them immediately from a secure device.")
        elif channel == "UPI":
            safe_actions.append("Cancel this payment request right now.")
            safe_actions.append("Remember: You NEVER need to enter your UPI PIN to receive money or refunds.")
            safe_actions.append("Contact your official bank helpline if you suspect someone is attempting to defraud you.")
        elif channel == "CALL":
            safe_actions.append("Disconnect this call immediately.")
            safe_actions.append("Do NOT read aloud or forward any 4-digit or 6-digit SMS verification codes.")
            safe_actions.append("If they claim to be your bank, call the phone number printed on the back of your debit card.")

        # 4. Platform-agnostic Block & Report guidance
        block_report = {
            "immediate_step": "Block the sender/caller immediately in your device settings.",
            "cybercrime_portal": "Report online fraud to the National Cyber Crime Reporting Portal at https://cybercrime.gov.in or helpline 1930.",
            "banking_step": "Notify your bank's fraud department within 2 hours to freeze compromised channels.",
        }

        return {
            "why_flagged": why_flagged,
            "why_not_proceed": why_not_proceed,
            "safe_actions": safe_actions,
            "block_report_guidance": block_report,
        }
