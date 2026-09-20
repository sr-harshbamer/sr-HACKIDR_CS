"""
Detection Agent: Fast triage, signature matching, protocol intent parsing.
Extracts entities from URLs, UPI payment requests, SMS messages, and real-time call transcripts.
"""
from __future__ import annotations

import re
import urllib.parse
from typing import Dict, Any, List, Optional


class DetectionAgent:
    """Performs rapid initial detection and entity extraction."""

    @staticmethod
    def parse_url_intent(url: str) -> Dict[str, Any]:
        """Parses and sanitizes raw navigation URLs before dispatch."""
        url = url.strip()
        if not re.match(r"^https?://", url, re.IGNORECASE):
            url = "https://" + url

        parsed = urllib.parse.urlparse(url)
        hostname = parsed.hostname or ""
        path = parsed.path or "/"
        query = parsed.query or ""

        return {
            "raw_url": url,
            "scheme": parsed.scheme,
            "hostname": hostname.lower(),
            "port": parsed.port,
            "path": path,
            "query": query,
            "is_ip_address": bool(re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", hostname)),
            "contains_at_symbol": "@" in url,
            "contains_punycode": "xn--" in hostname,
            "subdomain_count": len(hostname.split(".")) - 2 if len(hostname.split(".")) > 2 else 0,
        }

    @staticmethod
    def parse_upi_intent(payload: str) -> Dict[str, Any]:
        """
        Parses UPI Payment QR codes or intent strings:
        e.g. upi://pay?pa=refund-support@xyz&pn=Refund%20Helpdesk&am=8500&cu=INR&tn=Cashback%20Approval
        """
        payload = payload.strip()
        vpa = ""
        payee_name = ""
        amount = 0.0
        currency = "INR"
        transaction_note = ""
        merchant_code = ""

        if payload.startswith("upi://") or "pa=" in payload:
            if "?" in payload:
                query_str = payload.split("?", 1)[1]
            else:
                query_str = payload
            params = urllib.parse.parse_qs(query_str)
            vpa = params.get("pa", [""])[0]
            payee_name = params.get("pn", [""])[0]
            amt_str = params.get("am", ["0"])[0]
            try:
                amount = float(amt_str)
            except ValueError:
                amount = 0.0
            currency = params.get("cu", ["INR"])[0]
            transaction_note = params.get("tn", [""])[0]
            merchant_code = params.get("mc", [""])[0]
        elif "@" in payload:
            vpa = payload

        handle_parts = vpa.split("@")
        username_part = handle_parts[0] if len(handle_parts) > 0 else ""
        bank_handle = handle_parts[1] if len(handle_parts) > 1 else ""

        return {
            "raw_payload": payload,
            "vpa": vpa.lower(),
            "username_part": username_part.lower(),
            "bank_handle": bank_handle.lower(),
            "payee_name": payee_name,
            "amount": amount,
            "currency": currency,
            "transaction_note": transaction_note,
            "merchant_code": merchant_code,
            "is_valid_format": bool("@" in vpa),
        }

    @staticmethod
    def parse_call_turn(turn_text: str, turn_index: int = 0) -> Dict[str, Any]:
        """Triage a conversational turn in real-time call streaming with deep scam cue detection."""
        text_lower = turn_text.lower()
        detected_cues = []

        # 1. Authority & Institutional Claims
        authority_keywords = [
            "police", "cyber cell", "cbi", "crime branch", "rbi", "customs", "ncb",
            "narcotics", "enforcement directorate", "ed officer", "bank manager",
            "security department", "telecom department", "trai", "dot", "income tax", "supreme court"
        ]
        if any(w in text_lower for w in authority_keywords):
            detected_cues.append("AUTHORITY_CLAIM")

        # 2. Digital Arrest & Secrecy Coercion
        if any(w in text_lower for w in ["digital arrest", "skype", "video call", "do not disconnect", "quiet room", "confidential case", "stay on line", "under surveillance"]):
            detected_cues.append("DIGITAL_ARREST_COERCION")

        # 3. Urgency & Extortion Pressure
        urgency_keywords = [
            "immediately", "within 10 minutes", "within 15 minutes", "within 2 hours", "today night", "9:30 pm",
            "account blocked", "arrest warrant", "fir registered", "sim block", "electricity disconnect",
            "power will be cut", "urgent action", "non-bailable"
        ]
        if any(w in text_lower for w in urgency_keywords):
            detected_cues.append("URGENCY_PRESSURE")

        # 4. Live OTP & Security Credential Harvesting
        otp_keywords = [
            "otp", "one time password", "verification code", "6 digit code", "6-digit", "read the sms",
            "cvv", "card expiry", "atm pin", "password", "netbanking pin"
        ]
        if any(w in text_lower for w in otp_keywords):
            detected_cues.append("OTP_REQUEST")

        # 5. Direct Money Demands & Escrow Traps
        payment_keywords = [
            "gpay", "phonepe", "paytm", "send money", "transfer", "refundable deposit", "security fee",
            "clearance fee", "rbi safe account", "escrow", "upi pin", "pay rs", "pay ₹", "bail bond"
        ]
        if any(w in text_lower for w in payment_keywords):
            detected_cues.append("PAYMENT_DEMAND")

        # 6. Remote Screen Sharing & Malware App Installation
        remote_keywords = [
            "anydesk", "teamviewer", "rustdesk", "quicksupport", "screen share", "download apk",
            "install support app", "screen sharing"
        ]
        if any(w in text_lower for w in remote_keywords):
            detected_cues.append("REMOTE_ACCESS_REQUEST")

        # 7. Contraband / Illegal Parcel Scam
        if any(w in text_lower for w in ["fedex", "dhl", "customs parcel", "drugs", "passport seized", "taiwan", "illegal package", "contraband"]):
            detected_cues.append("CONTRABAND_PARCEL_SCAM")

        return {
            "turn_index": turn_index,
            "raw_text": turn_text,
            "detected_cues": detected_cues,
            "has_threat_cues": len(detected_cues) > 0,
        }
