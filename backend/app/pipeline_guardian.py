"""
Guardian Pipeline Orchestrator — Featuring Equal AI Call Assistant, URL Interception, and Pre-Payment Verification.
Coordinates the 6-agent lifecycle: Detection -> Investigation -> Evidence -> Risk -> Response -> Explanation.
Persists incidents and call sessions to guardian.db and broadcasts real-time events.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from .agents import (
    DetectionAgent,
    InvestigationAgent,
    EvidenceAgent,
    RiskAgent,
    ResponseAgent,
    ExplanationAgent,
)
from .guardian_db import get_db_connection
from .events_manager import events_hub


class GuardianPipeline:
    """End-to-end protective pipeline for AI Call Assistant, URLs, and QR/UPI payments."""

    # -------------------------------------------------------------------------
    # EQUAL AI-INSPIRED CALL ASSISTANT WORKFLOW
    # -------------------------------------------------------------------------

    @classmethod
    async def start_call_screening(
        cls,
        caller_phone: str = "+91 98765 43210",
        caller_name: str = "Unknown Caller",
        user_id: int = 1,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        call_id = f"CALL-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO call_sessions (user_id, call_id, caller_phone, caller_name, call_status, duration_sec, initial_risk, final_risk, final_score, purpose, summary, recommended_action, created_at)
            VALUES (?, ?, ?, ?, 'SCREENING', 0, 'SAFE', 'SAFE', 0, 'Unknown call screening initiated', 'Guardian AI screening active', 'Monitor caller identity', ?)
            """,
            (user_id, call_id, caller_phone, caller_name, now),
        )
        session_db_id = cur.lastrowid

        # Initial Guardian AI screening greeting
        initial_ai_greeting = f"Hello, this is Guardian AI safety assistant on behalf of the recipient. Please state your name, organization, and the purpose of your call."

        cur.execute(
            """
            INSERT INTO transcript_segments (call_session_id, turn_index, speaker, text, detected_cues_json, risk_level, timestamp)
            VALUES (?, 0, 'GUARDIAN_AI', ?, '[]', 'SAFE', ?)
            """,
            (session_db_id, initial_ai_greeting, now),
        )
        conn.commit()
        conn.close()

        # Broadcast real-time events
        await events_hub.broadcast_event("CALL_STARTED", {
            "call_id": call_id,
            "caller_phone": caller_phone,
            "caller_name": caller_name,
            "timestamp": now,
        })

        await events_hub.broadcast_event("CALL_ASSISTANCE_STARTED", {
            "call_id": call_id,
            "assistant_role": "AI Screening Agent",
            "greeting": initial_ai_greeting,
        })

        return {
            "call_id": call_id,
            "session_db_id": session_db_id,
            "caller_phone": caller_phone,
            "caller_name": caller_name,
            "status": "SCREENING",
            "initial_greeting": initial_ai_greeting,
            "current_risk": "SAFE",
            "current_score": 0,
            "created_at": now,
        }

    @classmethod
    async def process_call_turn_assisted(
        cls,
        call_id: str,
        caller_text: str,
        turn_history: List[Dict[str, Any]],
        previous_level: str = "SAFE",
        user_id: int = 1,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        turn_index = len(turn_history) + 1

        # 1. Detection Agent: Parse caller turn cues
        turn_data = DetectionAgent.parse_call_turn(caller_text, turn_index=turn_index)
        updated_history = turn_history + [{"speaker": "CALLER", "text": caller_text, "detected_cues": turn_data["detected_cues"]}]

        # Broadcast caller speech event
        await events_hub.broadcast_event("TRANSCRIPT_UPDATED", {
            "call_id": call_id,
            "speaker": "CALLER",
            "text": caller_text,
            "detected_cues": turn_data["detected_cues"],
        })

        if turn_data["has_threat_cues"]:
            await events_hub.broadcast_event("SUSPICIOUS_SPEECH_DETECTED", {
                "call_id": call_id,
                "cues": turn_data["detected_cues"],
                "text": caller_text,
            })

        # 2. Investigation Agent: Deep Trajectory Analysis
        inv_data = InvestigationAgent.investigate_call_trajectory(updated_history)

        # 3. Evidence Agent
        evidence_data = EvidenceAgent.synthesize_evidence(inv_data["signals"])

        # 4. Risk Agent: Dynamic State Machine
        risk_data = RiskAgent.evaluate_risk(evidence_data, previous_level=previous_level, context="CALL")

        if previous_level != risk_data["risk_level"]:
            await events_hub.broadcast_event("RISK_CHANGED", {
                "call_id": call_id,
                "channel": "CALL",
                "previousRisk": previous_level,
                "newRisk": risk_data["risk_level"],
                "score": risk_data["risk_score"],
                "reason": risk_data["transition_reason"],
                "confidence": evidence_data["confidence_score"] / 100.0,
                "evidence": [s["title"] for s in inv_data["signals"]],
            })

        # 5. Response Agent: Formulate intelligent, authoritative AI Assistant dialogue response
        cues = inv_data["cues_observed"]
        caller_lower = caller_text.lower()
        
        if "PAYMENT_DEMAND" in cues:
            ai_response_text = "Security Warning: Official agencies and banks never demand emergency fund transfers, UPI deposits, or bail bonds over the phone. This request is blocked and logged."
        elif "OTP_REQUEST" in cues:
            ai_response_text = "Policy Alert: Guardian AI strictly blocks disclosure of OTPs, CVVs, and passwords. Under RBI guidelines, legitimate representatives are prohibited from asking for verification codes."
        elif "DIGITAL_ARREST_COERCION" in cues:
            ai_response_text = "Legal Notice: The concept of 'Digital Arrest' has zero legal validity under Indian law. Law enforcement does not interrogate or detain citizens over Skype or video calls. Please provide your jurisdictional police station."
        elif "CONTRABAND_PARCEL_SCAM" in cues:
            ai_response_text = "Customs Notice: Courier customs issues must be communicated via official physical postal notices from Indian Customs, not unsolicited phone calls. Please state your official customs officer ID."
        elif "REMOTE_ACCESS_REQUEST" in cues:
            ai_response_text = "System Alert: Guardian AI policy prohibits installing remote screen-sharing software (AnyDesk/TeamViewer). This call has been flagged for unauthorized access attempts."
        elif "URGENCY_PRESSURE" in cues and "AUTHORITY_CLAIM" in cues:
            ai_response_text = "Understood. Before proceeding, please provide your official employee ID, case FIR number, and verified station landline so Guardian AI can cross-verify your credentials."
        elif "AUTHORITY_CLAIM" in cues:
            ai_response_text = "Please state your official badge ID, department designation, and registered case file number for identity verification."
        elif "URGENCY_PRESSURE" in cues:
            ai_response_text = "Guardian AI has logged your urgency claim. Please be aware that official regulatory deadlines require written formal communication."
        elif any(w in caller_lower for w in ["alex", "hello", "hi", "listening", "who is this"]):
            ai_response_text = "This is Guardian AI assistant screening on behalf of the recipient. Please state your full name, organization, and the explicit purpose of your call."
        elif any(w in caller_lower for w in ["delivery", "parcel", "amazon", "courier", "package"]):
            ai_response_text = "Thank you. If this is a verified delivery, please leave the package with the building security guard or reception. No OTP is required for standard drop-off."
        else:
            ai_response_text = "Thank you. Your statement has been recorded in the call transcript. Please state how you would like the recipient to follow up with your verified office."

        intervention = ResponseAgent.determine_intervention(risk_data, channel="CALL")
        if intervention["intervention_action"] == "OVERLAY_CALL_INTERVENTION":
            await events_hub.broadcast_event("WARNING_TRIGGERED", {
                "call_id": call_id,
                "action": intervention["intervention_action"],
                "risk_level": risk_data["risk_level"],
                "alert": "OTP or fund transfer requested during active phone call!",
            })

        # 6. Explanation Agent
        explanation = ExplanationAgent.generate_explanation(
            channel="CALL",
            signals=inv_data["signals"],
            risk_level=risk_data["risk_level"],
            entity_info={"call_id": call_id, "turns": len(updated_history)},
        )

        # Append Guardian AI response to history
        updated_history.append({"speaker": "GUARDIAN_AI", "text": ai_response_text, "detected_cues": []})

        # Broadcast AI Assistant response
        await events_hub.broadcast_event("TRANSCRIPT_UPDATED", {
            "call_id": call_id,
            "speaker": "GUARDIAN_AI",
            "text": ai_response_text,
            "detected_cues": [],
        })

        return {
            "call_id": call_id,
            "caller_turn": turn_data,
            "ai_response": ai_response_text,
            "updated_history": updated_history,
            "cues_observed": inv_data["cues_observed"],
            "evidence": evidence_data,
            "risk": risk_data,
            "intervention": intervention,
            "explanation": explanation,
            "analyzed_at": now,
        }

    @classmethod
    async def end_call_and_create_incident(
        cls,
        call_id: str,
        caller_phone: str,
        turn_history: List[Dict[str, Any]],
        final_risk: str,
        final_score: int,
        action_taken: str,
        duration_sec: int = 45,
        user_id: int = 1,
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        incident_num = f"GRD-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"

        # 1. Synthesize summary & concerns
        detected_concerns = []
        for t in turn_history:
            for cue in t.get("detected_cues", []):
                if cue not in detected_concerns:
                    detected_concerns.append(cue)

        purpose_summary = "Caller initiated an inquiry screened by Guardian AI."
        if "PAYMENT_DEMAND" in detected_concerns or "OTP_REQUEST" in detected_concerns:
            purpose_summary = "Impersonated authority figure demanding live OTP code and emergency fund transfer."
        elif "AUTHORITY_CLAIM" in detected_concerns:
            purpose_summary = "Claimed institutional authority with artificial urgency pressure."

        rec_action = "No action needed. Interaction verified normal."
        if final_risk in ["CRITICAL", "HIGH"]:
            rec_action = "Do NOT share OTP or transfer money. File incident report at cybercrime.gov.in."

        conn = get_db_connection()
        cur = conn.cursor()

        # Update Call Session
        cur.execute(
            """
            UPDATE call_sessions
            SET call_status = ?, duration_sec = ?, final_risk = ?, final_score = ?, purpose = ?, summary = ?, recommended_action = ?, ended_at = ?
            WHERE call_id = ?
            """,
            (action_taken, duration_sec, final_risk, final_score, purpose_summary, purpose_summary, rec_action, now, call_id),
        )

        # Fetch session db id
        cur.execute("SELECT id FROM call_sessions WHERE call_id = ?", (call_id,))
        row = cur.fetchone()
        session_db_id = row[0] if row else None

        # Insert Incident if risk was elevated or user acted
        incident_id = None
        if final_risk in ["CRITICAL", "HIGH", "SUSPICIOUS"] or action_taken in ["USER_TERMINATED_CALL", "USER_TAKEOVER"]:
            cur.execute(
                """
                INSERT INTO incidents (user_id, incident_number, threat_type, source, risk_level, risk_score, confidence, status, summary, raw_payload, call_session_id, created_at, updated_at)
                VALUES (?, ?, 'AI Call Assistant: Extortion / Fraud', 'Guardian AI Live Screening', ?, ?, 95, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    incident_num,
                    final_risk,
                    final_score,
                    action_taken,
                    f"Call with {caller_phone} screened by Guardian AI. Final risk: {final_risk} ({action_taken}).",
                    json.dumps({"call_id": call_id, "caller": caller_phone, "turns": len(turn_history), "concerns": detected_concerns}),
                    session_db_id,
                    now,
                    now,
                ),
            )
            incident_id = cur.lastrowid

            # Add Evidence
            for concern in detected_concerns:
                cur.execute(
                    """
                    INSERT INTO evidence (incident_id, signal_key, title, description, confidence_weight, is_contradicting)
                    VALUES (?, ?, ?, ?, 0.92, 0)
                    """,
                    (incident_id, concern, concern.replace("_", " ").title(), f"Detected behavioral pattern during live call screening: {concern}",),
                )

            # Record decision
            cur.execute(
                "INSERT INTO user_decisions (incident_id, user_id, decision_type, user_comment, created_at) VALUES (?, ?, ?, ?, ?)",
                (incident_id, user_id, action_taken, f"Call concluded with action: {action_taken}", now),
            )

        conn.commit()
        conn.close()

        # Broadcast WebSocket event
        await events_hub.broadcast_event("INCIDENT_CREATED", {
            "incident_number": incident_num,
            "call_id": call_id,
            "caller_phone": caller_phone,
            "final_risk": final_risk,
            "action_taken": action_taken,
            "detected_concerns": detected_concerns,
        })

        await events_hub.broadcast_event("INCIDENT_RESOLVED", {
            "call_id": call_id,
            "caller": caller_phone,
            "action": action_taken,
            "final_risk": final_risk,
        })

        return {
            "call_id": call_id,
            "incident_id": incident_id,
            "incident_number": incident_num,
            "caller_phone": caller_phone,
            "duration_sec": duration_sec,
            "purpose_summary": purpose_summary,
            "detected_concerns": detected_concerns,
            "final_risk": final_risk,
            "final_score": final_score,
            "recommended_action": rec_action,
            "action_taken": action_taken,
            "ended_at": now,
        }

    # -------------------------------------------------------------------------
    # URL PRE-NAVIGATION INTERCEPTION WORKFLOW
    # -------------------------------------------------------------------------

    @classmethod
    async def process_url_navigation(
        cls,
        url: str,
        user_id: int = 1,
        device_name: str = "Android Device",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        
        # 1. Detection Agent: Parse intent
        url_data = DetectionAgent.parse_url_intent(url)
        await events_hub.broadcast_event("URL_DETECTED", {
            "url": url,
            "hostname": url_data["hostname"],
            "device": device_name,
        })

        # 2. Investigation Agent: Deep lookup
        inv_data = InvestigationAgent.investigate_url(url_data)

        # 3. Evidence Agent: Weigh signals
        evidence_data = EvidenceAgent.synthesize_evidence(inv_data["signals"])

        # 4. Risk Agent: Stateful evaluation
        risk_data = RiskAgent.evaluate_risk(evidence_data, previous_level="SAFE", context="URL")
        await events_hub.broadcast_event("URL_RISK_CHANGED", {
            "url": url,
            "hostname": url_data["hostname"],
            "previousRisk": "SAFE",
            "newRisk": risk_data["risk_level"],
            "score": risk_data["risk_score"],
            "reason": risk_data["transition_reason"],
        })

        # 5. Response Agent: Intervention policy
        intervention = ResponseAgent.determine_intervention(risk_data, channel="URL")
        if intervention["intervention_action"] == "PAUSE_NAVIGATION":
            await events_hub.broadcast_event("WARNING_TRIGGERED", {
                "channel": "URL",
                "action": intervention["intervention_action"],
                "target": url_data["hostname"],
                "risk_level": risk_data["risk_level"],
            })

        # 6. Explanation Agent: Breakdown
        explanation = ExplanationAgent.generate_explanation(
            channel="URL",
            signals=inv_data["signals"],
            risk_level=risk_data["risk_level"],
            entity_info={"url": url, "domain": inv_data["registered_domain"]},
        )

        incident_num = f"GRD-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        status = "WARNING_TRIGGERED" if risk_data["risk_level"] in ["CRITICAL", "HIGH"] else ("FLAGGED" if risk_data["risk_level"] == "SUSPICIOUS" else "VERIFIED_SAFE")

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO incidents (user_id, incident_number, threat_type, source, risk_level, risk_score, confidence, status, summary, raw_payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                incident_num,
                "Phishing / Malicious URL" if risk_data["risk_level"] != "SAFE" else "Safe Website",
                "Browser Navigation Intercept",
                risk_data["risk_level"],
                risk_data["risk_score"],
                risk_data["confidence"],
                status,
                f"Navigation to '{url_data['hostname']}' analyzed with verdict {risk_data['risk_level']}.",
                json.dumps(url_data),
                now,
                now,
            ),
        )
        incident_id = cur.lastrowid

        for ev in inv_data["signals"]:
            cur.execute(
                """
                INSERT INTO evidence (incident_id, signal_key, title, description, confidence_weight, is_contradicting)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (incident_id, ev.get("key", "SIG"), ev.get("title", ""), ev.get("description", ""), ev.get("weight", 0.5)),
            )

        cur.execute(
            """
            INSERT INTO risk_events (incident_id, from_level, to_level, reason, delta_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (incident_id, "SAFE", risk_data["risk_level"], risk_data["transition_reason"], risk_data["risk_score"], now),
        )

        cur.execute(
            """
            INSERT INTO agent_actions (incident_id, agent_name, action_type, reasoning, output_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (incident_id, "Response Agent", intervention["intervention_action"], intervention["recommendation"], json.dumps(intervention), now),
        )

        conn.commit()
        conn.close()

        return {
            "incident_id": incident_id,
            "incident_number": incident_num,
            "url_data": url_data,
            "investigation": inv_data,
            "evidence": evidence_data,
            "risk": risk_data,
            "intervention": intervention,
            "explanation": explanation,
            "analyzed_at": now,
        }

    # -------------------------------------------------------------------------
    # QR / UPI PRE-PAYMENT PROTECTION WORKFLOW
    # -------------------------------------------------------------------------

    @classmethod
    async def process_upi_payment(
        cls,
        payload_str: str,
        user_id: int = 1,
        device_name: str = "Android Device",
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()

        # 1. Detection Agent: Parse UPI/QR intent
        upi_data = DetectionAgent.parse_upi_intent(payload_str)
        await events_hub.broadcast_event("PAYMENT_INTENT_CREATED", {
            "vpa": upi_data["vpa"],
            "amount": upi_data["amount"],
            "payee_name": upi_data["payee_name"],
            "device": device_name,
        })

        # 2. Investigation Agent: UPI reputation & pattern lookup
        inv_data = InvestigationAgent.investigate_upi(upi_data)

        # 3. Evidence Agent
        evidence_data = EvidenceAgent.synthesize_evidence(inv_data["signals"])

        # 4. Risk Agent
        risk_data = RiskAgent.evaluate_risk(evidence_data, previous_level="SAFE", context="UPI")
        await events_hub.broadcast_event("PAYMENT_RISK_CHANGED", {
            "vpa": upi_data["vpa"],
            "previousRisk": "SAFE",
            "newRisk": risk_data["risk_level"],
            "score": risk_data["risk_score"],
            "reason": risk_data["transition_reason"],
        })

        # 5. Response Agent
        intervention = ResponseAgent.determine_intervention(risk_data, channel="UPI")
        if intervention["intervention_action"] == "BLOCK_PAYMENT_HANDOFF":
            await events_hub.broadcast_event("WARNING_TRIGGERED", {
                "channel": "UPI",
                "action": "BLOCK_PAYMENT_HANDOFF",
                "vpa": upi_data["vpa"],
                "amount": upi_data["amount"],
                "risk_level": risk_data["risk_level"],
            })

        # 6. Explanation Agent
        explanation = ExplanationAgent.generate_explanation(
            channel="UPI",
            signals=inv_data["signals"],
            risk_level=risk_data["risk_level"],
            entity_info=upi_data,
        )

        incident_num = f"GRD-{datetime.now().strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        status = "BLOCKED" if risk_data["risk_level"] in ["CRITICAL", "HIGH"] else ("VERIFICATION_REQUIRED" if risk_data["risk_level"] == "SUSPICIOUS" else "APPROVED")

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO incidents (user_id, incident_number, threat_type, source, risk_level, risk_score, confidence, status, summary, raw_payload, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                incident_num,
                "UPI Fraud / Deceptive Payment" if risk_data["risk_level"] != "SAFE" else "Verified Payment",
                "UPI QR / Intent Handoff",
                risk_data["risk_level"],
                risk_data["risk_score"],
                risk_data["confidence"],
                status,
                f"Payment intent to '{upi_data['vpa']}' for ₹{upi_data['amount']:,.2f} checked with verdict {risk_data['risk_level']}.",
                json.dumps(upi_data),
                now,
                now,
            ),
        )
        incident_id = cur.lastrowid

        for ev in inv_data["signals"]:
            cur.execute(
                """
                INSERT INTO evidence (incident_id, signal_key, title, description, confidence_weight, is_contradicting)
                VALUES (?, ?, ?, ?, ?, 0)
                """,
                (incident_id, ev.get("key", "SIG"), ev.get("title", ""), ev.get("description", ""), ev.get("weight", 0.5)),
            )

        cur.execute(
            """
            INSERT INTO risk_events (incident_id, from_level, to_level, reason, delta_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (incident_id, "SAFE", risk_data["risk_level"], risk_data["transition_reason"], risk_data["risk_score"], now),
        )

        cur.execute(
            """
            INSERT INTO agent_actions (incident_id, agent_name, action_type, reasoning, output_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (incident_id, "Response Agent", intervention["intervention_action"], intervention["recommendation"], json.dumps(intervention), now),
        )

        conn.commit()
        conn.close()

        return {
            "incident_id": incident_id,
            "incident_number": incident_num,
            "upi_data": upi_data,
            "investigation": inv_data,
            "evidence": evidence_data,
            "risk": risk_data,
            "intervention": intervention,
            "explanation": explanation,
            "analyzed_at": now,
        }
