"""
Risk Agent: Dynamic stateful risk engine with causal trajectory transitions.
Maps evidence to SAFE, SUSPICIOUS, HIGH, CRITICAL states with explicit delta rationale.
"""
from __future__ import annotations

from typing import Dict, Any, List, Tuple


class RiskAgent:
    """Manages the real-time risk state machine and transition logging."""

    LEVEL_ORDER = ["SAFE", "SUSPICIOUS", "HIGH", "CRITICAL"]

    @classmethod
    def evaluate_risk(
        cls,
        evidence_data: Dict[str, Any],
        previous_level: str = "SAFE",
        context: str = "general",
    ) -> Dict[str, Any]:
        signals = evidence_data.get("evidence_items", [])
        aggregate_weight = evidence_data.get("aggregate_weight", 0.0)

        # Baseline scoring
        raw_score = 0
        reasons: List[str] = []

        for s in signals:
            weight = s.get("weight", 0.5)
            key = s.get("key", "")
            title = s.get("title", "")
            
            if weight >= 0.95:
                raw_score += 45
                reasons.append(f"Critical security trigger: {title}")
            elif weight >= 0.85:
                raw_score += 30
                reasons.append(f"High risk indicator: {title}")
            elif weight >= 0.70:
                raw_score += 20
                reasons.append(f"Moderate risk indicator: {title}")
            else:
                raw_score += 10
                reasons.append(f"Low risk signal: {title}")

        # Compute Final Level
        if raw_score >= 85:
            new_level = "CRITICAL"
            final_score = min(99, max(85, raw_score))
        elif raw_score >= 60:
            new_level = "HIGH"
            final_score = min(84, max(60, raw_score))
        elif raw_score >= 25:
            new_level = "SUSPICIOUS"
            final_score = min(59, max(25, raw_score))
        else:
            new_level = "SAFE"
            final_score = min(24, max(0, raw_score))

        # Build causal transition event
        delta_score = final_score
        if previous_level != new_level:
            transition_reason = f"Risk escalated from {previous_level} to {new_level}: {reasons[0] if reasons else 'New threat evidence detected.'}"
        else:
            transition_reason = f"Risk maintained at {new_level}."

        return {
            "risk_level": new_level,
            "risk_score": final_score,
            "confidence": evidence_data.get("confidence_score", 90),
            "uncertainty": evidence_data.get("uncertainty_level", "LOW"),
            "previous_level": previous_level,
            "transition_reason": transition_reason,
            "all_reasons": reasons,
        }
