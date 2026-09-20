"""
Guardian Unified REST & WebSocket API Routes
Includes Authentication, AI Call Assistant (Equal AI Model), URL Shield, UPI Payment Shield, Incidents, and WebSocket Hub.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse

from .auth import get_current_user, create_access_token, get_user_by_username
from .guardian_db import get_db_connection, hash_password_simple
from .pipeline_guardian import GuardianPipeline
from .events_manager import events_hub

router = APIRouter()


# ----------------------------------------------------
# Pydantic Request Models
# ----------------------------------------------------

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = "Guardian User"


class LoginRequest(BaseModel):
    username: str
    password: str


class CallScreenStartRequest(BaseModel):
    caller_phone: str = "+91 98765 43210"
    caller_name: Optional[str] = "Unknown Caller"


class CallTurnTwoWayRequest(BaseModel):
    call_id: str
    caller_text: str
    turn_history: List[Dict[str, Any]] = []
    previous_level: str = "SAFE"


class CallTakeoverRequest(BaseModel):
    call_id: str


class CallConcludeRequest(BaseModel):
    call_id: str
    caller_phone: str
    turn_history: List[Dict[str, Any]]
    final_risk: str
    final_score: int
    action_taken: str  # USER_TERMINATED_CALL, USER_TAKEOVER, CALL_COMPLETED
    duration_sec: int = 45


class UrlInspectRequest(BaseModel):
    url: str
    device_name: Optional[str] = "Pixel 8 Pro (Guardian Shield)"


class UrlDecisionRequest(BaseModel):
    incident_id: int
    decision: str  # USER_RETURNED_TO_SAFETY, USER_PROCEEDED_ANYWAY
    comment: Optional[str] = None


class PaymentInterceptRequest(BaseModel):
    payload: str  # upi://pay?... or raw VPA
    device_name: Optional[str] = "Pixel 8 Pro (Guardian Shield)"


class PaymentDecisionRequest(BaseModel):
    incident_id: int
    decision: str  # CANCELLED_BY_USER, PROCEEDED_DESPITE_WARNING
    comment: Optional[str] = None


class ThreatReportRequest(BaseModel):
    entity_type: str  # domain, upi_vpa, phone
    entity_value: str
    risk_category: str
    notes: Optional[str] = None


# ----------------------------------------------------
# Authentication Endpoints
# ----------------------------------------------------

@router.post("/auth/register")
def register(req: RegisterRequest):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username = ? OR email = ?", (req.username, req.email))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Username or email already registered")

    now = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password_simple(req.password)
    cur.execute(
        "INSERT INTO users (username, email, hashed_password, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
        (req.username, req.email, pw_hash, req.full_name, now),
    )
    user_id = cur.lastrowid
    cur.execute(
        "INSERT INTO protection_settings (user_id, call_protection, url_protection, upi_protection, sms_protection) VALUES (?, 1, 1, 1, 1)",
        (user_id,),
    )
    cur.execute(
        "INSERT INTO devices (user_id, device_name, device_model, os_version, is_active, last_seen) VALUES (?, ?, ?, ?, 1, ?)",
        (user_id, "Android Mobile Shield", "Android 14", "API 34", now),
    )
    conn.commit()
    conn.close()

    token = create_access_token({"sub": str(user_id), "username": req.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user_id, "username": req.username, "email": req.email, "full_name": req.full_name},
    }


@router.post("/auth/login")
def login(req: LoginRequest):
    user = get_user_by_username(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if user["hashed_password"] != hash_password_simple(req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"], "email": user["email"], "full_name": user["full_name"]},
    }


@router.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    return user


@router.get("/auth/settings")
def get_user_settings(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM protection_settings WHERE user_id = ?", (user["id"],))
    row = cur.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "user_id": user["id"],
        "call_protection": 1,
        "url_protection": 1,
        "upi_protection": 1,
        "sms_protection": 1,
        "ai_screening_mode": "AUTO_SCREEN_UNKNOWN",
        "auto_block_threshold": 80,
        "aggressive_mode": 0,
        "notifications_enabled": 1,
    }


@router.post("/auth/settings")
def update_user_settings(settings: dict, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO protection_settings (user_id, call_protection, url_protection, upi_protection, sms_protection, ai_screening_mode, auto_block_threshold, aggressive_mode, notifications_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            call_protection=excluded.call_protection,
            url_protection=excluded.url_protection,
            upi_protection=excluded.upi_protection,
            sms_protection=excluded.sms_protection,
            ai_screening_mode=excluded.ai_screening_mode,
            auto_block_threshold=excluded.auto_block_threshold,
            aggressive_mode=excluded.aggressive_mode,
            notifications_enabled=excluded.notifications_enabled
        """,
        (
            user["id"],
            int(settings.get("call_protection", 1)),
            int(settings.get("url_protection", 1)),
            int(settings.get("upi_protection", 1)),
            int(settings.get("sms_protection", 1)),
            str(settings.get("ai_screening_mode", "AUTO_SCREEN_UNKNOWN")),
            int(settings.get("auto_block_threshold", 80)),
            int(settings.get("aggressive_mode", 0)),
            int(settings.get("notifications_enabled", 1)),
        ),
    )
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Settings updated"}


# ----------------------------------------------------
# HERO 1: EQUAL AI-INSPIRED CALL ASSISTANT
# ----------------------------------------------------

@router.post("/guardian/call/screen-start")
async def start_call_screening(req: CallScreenStartRequest, user: dict = Depends(get_current_user)):
    """Initiates autonomous AI call screening for an incoming unknown caller."""
    res = await GuardianPipeline.start_call_screening(
        caller_phone=req.caller_phone,
        caller_name=req.caller_name or "Unknown Caller",
        user_id=user["id"],
    )
    return res


@router.post("/guardian/call/turn-twoway")
async def process_call_turn_twoway(req: CallTurnTwoWayRequest, user: dict = Depends(get_current_user)):
    """Processes incoming caller speech turn and generates intelligent AI assistant response + trajectory risk."""
    res = await GuardianPipeline.process_call_turn_assisted(
        call_id=req.call_id,
        caller_text=req.caller_text,
        turn_history=req.turn_history,
        previous_level=req.previous_level,
        user_id=user["id"],
    )
    return res


@router.post("/guardian/call/takeover")
async def takeover_call(req: CallTakeoverRequest, user: dict = Depends(get_current_user)):
    """User steps in to take over the call from the Guardian AI screening assistant."""
    await events_hub.broadcast_event("USER_TAKEOVER", {
        "call_id": req.call_id,
        "message": "User has taken over live voice call from Guardian AI.",
    })
    return {"status": "success", "message": "Call transferred to user"}


@router.post("/guardian/call/conclude")
async def conclude_call_and_summarize(req: CallConcludeRequest, user: dict = Depends(get_current_user)):
    """Ends call interaction and automatically synthesizes post-call incident briefing."""
    res = await GuardianPipeline.end_call_and_create_incident(
        call_id=req.call_id,
        caller_phone=req.caller_phone,
        turn_history=req.turn_history,
        final_risk=req.final_risk,
        final_score=req.final_score,
        action_taken=req.action_taken,
        duration_sec=req.duration_sec,
        user_id=user["id"],
    )
    return res


@router.get("/guardian/call/sessions")
def list_call_sessions(limit: int = 20, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM call_sessions WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user["id"], limit))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.get("/guardian/call/sessions/{call_id}")
def get_call_session_detail(call_id: str, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM call_sessions WHERE call_id = ? AND user_id = ?", (call_id, user["id"]))
    session = cur.fetchone()
    if not session:
        conn.close()
        raise HTTPException(status_code=404, detail="Call session not found")

    cur.execute("SELECT * FROM transcript_segments WHERE call_session_id = ? ORDER BY turn_index ASC", (session["id"],))
    segments = [dict(r) for r in cur.fetchall()]
    conn.close()

    return {
        "session": dict(session),
        "transcript": segments,
    }


# ----------------------------------------------------
# HERO 2: PRE-NAVIGATION URL PROTECTION
# ----------------------------------------------------

@router.post("/guardian/url/inspect")
async def inspect_url(req: UrlInspectRequest, user: dict = Depends(get_current_user)):
    """Pre-navigation URL inspection before browser load."""
    res = await GuardianPipeline.process_url_navigation(
        url=req.url,
        user_id=user["id"],
        device_name=req.device_name or "Android Shield",
    )
    return res


@router.post("/guardian/url/decision")
async def record_url_decision(req: UrlDecisionRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO user_decisions (incident_id, user_id, decision_type, user_comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (req.incident_id, user["id"], req.decision, req.comment, now),
    )
    cur.execute("UPDATE incidents SET status = ? WHERE id = ?", (req.decision, req.incident_id))
    conn.commit()
    conn.close()

    await events_hub.broadcast_event("USER_CONFIRMED" if req.decision == "USER_RETURNED_TO_SAFETY" else "USER_DISMISSED", {
        "incident_id": req.incident_id,
        "decision": req.decision,
        "timestamp": now,
    })
    return {"status": "success", "decision": req.decision}


# ----------------------------------------------------
# HERO 3: REAL-TIME QR / UPI PAYMENT PROTECTION
# ----------------------------------------------------

@router.post("/guardian/payment/intercept")
async def intercept_payment(req: PaymentInterceptRequest, user: dict = Depends(get_current_user)):
    """Intercept and analyze UPI Intent / QR payload before handoff."""
    res = await GuardianPipeline.process_upi_payment(
        payload_str=req.payload,
        user_id=user["id"],
        device_name=req.device_name or "Android Shield",
    )
    return res


@router.post("/guardian/payment/decision")
async def record_payment_decision(req: PaymentDecisionRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO user_decisions (incident_id, user_id, decision_type, user_comment, created_at) VALUES (?, ?, ?, ?, ?)",
        (req.incident_id, user["id"], req.decision, req.comment, now),
    )
    cur.execute("UPDATE incidents SET status = ? WHERE id = ?", (req.decision, req.incident_id))
    conn.commit()
    conn.close()

    await events_hub.broadcast_event("USER_CONFIRMED" if req.decision == "CANCELLED_BY_USER" else "USER_DISMISSED", {
        "incident_id": req.incident_id,
        "decision": req.decision,
        "timestamp": now,
    })
    return {"status": "success", "decision": req.decision}


# ----------------------------------------------------
# Incidents & Dashboard Statistics
# ----------------------------------------------------

@router.get("/guardian/dashboard/stats")
def get_dashboard_stats(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM incidents WHERE user_id = ?", (user["id"],))
    total_incidents = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE user_id = ? AND (risk_level = 'CRITICAL' OR risk_level = 'HIGH')", (user["id"],))
    threats_blocked = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE user_id = ? AND source LIKE '%UPI%'", (user["id"],))
    payments_protected = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE user_id = ? AND (source LIKE '%Call%' OR source LIKE '%Screening%')", (user["id"],))
    calls_screened = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM incidents WHERE user_id = ? AND source LIKE '%Navigation%'", (user["id"],))
    urls_scanned = cur.fetchone()[0]

    cur.execute("SELECT * FROM incidents WHERE user_id = ? ORDER BY id DESC LIMIT 10", (user["id"],))
    recent_incidents = [dict(r) for r in cur.fetchall()]

    conn.close()

    return {
        "protection_status": "ACTIVE",
        "shield_version": "Guardian AI 2.0 (Equal AI Model)",
        "total_incidents": total_incidents,
        "threats_blocked": threats_blocked,
        "payments_protected": payments_protected,
        "calls_analyzed": calls_screened,
        "urls_scanned": urls_scanned,
        "recent_incidents": recent_incidents,
    }


@router.get("/guardian/incidents")
def list_incidents(
    threat_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    conn = get_db_connection()
    cur = conn.cursor()

    query = "SELECT * FROM incidents WHERE user_id = ?"
    params = [user["id"]]

    if threat_type:
        query += " AND threat_type LIKE ?"
        params.append(f"%{threat_type}%")
    if risk_level:
        query += " AND risk_level = ?"
        params.append(risk_level)

    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    cur.execute(query, tuple(params))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.get("/guardian/incidents/{incident_id}")
def get_incident_detail(incident_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM incidents WHERE id = ? AND user_id = ?", (incident_id, user["id"]))
    inc = cur.fetchone()
    if not inc:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    cur.execute("SELECT * FROM evidence WHERE incident_id = ?", (incident_id,))
    evidence_items = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM risk_events WHERE incident_id = ? ORDER BY id ASC", (incident_id,))
    risk_events = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM agent_actions WHERE incident_id = ? ORDER BY id ASC", (incident_id,))
    agent_actions = [dict(r) for r in cur.fetchall()]

    cur.execute("SELECT * FROM user_decisions WHERE incident_id = ? ORDER BY id DESC", (incident_id,))
    user_decisions = [dict(r) for r in cur.fetchall()]

    # Fetch transcript segments if associated with a call
    transcript_segments = []
    if inc["call_session_id"]:
        cur.execute("SELECT * FROM transcript_segments WHERE call_session_id = ? ORDER BY turn_index ASC", (inc["call_session_id"],))
        transcript_segments = [dict(r) for r in cur.fetchall()]

    conn.close()

    return {
        "incident": dict(inc),
        "evidence": evidence_items,
        "risk_events": risk_events,
        "agent_actions": agent_actions,
        "user_decisions": user_decisions,
        "transcript": transcript_segments,
    }


# ----------------------------------------------------
# Threat Intelligence Registry
# ----------------------------------------------------

@router.get("/guardian/intelligence/entities")
def list_threat_entities(limit: int = 50):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM threat_entities ORDER BY report_count DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


@router.post("/guardian/intelligence/report")
def report_threat(req: ThreatReportRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO threat_entities (entity_type, entity_value, risk_category, reputation_score, report_count, metadata_json, created_at)
        VALUES (?, ?, ?, 90, 1, ?, ?)
        ON CONFLICT(entity_value) DO UPDATE SET
            report_count = report_count + 1
        """,
        (req.entity_type, req.entity_value.strip(), req.risk_category, json.dumps({"notes": req.notes, "reporter": user["username"]}), now),
    )
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Threat entity indexed in intelligence feed"}


# ----------------------------------------------------
# WebSocket Endpoint for Live Real-Time Events
# ----------------------------------------------------

@router.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await events_hub.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
    except WebSocketDisconnect:
        events_hub.disconnect(websocket)
    except Exception:
        events_hub.disconnect(websocket)


# ----------------------------------------------------
# DIRECT APK DOWNLOAD ENDPOINT
# ----------------------------------------------------

@router.get("/download/apk")
async def download_apk_endpoint():
    """Direct downloadable APK endpoint for Android devices."""
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../static/guardian-ai-debug.apk")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/public/download/guardian-ai-debug.apk")),
    ]
    for path in candidates:
        if os.path.exists(path):
            return FileResponse(
                path=path,
                filename="guardian-ai-debug.apk",
                media_type="application/vnd.android.package-archive"
            )
    raise HTTPException(status_code=404, detail="Guardian Android APK package not found")
