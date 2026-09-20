"""
Guardian Database Engine & Persistence Layer (SQLite)
Stores Users, Devices, Incidents, CallSessions, TranscriptSegments, Evidence, RiskEvents, AgentActions, ThreatEntities, UserDecisions, and ProtectionSettings.
"""
from __future__ import annotations

import sqlite3
import json
import os
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "guardian.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=15.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_guardian_db() -> None:
    conn = get_db_connection()
    cur = conn.cursor()

    cur.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        hashed_password TEXT NOT NULL,
        full_name TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        device_name TEXT NOT NULL,
        device_model TEXT NOT NULL,
        os_version TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_seen TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS call_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        call_id TEXT UNIQUE NOT NULL,
        caller_phone TEXT NOT NULL,
        caller_name TEXT DEFAULT 'Unknown Caller',
        call_status TEXT NOT NULL, -- SCREENING, USER_TAKEOVER, TERMINATED, COMPLETED
        duration_sec INTEGER DEFAULT 0,
        initial_risk TEXT DEFAULT 'SAFE',
        final_risk TEXT DEFAULT 'SAFE',
        final_score INTEGER DEFAULT 0,
        purpose TEXT,
        summary TEXT,
        recommended_action TEXT,
        created_at TEXT NOT NULL,
        ended_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transcript_segments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        call_session_id INTEGER NOT NULL,
        turn_index INTEGER NOT NULL,
        speaker TEXT NOT NULL, -- CALLER, GUARDIAN_AI, USER
        text TEXT NOT NULL,
        detected_cues_json TEXT,
        risk_level TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        incident_number TEXT UNIQUE NOT NULL,
        threat_type TEXT NOT NULL,
        source TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        raw_payload TEXT,
        call_session_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (call_session_id) REFERENCES call_sessions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        signal_key TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        confidence_weight REAL NOT NULL,
        is_contradicting INTEGER DEFAULT 0,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS risk_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        from_level TEXT NOT NULL,
        to_level TEXT NOT NULL,
        reason TEXT NOT NULL,
        delta_score INTEGER NOT NULL,
        confidence REAL DEFAULT 0.90,
        created_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        agent_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        output_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS threat_entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_value TEXT UNIQUE NOT NULL,
        risk_category TEXT NOT NULL,
        reputation_score INTEGER NOT NULL,
        report_count INTEGER DEFAULT 1,
        metadata_json TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        decision_type TEXT NOT NULL,
        user_comment TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS protection_settings (
        user_id INTEGER PRIMARY KEY,
        call_protection INTEGER DEFAULT 1,
        url_protection INTEGER DEFAULT 1,
        upi_protection INTEGER DEFAULT 1,
        sms_protection INTEGER DEFAULT 1,
        ai_screening_mode TEXT DEFAULT 'AUTO_SCREEN_UNKNOWN',
        auto_block_threshold INTEGER DEFAULT 80,
        aggressive_mode INTEGER DEFAULT 0,
        notifications_enabled INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    conn.commit()
    seed_demo_data(conn)
    conn.close()


def hash_password_simple(password: str) -> str:
    salt = "guardian_secure_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()


def seed_demo_data(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] > 0:
        return

    now = datetime.now(timezone.utc).isoformat()
    demo_pw = hash_password_simple("guardian123")

    # 1. Create Demo User
    cur.execute(
        """
        INSERT INTO users (username, email, hashed_password, full_name, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        ("alex_shield", "alex@guardian-defense.ai", demo_pw, "Alex Mercer", now),
    )
    user_id = cur.lastrowid

    # 2. Protection Settings
    cur.execute(
        """
        INSERT INTO protection_settings (user_id, call_protection, url_protection, upi_protection, sms_protection, ai_screening_mode, auto_block_threshold, aggressive_mode, notifications_enabled)
        VALUES (?, 1, 1, 1, 1, 'AUTO_SCREEN_UNKNOWN', 80, 0, 1)
        """,
        (user_id,),
    )

    # 3. Active Device
    cur.execute(
        """
        INSERT INTO devices (user_id, device_name, device_model, os_version, is_active, last_seen)
        VALUES (?, ?, ?, ?, 1, ?)
        """,
        (user_id, "Alex's Pixel 8 Pro", "Google Pixel 8 Pro", "Android 14 (API 34)", now),
    )

    # 4. Known Threat Entities
    threats = [
        ("domain", "hdfc-bankk-kyc.top", "PHISHING_BANK", 98, 412, json.dumps({"target": "HDFC Bank", "registrar": "NameCheap"})),
        ("domain", "paytm-refund247.online", "REFUND_FRAUD", 95, 230, json.dumps({"target": "Paytm", "registrar": "Hostinger"})),
        ("upi_vpa", "refund-support@xyz", "UPI_REFUND_SCAM", 96, 528, json.dumps({"bank": "XYZ Bank", "modus_operandi": "Fake Refund"})),
        ("upi_vpa", "lottery-claim-gov@okaxis", "LOTTERY_FRAUD", 99, 1420, json.dumps({"target": "General Public", "claim": "Tax Fee"})),
        ("phone", "+91 98765 43210", "BANK_IMPERSONATION_CALL", 95, 340, json.dumps({"spoofed_entity": "Cyber Crime Division / Bank Security"})),
        ("phone", "+91 80001 23456", "ELECTRICITY_DISCONNECT_CALL", 94, 305, json.dumps({"claim": "Power Cut within 1 hour"})),
    ]
    cur.executemany(
        """
        INSERT OR IGNORE INTO threat_entities (entity_type, entity_value, risk_category, reputation_score, report_count, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [(t[0], t[1], t[2], t[3], t[4], t[5], now) for t in threats],
    )

    # 5. Pre-seeded Call Session 1 (Equal AI Model - Critical Scam Call)
    cur.execute(
        """
        INSERT INTO call_sessions (user_id, call_id, caller_phone, caller_name, call_status, duration_sec, initial_risk, final_risk, final_score, purpose, summary, recommended_action, created_at, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            "CALL-2026-9042",
            "+91 98765 43210",
            "Unknown (Claimed Cyber Crime Cell)",
            "TERMINATED",
            194,
            "SAFE",
            "CRITICAL",
            97,
            "Claimed to be an enforcement officer demanding emergency verification and fund transfers.",
            "Caller impersonated Cyber Crime Police, manufactured false arrest threats, solicited real-time SMS OTP, and demanded a ₹15,000 security deposit.",
            "Do NOT share OTP or transfer money. File incident report at cybercrime.gov.in.",
            now,
            now,
        )
    )
    call_id = cur.lastrowid

    transcript_items = [
        ("GUARDIAN_AI", "Hello, this is Guardian AI call assistant on behalf of Alex. Please state your name and purpose of calling.", "[]", "SAFE"),
        ("CALLER", "Hello, this is Inspector Sharma calling from Cyber Crime Investigation Department regarding an urgent matter with your bank account.", '["AUTHORITY_CLAIM"]', "SUSPICIOUS"),
        ("GUARDIAN_AI", "Understood. What specific matter are you inquiring about?", "[]", "SUSPICIOUS"),
        ("CALLER", "Your Aadhaar number is implicated in illegal transactions. Your account will be frozen within 15 minutes unless you verify right now.", '["ARTIFICIAL_URGENCY", "LEGAL_THREAT"]', "HIGH"),
        ("GUARDIAN_AI", "Guardian is recording this screening session. Official notices are issued via registered mail.", "[]", "HIGH"),
        ("CALLER", "Listen carefully! I have just sent a 6-digit verification OTP to your phone. Read it out to me immediately or face arrest.", '["OTP_SOLICITATION"]', "HIGH"),
        ("GUARDIAN_AI", "Alert: Legitimate law enforcement officers never demand OTPs over phone calls.", "[]", "CRITICAL"),
        ("CALLER", "Now open PhonePe or Google Pay and transfer ₹15,000 security bond to our verification escrow handle!", '["PAYMENT_DEMAND"]', "CRITICAL"),
    ]

    for idx, t in enumerate(transcript_items):
        cur.execute(
            """
            INSERT INTO transcript_segments (call_session_id, turn_index, speaker, text, detected_cues_json, risk_level, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (call_id, idx, t[0], t[1], t[2], t[3], now),
        )

    # Pre-seeded Incidents
    incidents_data = [
        {
            "num": "GRD-2026-1040",
            "threat_type": "AI Call Assistant: Extortion & OTP Solicitation",
            "source": "Guardian AI In-Call Screening",
            "risk_level": "CRITICAL",
            "risk_score": 97,
            "confidence": 96,
            "status": "TERMINATED_BY_USER",
            "summary": "Equal AI screening detected 4-stage digital arrest trajectory: authority impersonation, panic deadline, live OTP extraction, and ₹15,000 demand.",
            "payload": json.dumps({"caller": "+91 98765 43210", "call_session_id": call_id, "duration_sec": 194}),
            "call_session_id": call_id,
            "evidence": [
                ("AUTHORITY_COERCION", "Law Enforcement Impersonation", "Caller claimed official Cyber Crime police authority with arrest threats.", 0.94),
                ("ARTIFICIAL_URGENCY", "15-Minute Deadline Pressure", "Caller exerted aggressive panic-inducing deadline to prevent verification.", 0.91),
                ("CREDENTIAL_HARVESTING", "Real-Time OTP Extraction", "Caller demanded 2-factor authentication passcode directly over voice channel.", 0.99),
                ("COERCED_PAYMENT", "Emergency Security Deposit Demand", "Caller demanded immediate UPI transfer to personal escrow account.", 0.97),
            ],
            "risk_events": [
                ("SAFE", "SUSPICIOUS", "Caller asserted official authority claim without organizational identifier", 25),
                ("SUSPICIOUS", "HIGH", "Caller created artificial 15-minute deadline and requested OTP reading", 45),
                ("HIGH", "CRITICAL", "Caller demanded live payment transfer to unverified UPI handle", 27),
            ],
            "agent_actions": [
                ("Detection Agent", "SCREEN_CALL", "Guardian AI assistant initiated active call screening for unknown caller", {}),
                ("Investigation Agent", "TRAJECTORY_ANALYSIS", "Identified classic 4-stage digital arrest extortion trajectory", {}),
                ("Risk Agent", "LIVE_RISK_ESCALATION", "Escalated risk from LOW -> MEDIUM -> HIGH -> CRITICAL across conversational turns", {}),
                ("Response Agent", "HEADS_UP_WARNING", "Rendered floating high-priority intervention overlay and prompted user takeover/end", {}),
                ("Explanation Agent", "POST_CALL_SUMMARY", "Generated comprehensive incident briefing and evidence packet", {}),
            ],
            "decision": ("USER_TERMINATED_CALL", "User ended interaction immediately upon seeing CRITICAL OTP threat overlay.", now),
        },
        {
            "num": "GRD-2026-1042",
            "threat_type": "UPI Payment Scam",
            "source": "UPI Intent (QR / Link)",
            "risk_level": "CRITICAL",
            "risk_score": 96,
            "confidence": 94,
            "status": "BLOCKED",
            "summary": "Attempted ₹8,500 payment to malicious refund handle 'refund-support@xyz' intercepted and blocked prior to UPI app launch.",
            "payload": json.dumps({"vpa": "refund-support@xyz", "amount": 8500, "merchant": "Customer Care Refund Service", "note": "Instant Cashback"}),
            "call_session_id": None,
            "evidence": [
                ("VPA_MISMATCH", "Recipient Identity Mismatch", "VPA name claims official refund service but resolves to an individual unverified VP account.", 0.95),
                ("REVERSAL_FRAUD", "Deceptive Request Pattern", "Payment intent requested money debit instead of credit under the guise of processing a refund.", 0.98),
                ("HIGH_RISK_ENTITY", "Global Blacklist Hit", "VPA matched 528 active community scam reports in the national cyber fraud database.", 0.94),
            ],
            "risk_events": [
                ("SAFE", "SUSPICIOUS", "QR payload scanned with non-merchant business category code", 25),
                ("SUSPICIOUS", "HIGH", "Recipient VPA name contains 'refund-support' on personal banking handle", 40),
                ("HIGH", "CRITICAL", "High debit value (₹8,500) paired with refund deception heuristics", 31),
            ],
            "agent_actions": [
                ("Detection Agent", "PARSE_INTENT", "Extracted UPI intent payload and parsed VPA parameters", {"vpa": "refund-support@xyz", "amount": 8500}),
                ("Investigation Agent", "ENTITY_LOOKUP", "Queried UPI database and threat intelligence registry", {"reputation": "MALICIOUS", "reports": 528}),
                ("Evidence Agent", "SYNTHESIZE", "Compiled 3 critical indicators with 0 contradictory signals", {"evidence_count": 3}),
                ("Risk Agent", "STATE_TRANSITION", "Escalated risk state from HIGH to CRITICAL", {"final_score": 96}),
                ("Response Agent", "TRIGGER_INTERVENTION", "Invoked pre-handoff payment blocker with consequence briefing", {"action": "BLOCK_HANDOFF"}),
                ("Explanation Agent", "GENERATE_GUIDANCE", "Constructed immediate refund scam breakdown and report instructions", {"output_ready": True}),
            ],
            "decision": ("USER_ACCEPTED_BLOCK", "User cancelled transaction and confirmed scam report.", now),
        },
        {
            "num": "GRD-2026-1041",
            "threat_type": "Bank Impersonation Phishing",
            "source": "Browser Navigation Intercept",
            "risk_level": "HIGH",
            "risk_score": 88,
            "confidence": 91,
            "status": "WARNING_TRIGGERED",
            "summary": "Pre-navigation intercept stopped user from loading deceptive domain 'hdfc-bankk-kyc.top' mimicking HDFC netbanking.",
            "payload": json.dumps({"url": "https://hdfc-bankk-kyc.top/login-update", "domain": "hdfc-bankk-kyc.top", "tld": "top"}),
            "call_session_id": None,
            "evidence": [
                ("TYPOSQUATTING", "Punycode & Typosquatting Match", "Domain 'hdfc-bankk-kyc.top' contains intentional double 'k' to mimic official bank portal.", 0.92),
                ("SUSPICIOUS_TLD", "High Abuse Top Level Domain", "TLD '.top' registered less than 4 days ago with hidden WHOIS privacy guard.", 0.88),
                ("CREDENTIAL_INTENT", "KYC Urgency Path Structure", "Path '/login-update' matches known phishing kit structures targeting banking credentials.", 0.90),
            ],
            "risk_events": [
                ("SAFE", "SUSPICIOUS", "Navigation event intercepted towards newly observed domain", 30),
                ("SUSPICIOUS", "HIGH", "Typosquatting detected against official banking trademark", 58),
            ],
            "agent_actions": [
                ("Detection Agent", "INTERCEPT_URL", "Paused navigation intent before Android browser dispatch", {"url": "https://hdfc-bankk-kyc.top/login-update"}),
                ("Investigation Agent", "DOMAIN_ANALYSIS", "Identified trademark impersonation and domain age under 4 days", {"risk_tld": True}),
                ("Response Agent", "INTERCEPT_OVERLAY", "Displayed Guardian Pre-Navigation Warning screen", {"action": "PAUSE_NAVIGATION"}),
            ],
            "decision": ("USER_RETURNED_TO_SAFETY", "User closed tab upon seeing warning overlay.", now),
        }
    ]

    for inc in incidents_data:
        cur.execute(
            """
            INSERT INTO incidents (user_id, incident_number, threat_type, source, risk_level, risk_score, confidence, status, summary, raw_payload, call_session_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, inc["num"], inc["threat_type"], inc["source"], inc["risk_level"], inc["risk_score"], inc["confidence"], inc["status"], inc["summary"], inc["payload"], inc.get("call_session_id"), now, now),
        )
        inc_id = cur.lastrowid

        for ev in inc["evidence"]:
            cur.execute(
                """
                INSERT INTO evidence (incident_id, signal_key, title, description, confidence_weight, is_contradicting)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (inc_id, ev[0], ev[1], ev[2], ev[3]),
            )

        for re in inc["risk_events"]:
            cur.execute(
                """
                INSERT INTO risk_events (incident_id, from_level, to_level, reason, delta_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (inc_id, re[0], re[1], re[2], re[3], now),
            )

        for aa in inc["agent_actions"]:
            cur.execute(
                """
                INSERT INTO agent_actions (incident_id, agent_name, action_type, reasoning, output_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (inc_id, aa[0], aa[1], aa[2], json.dumps(aa[3]), now),
            )

        dec = inc["decision"]
        cur.execute(
            """
            INSERT INTO user_decisions (incident_id, user_id, decision_type, user_comment, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (inc_id, user_id, dec[0], dec[1], dec[2]),
        )

    conn.commit()
