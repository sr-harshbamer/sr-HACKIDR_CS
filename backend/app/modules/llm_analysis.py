"""
LLM analysis engine using Gemini API.

Performs deep semantic analysis for social engineering tactics, emotional pressure,
urgency, and logical inconsistencies. Falls back gracefully to rules-based patterns
on API error or missing credentials.
"""
from __future__ import annotations

import os
import json
import logging
from typing import List, Tuple, Optional
import httpx

from .schemas import Severity, Signal, ThreatCategory, AnalysisMode

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

PROMPT_TEMPLATE = """You are an expert cybersecurity threat analysis assistant.
Analyze the following user-supplied content under the mode "{mode}" (which is one of "message", "link", or "job_offer").
Check for social engineering tactics, urgency language, emotional pressure, realistic impersonation, fake recruiter patterns, or request for sensitive credentials.

You must return a JSON object with the following schema:
{{
  "threat_category": "Phishing" | "Fake Job Offer" | "Suspicious Link" | "OTP Scam" | "Impersonation" | "Financial Fraud" | "Unknown Suspicious Pattern" | "No Clear Threat Detected",
  "signals": [
    {{
      "id": "string (snake_case identifier)",
      "label": "string (short user-facing explanation)",
      "severity": "low" | "medium" | "high" | "critical",
      "evidence": ["string (exact substrings from the analyzed text that triggered this flag)"],
      "category_hint": "same options as threat_category"
    }}
  ]
}}

If no threats are detected, return "threat_category" as "No Clear Threat Detected" and an empty list of "signals".
Do not return any conversational text or markdown blocks, return ONLY the raw JSON object.

Content to analyze:
{content}
"""

def analyze_content_with_llm(mode: AnalysisMode, content: str) -> Optional[Tuple[List[Signal], ThreatCategory]]:
    """
    Call the Gemini API to analyze the content semantically.
    Returns (signals, category) on success, or None on failure (enabling fallback).
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment. Falling back to rules-based analysis.")
        return None

    prompt = PROMPT_TEMPLATE.format(mode=mode.value, content=content)
    
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Set a reasonable timeout (e.g. 5 seconds) to avoid blocking the user request
        response = httpx.post(
            f"{GEMINI_API_URL}?key={api_key}",
            json=payload,
            headers=headers,
            timeout=5.0
        )
        
        if response.status_code != 200:
            logger.error(
                f"Gemini API returned error status {response.status_code}: {response.text}. "
                "Falling back to rules-based engine."
            )
            return None

        result_data = response.json()
        
        # Parse output structure
        candidates = result_data.get("candidates", [])
        if not candidates:
            logger.error("Gemini API response did not contain any candidates.")
            return None
            
        text_content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        if not text_content:
            logger.error("Gemini API candidate content was empty.")
            return None

        parsed = json.loads(text_content.strip())
        
        threat_cat_str = parsed.get("threat_category", "No Clear Threat Detected")
        try:
            threat_category = ThreatCategory(threat_cat_str)
        except ValueError:
            threat_category = ThreatCategory.UNKNOWN_SUSPICIOUS

        signals: List[Signal] = []
        for s in parsed.get("signals", []):
            try:
                sig_severity = Severity(s.get("severity", "medium").lower())
            except ValueError:
                sig_severity = Severity.MEDIUM

            # Attempt to parse category_hint if present
            hint_str = s.get("category_hint")
            cat_hint = None
            if hint_str:
                try:
                    cat_hint = ThreatCategory(hint_str)
                except ValueError:
                    cat_hint = None

            signals.append(Signal(
                id=s.get("id", "custom_flag"),
                label=s.get("label", "Suspicious pattern detected"),
                severity=sig_severity,
                evidence=s.get("evidence", []),
                category_hint=cat_hint
            ))

        return signals, threat_category

    except Exception as e:
        logger.exception(f"Unexpected error during Gemini API analysis: {e}. Falling back to rules-based engine.")
        return None
