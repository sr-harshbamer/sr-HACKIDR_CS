"""
Response Agent: Formulates precise intervention policies and client-side actions.
Determines whether to ALLOW, PAUSE_NAVIGATION, BLOCK_PAYMENT_HANDOFF, or OVERLAY_CALL_INTERVENTION.
"""
from __future__ import annotations

from typing import Dict, Any, List


class ResponseAgent:
    """Calculates appropriate automated intervention based on risk level and channel."""

    @staticmethod
    def determine_intervention(risk_data: Dict[str, Any], channel: str) -> Dict[str, Any]:
        risk_level = risk_data.get("risk_level", "SAFE")
        risk_score = risk_data.get("risk_score", 0)

        if channel == "URL":
            if risk_level in ["CRITICAL", "HIGH"]:
                action = "PAUSE_NAVIGATION"
                action_title = "Navigation Intercepted & Paused"
                recommendation = "Do not open this website. It exhibits multiple high-confidence phishing indicators."
                can_override = True
            elif risk_level == "SUSPICIOUS":
                action = "SHOW_WARNING_BANNER"
                action_title = "Caution Advised Before Visiting"
                recommendation = "Verify domain spelling and SSL certificate prior to submitting credentials."
                can_override = True
            else:
                action = "ALLOW"
                action_title = "Safe Navigation"
                recommendation = "Domain verified against known security databases."
                can_override = False

        elif channel == "UPI":
            if risk_level in ["CRITICAL", "HIGH"]:
                action = "BLOCK_PAYMENT_HANDOFF"
                action_title = "Payment Handoff Halted"
                recommendation = "Stop payment immediately. Recipient matches known fraud pattern."
                can_override = True
            elif risk_level == "SUSPICIOUS":
                action = "CONFIRMATION_CHALLENGE"
                action_title = "Payment Verification Required"
                recommendation = "Ensure you personally know the recipient before sending funds."
                can_override = True
            else:
                action = "ALLOW"
                action_title = "Payment Approved"
                recommendation = "Verified recipient and standard payment profile."
                can_override = False

        elif channel == "CALL":
            if risk_level in ["CRITICAL", "HIGH"]:
                action = "OVERLAY_CALL_INTERVENTION"
                action_title = "Active Call Threat Overlay"
                recommendation = "NEVER share your OTP or send funds. End the call immediately."
                can_override = True
            elif risk_level == "SUSPICIOUS":
                action = "SUBTLE_HEADS_UP"
                action_title = "Potential Scam Tactics Detected"
                recommendation = "Caller is using urgency tactics. Do not disclose private data."
                can_override = True
            else:
                action = "MONITOR"
                action_title = "Call Stream Normal"
                recommendation = "Continuous background listening active."
                can_override = False

        else:
            action = "ALERT_ONLY" if risk_level != "SAFE" else "ALLOW"
            action_title = "Security Check Complete"
            recommendation = "Review security breakdown."
            can_override = True

        return {
            "intervention_action": action,
            "action_title": action_title,
            "recommendation": recommendation,
            "can_user_override": can_override,
            "requires_explicit_confirmation": risk_level == "CRITICAL",
        }
