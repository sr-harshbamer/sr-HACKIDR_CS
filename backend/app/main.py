"""
Guardian — Real-Time Digital Scam Protection Platform
FastAPI main server with WebSocket event streaming, Agentic Risk Engine, and Proactive Threat Defense.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .guardian_db import init_guardian_db
from .api_routes import router as guardian_router
from .modules.data_access import (
    init_db as init_veridra_db,
    insights_summary,
    recent_history,
    save_analysis,
)
from .modules.pipeline import run_analysis
from .modules.audio_analysis import analyze_audio_file
from .modules.risk_scoring import score_signals
from .modules.safe_action_guidance import build_safe_actions
from .modules.block_report_guidance import build_block_report_guidance
from .modules.explanation_engine import (
    build_highlighted_phrases,
    build_why_flagged,
    build_why_not_proceed,
)
from .modules.schemas import (
    AnalysisMode,
    AnalysisRequest,
    AnalysisResult,
    RiskLevel,
    ThreatCategory,
)

app = FastAPI(
    title="Guardian Real-Time Cyber Protection API",
    description="Proactive, explainable, real-time scam and fraud defense engine.",
    version="2.0.0",
)

# Initialize persistent SQLite databases
init_guardian_db()
try:
    init_veridra_db()
except Exception:
    pass

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Guardian API routes
app.include_router(guardian_router, prefix="/api")


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "Guardian Cyber Defense Platform",
        "version": "2.0.0",
        "mode": "PROACTIVE_REALTIME",
    }


# Backward-compatible endpoint for classic manual analyzer
@app.post("/api/analyze", response_model=AnalysisResult)
def analyze(req: AnalysisRequest) -> AnalysisResult:
    result = run_analysis(req)
    try:
        save_analysis(req.content, result)
    except Exception:
        pass
    return result


@app.get("/api/insights")
def get_insights() -> dict:
    return insights_summary()


@app.get("/api/history")
def get_history(limit: int = 20) -> list:
    return recent_history(limit)


@app.post("/api/analyze-audio", response_model=AnalysisResult)
async def analyze_audio_endpoint(file: UploadFile = File(...)) -> AnalysisResult:
    audio_bytes = await file.read()
    signals, category = analyze_audio_file(audio_bytes)
    score, level, (conf_low, conf_high) = score_signals(signals)

    if level == RiskLevel.SAFE and category == ThreatCategory.NONE:
        why_flagged = [
            "No known voice scam or synthetic speech indicators were detected."
        ]
        why_not_proceed = [
            "Always verify caller credentials before disclosing sensitive financial information."
        ]
    else:
        why_flagged = build_why_flagged(signals)
        why_not_proceed = build_why_not_proceed(signals)

    safe_actions = build_safe_actions(AnalysisMode.CALL, category, signals)
    block_report = build_block_report_guidance(AnalysisMode.CALL, category)
    highlights = build_highlighted_phrases(signals)

    result = AnalysisResult(
        mode=AnalysisMode.CALL,
        risk_level=level,
        risk_score=score,
        confidence_low=conf_low,
        confidence_high=conf_high,
        threat_category=category,
        signals=signals,
        why_flagged=why_flagged,
        why_not_proceed=why_not_proceed,
        safe_actions=safe_actions,
        block_report_guidance=block_report,
        highlighted_phrases=highlights,
        analyzed_at=datetime.now(timezone.utc).isoformat(timespec="seconds") + "Z",
    )
    try:
        save_analysis(f"[Audio file: {file.filename or 'recorded_voice.wav'}]", result)
    except Exception:
        pass
    return result

