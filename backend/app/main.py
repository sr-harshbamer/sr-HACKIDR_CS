"""
Guardian — Real-Time Digital Scam Protection Platform
FastAPI main server with WebSocket event streaming, Agentic Risk Engine, and Proactive Threat Defense.
"""
from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .guardian_db import init_guardian_db
from .api_routes import router as guardian_router
from .modules.data_access import init_db as init_veridra_db
from .modules.pipeline import run_analysis
from .modules.schemas import AnalysisRequest, AnalysisResult

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


# Backward-compatible endpoint for classic manual analyzer if needed
@app.post("/api/analyze", response_model=AnalysisResult)
def analyze(req: AnalysisRequest) -> AnalysisResult:
    return run_analysis(req)
