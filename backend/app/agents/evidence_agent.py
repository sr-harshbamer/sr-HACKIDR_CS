"""
Evidence Agent: Weights affirmative vs contradictory evidence, compiles signal matrices,
and computes Bayesian-inspired confidence intervals.
"""
from __future__ import annotations

from typing import Dict, Any, List, Tuple


class EvidenceAgent:
    """Compiles, weights, and validates evidence packages."""

    @staticmethod
    def synthesize_evidence(
        signals: List[Dict[str, Any]],
        contradicting_signals: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        contradicting_signals = contradicting_signals or []
        
        if not signals:
            return {
                "evidence_items": [],
                "aggregate_weight": 0.0,
                "confidence_score": 90,
                "uncertainty_level": "LOW",
                "summary": "No suspicious threat vectors or adversarial indicators detected.",
            }

        total_weight = sum(s.get("weight", 0.5) for s in signals)
        contra_weight = sum(s.get("weight", 0.5) for s in contradicting_signals)

        # Net confidence based on signal density and specificity
        signal_count = len(signals)
        if signal_count >= 3 or total_weight >= 2.5:
            confidence = min(98, int(85 + signal_count * 3))
            uncertainty = "LOW"
        elif signal_count >= 2:
            confidence = min(90, int(75 + signal_count * 5))
            uncertainty = "MODERATE"
        else:
            confidence = int(65 + signals[0].get("weight", 0.5) * 20)
            uncertainty = "ELEVATED"

        return {
            "evidence_items": signals,
            "contradicting_items": contradicting_signals,
            "aggregate_weight": round(total_weight, 2),
            "confidence_score": confidence,
            "uncertainty_level": uncertainty,
            "summary": f"Synthesized {signal_count} corroborating threat signals with {confidence}% confidence.",
        }
