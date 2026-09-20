"""
Risk scoring.

Takes the list of `Signal` objects produced by any analyzer and converts it
into a 0–100 score, a `RiskLevel` band, and a confidence range. The logic is
deliberately transparent and tunable rather than opaque.
"""
from __future__ import annotations

from typing import List, Tuple

from .schemas import RiskLevel, Severity, Signal


# Base weights per severity. Diminishing-returns stacking avoids runaway scores
# when many low-severity flags fire on a long message.
SEVERITY_WEIGHT = {
    Severity.LOW: 8,
    Severity.MEDIUM: 18,
    Severity.HIGH: 30,
    Severity.CRITICAL: 45,
}

# If a critical signal fires, we guarantee the score lands at least here.
CRITICAL_FLOOR = 75


def score_signals(signals: List[Signal]) -> Tuple[int, RiskLevel, Tuple[int, int]]:
    """Return (score 0-100, risk level, confidence range (low, high))."""
    if not signals:
        return 5, RiskLevel.SAFE, (0, 15)

    # Sort descending by severity, then apply diminishing multipliers
    ranked = sorted(signals, key=lambda s: SEVERITY_WEIGHT[s.severity], reverse=True)
    diminishing = [1.0, 0.7, 0.5, 0.35, 0.25, 0.2, 0.15, 0.12, 0.1, 0.08]

    total = 0.0
    for idx, sig in enumerate(ranked):
        mult = diminishing[idx] if idx < len(diminishing) else 0.05
        total += SEVERITY_WEIGHT[sig.severity] * mult

    score = int(round(min(total, 100)))

    # Any CRITICAL signal guarantees a minimum score
    if any(s.severity == Severity.CRITICAL for s in signals):
        score = max(score, CRITICAL_FLOOR)

    level = _score_to_level(score)

    # Confidence widens when there are few signals or only low-severity ones
    spread = 8 if len([s for s in signals if s.severity in (Severity.HIGH, Severity.CRITICAL)]) >= 2 else 14
    low = max(0, score - spread)
    high = min(100, score + spread)
    return score, level, (low, high)


def _score_to_level(score: int) -> RiskLevel:
    if score < 15:
        return RiskLevel.SAFE
    if score < 35:
        return RiskLevel.LOW_RISK
    if score < 60:
        return RiskLevel.SUSPICIOUS
    if score < 80:
        return RiskLevel.LIKELY_SCAM
    return RiskLevel.HIGH_RISK
