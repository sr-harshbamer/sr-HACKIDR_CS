"""
Investigation Agent: Deep entity intelligence, domain spoofing analysis,
UPI handle reputation, and conversational trajectory tracking.
"""
from __future__ import annotations

import re
import tldextract
from typing import Dict, Any, List, Optional
from ..guardian_db import get_db_connection


class InvestigationAgent:
    """Investigates parsed entities against cyber intelligence heuristics and known threat feeds."""

    LEGITIMATE_DOMAINS = {
        "hdfcbank.com", "icicibank.com", "sbi.co.in", "axisbank.com", "kotak.com",
        "paytm.com", "phonepe.com", "google.com", "amazon.in", "flipkart.com",
        "incometax.gov.in", "uidai.gov.in", "epfindia.gov.in", "netflix.com", "apple.com"
    }

    SUSPICIOUS_TLDS = {
        "top", "xyz", "online", "site", "live", "club", "info", "loan", "work", "click", "vip", "cfd", "shop"
    }

    BANK_KEYWORDS = [
        "hdfc", "icici", "sbi", "axis", "kotak", "pnb", "bob", "bank", "kyc", "netbanking", "login", "reward"
    ]

    UPI_SCAM_KEYWORDS = [
        "refund", "cashback", "lottery", "support", "helpdesk", "reward", "winner", "bonus", "kyc", "verification"
    ]

    @classmethod
    def investigate_url(cls, url_data: Dict[str, Any]) -> Dict[str, Any]:
        hostname = url_data.get("hostname", "")
        extracted = tldextract.extract(hostname)
        registered_domain = f"{extracted.domain}.{extracted.suffix}" if extracted.suffix else extracted.domain
        tld = extracted.suffix.lower()

        signals = []
        is_known_threat = False

        # 1. Check Threat Entities database
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM threat_entities WHERE entity_type = 'domain' AND entity_value = ?", (hostname,))
        hit = cur.fetchone()
        if not hit:
            cur.execute("SELECT * FROM threat_entities WHERE entity_type = 'domain' AND entity_value = ?", (registered_domain,))
            hit = cur.fetchone()
        conn.close()

        if hit:
            is_known_threat = True
            signals.append({
                "key": "KNOWN_MALICIOUS_DOMAIN",
                "title": "Global Cyber Threat Intelligence Match",
                "description": f"Domain '{hostname}' is indexed in active cybercrime blocklists with reputation score {hit['reputation_score']}/100.",
                "weight": 0.98,
            })

        # 2. IP Address Hostname
        if url_data.get("is_ip_address"):
            signals.append({
                "key": "IP_HOST_NAVIGATION",
                "title": "Raw IP Address Host",
                "description": "Website uses a raw IP address instead of a registered domain name, common in phishing and malware drop servers.",
                "weight": 0.85,
            })

        # 3. Typosquatting / Brand Impersonation
        for legit in cls.LEGITIMATE_DOMAINS:
            legit_name = legit.split(".")[0]
            if legit_name in hostname and registered_domain != legit:
                signals.append({
                    "key": "TYPOSQUATTING_BRAND",
                    "title": f"Target Brand Impersonation ({legit_name.upper()})",
                    "description": f"Domain '{hostname}' mimics trusted entity '{legit}' on an unauthorized host.",
                    "weight": 0.92,
                })
                break

        # 4. Keyword Stuffing in Subdomains
        found_keywords = [kw for kw in cls.BANK_KEYWORDS if kw in hostname]
        if len(found_keywords) >= 2 and registered_domain not in cls.LEGITIMATE_DOMAINS:
            signals.append({
                "key": "DECEPTIVE_SUBDOMAINS",
                "title": "Deceptive Security Keywords in Domain",
                "description": f"Domain bundles trust words ({', '.join(found_keywords)}) to deceive users into trusting a fake portal.",
                "weight": 0.80,
            })

        # 5. Suspicious TLD
        if tld in cls.SUSPICIOUS_TLDS:
            signals.append({
                "key": "HIGH_ABUSE_TLD",
                "title": f"High Abuse Top Level Domain (.{tld})",
                "description": f"The top-level domain '.{tld}' has disproportionately high association with disposable phishing infrastructure.",
                "weight": 0.70,
            })

        # 6. Sensitive Path Intent (KYC, Login, Password)
        path = url_data.get("path", "").lower()
        if any(p in path for p in ["kyc", "pan-update", "aadhaar", "otp", "login", "verify-account"]):
            signals.append({
                "key": "CREDENTIAL_HARVESTING_PATH",
                "title": "Credential or KYC Harvesting Path Structure",
                "description": f"URL path '{path}' indicates an attempt to solicit banking credentials or personal identity documents.",
                "weight": 0.82,
            })

        return {
            "registered_domain": registered_domain,
            "tld": tld,
            "is_known_threat": is_known_threat,
            "signals": signals,
        }

    @classmethod
    def investigate_upi(cls, upi_data: Dict[str, Any]) -> Dict[str, Any]:
        vpa = upi_data.get("vpa", "")
        username = upi_data.get("username_part", "")
        payee_name = upi_data.get("payee_name", "")
        amount = upi_data.get("amount", 0.0)
        note = upi_data.get("transaction_note", "").lower()

        signals = []
        is_known_threat = False

        # 1. Threat Database lookup
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM threat_entities WHERE entity_type = 'upi_vpa' AND entity_value = ?", (vpa,))
        hit = cur.fetchone()
        conn.close()

        if hit:
            is_known_threat = True
            signals.append({
                "key": "BLACKLISTED_UPI_HANDLE",
                "title": "Blacklisted Payment Destination",
                "description": f"UPI ID '{vpa}' is flagged in the National Cyber Crime registry with {hit['report_count']} fraud incidents.",
                "weight": 0.99,
            })

        # 2. Deceptive Refund / Support handle pattern
        scam_kws = [kw for kw in cls.UPI_SCAM_KEYWORDS if kw in username or kw in payee_name.lower()]
        if scam_kws:
            signals.append({
                "key": "DECEPTIVE_PAYEE_IDENTITY",
                "title": f"Deceptive Refund/Support Label ({', '.join(scam_kws)})",
                "description": f"Handle '{vpa}' poses as official support or cashback service, which violates payment gateway guidelines.",
                "weight": 0.90,
            })

        # 3. Reverse Debit Trap (Paying to receive refund)
        if "refund" in note or "cashback" in note or "receive" in note or "prize" in note:
            signals.append({
                "key": "REVERSAL_PAYMENT_TRAP",
                "title": "Reverse Payment/Refund Trap",
                "description": "Incoming intent is initiating a DEBIT from your account while claiming you are receiving a refund or prize.",
                "weight": 0.96,
            })

        # 4. Large unverified amount
        if amount >= 5000:
            signals.append({
                "key": "HIGH_VALUE_UNVERIFIED_TRANSACTION",
                "title": f"High Value Transaction (₹{amount:,.2f})",
                "description": f"Transaction amount of ₹{amount:,.2f} carries elevated risk when sent to a newly observed recipient.",
                "weight": 0.65,
            })

        return {
            "vpa": vpa,
            "is_known_threat": is_known_threat,
            "signals": signals,
        }

    @classmethod
    def investigate_call_trajectory(cls, turn_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes the chronological sequence of cues across call turns.
        Detects escalating manipulation strategies.
        """
        all_cues = []
        for t in turn_history:
            all_cues.extend(t.get("detected_cues", []))

        signals = []
        
        # Check for sequential pattern
        has_authority = "AUTHORITY_CLAIM" in all_cues
        has_urgency = "URGENCY_PRESSURE" in all_cues
        has_otp = "OTP_REQUEST" in all_cues
        has_payment = "PAYMENT_DEMAND" in all_cues
        has_remote = "REMOTE_ACCESS_REQUEST" in all_cues
        has_digital_arrest = "DIGITAL_ARREST_COERCION" in all_cues
        has_contraband = "CONTRABAND_PARCEL_SCAM" in all_cues

        if has_authority:
            signals.append({
                "key": "CALL_AUTHORITY_IMPERSONATION",
                "title": "Institutional Impersonation Claim",
                "description": "Caller claims official identity (Police, Bank, RBI, Customs) to establish false authority.",
                "weight": 0.85,
            })

        if has_digital_arrest:
            signals.append({
                "key": "CALL_DIGITAL_ARREST_EXTORTION",
                "title": "Digital Arrest / Secrecy Coercion Scheme",
                "description": "Caller claims you are under 'Digital Arrest' or demands you remain isolated on video. Digital arrests have NO legal standing in India.",
                "weight": 0.99,
            })

        if has_contraband:
            signals.append({
                "key": "CALL_CONTRABAND_PARCEL_TRAP",
                "title": "Customs Contraband Courier Scheme",
                "description": "Caller claims an international courier containing illegal narcotics or passports was intercepted in your name.",
                "weight": 0.95,
            })

        if has_urgency:
            signals.append({
                "key": "CALL_ARTIFICIAL_URGENCY",
                "title": "Panic & Immediate Action Coercion",
                "description": "Caller enforces strict deadline pressure (e.g. 'account blocked in 10 mins') to bypass rational judgment.",
                "weight": 0.80,
            })

        if has_otp:
            signals.append({
                "key": "CALL_LIVE_OTP_SOLICITATION",
                "title": "Live 2-Factor Authentication Code Harvesting",
                "description": "Caller is demanding you read aloud a private one-time SMS password. Legitimate institutions NEVER ask for OTPs.",
                "weight": 0.99,
            })

        if has_payment:
            signals.append({
                "key": "CALL_COERCED_FUNDS_TRANSFER",
                "title": "Demanding Live Payment or Security Deposit",
                "description": "Caller is directing you to open UPI apps and transfer money under the guise of verification or safety deposit.",
                "weight": 0.98,
            })

        if has_remote:
            signals.append({
                "key": "CALL_REMOTE_DESKTOP_ACCESS",
                "title": "Remote Screen Sharing Application Request",
                "description": "Caller asked to install AnyDesk/TeamViewer to seize full device screen and credential access.",
                "weight": 0.99,
            })

        return {
            "total_turns": len(turn_history),
            "cues_observed": list(set(all_cues)),
            "signals": signals,
        }
