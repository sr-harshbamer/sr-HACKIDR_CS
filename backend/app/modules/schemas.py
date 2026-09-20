"""
Shared data contracts for Veridra's analysis pipeline.

Every analyzer (message / link / job offer) produces a list of `Signal` objects.
The risk scorer aggregates them, and the explanation engine maps them to
human-readable reasoning. This keeps the pipeline modular and testable.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class AnalysisMode(str, Enum):
    MESSAGE = "message"
    LINK = "link"
    JOB_OFFER = "job_offer"
    CALL = "call"


class RiskLevel(str, Enum):
    SAFE = "Safe"
    LOW_RISK = "Low Risk"
    SUSPICIOUS = "Suspicious"
    LIKELY_SCAM = "Likely Scam"
    HIGH_RISK = "High Risk"


class ThreatCategory(str, Enum):
    PHISHING = "Phishing"
    FAKE_JOB_OFFER = "Fake Job Offer"
    SUSPICIOUS_LINK = "Suspicious Link"
    OTP_SCAM = "OTP Scam"
    IMPERSONATION = "Impersonation"
    FINANCIAL_FRAUD = "Financial Fraud"
    UNKNOWN_SUSPICIOUS = "Unknown Suspicious Pattern"
    NONE = "No Clear Threat Detected"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Signal(BaseModel):
    """A single detected red flag with the exact evidence that triggered it."""
    id: str
    label: str                    # Short human label, e.g. "Urgency pressure"
    severity: Severity
    evidence: List[str] = Field(default_factory=list)  # Exact snippets matched
    category_hint: Optional[ThreatCategory] = None


class AnalysisRequest(BaseModel):
    mode: AnalysisMode
    content: str = Field(..., min_length=1, max_length=8000)


class HighlightedPhrase(BaseModel):
    phrase: str
    reason: str


class AnalysisResult(BaseModel):
    """The full 6-layer output returned to the frontend."""
    mode: AnalysisMode
    risk_level: RiskLevel
    risk_score: int               # 0-100
    confidence_low: int           # 0-100
    confidence_high: int          # 0-100
    threat_category: ThreatCategory
    signals: List[Signal]
    why_flagged: List[str]        # Layer 3
    why_not_proceed: List[str]    # Layer 4
    safe_actions: List[str]       # Layer 5
    block_report_guidance: List[str]  # Layer 6
    highlighted_phrases: List[HighlightedPhrase]
    analyzed_at: str              # ISO timestamp
