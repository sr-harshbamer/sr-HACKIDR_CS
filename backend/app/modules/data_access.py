"""
Data access layer.

Lightweight SQLite persistence for analysis history and Safety Insights
aggregates. No user accounts, no PII — we store only the mode, category,
risk score, level, and triggered signal IDs plus a truncated preview.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator, List

from .schemas import AnalysisResult


DB_PATH = Path(__file__).resolve().parent.parent.parent / "veridra.db"


def init_db() -> None:
    with _conn() as cx:
        cx.executescript("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mode TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            threat_category TEXT NOT NULL,
            signal_ids TEXT NOT NULL,       -- JSON list
            evidence_samples TEXT NOT NULL, -- JSON list (short)
            preview TEXT NOT NULL,          -- truncated input
            created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at);
        """)


@contextmanager
def _conn() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def save_analysis(content_preview: str, result: AnalysisResult) -> None:
    signal_ids = [s.id for s in result.signals]
    evidence = []
    for s in result.signals:
        evidence.extend(s.evidence[:2])
    evidence = evidence[:8]

    with _conn() as cx:
        cx.execute(
            """INSERT INTO analyses
               (mode, risk_level, risk_score, threat_category,
                signal_ids, evidence_samples, preview, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                result.mode.value,
                result.risk_level.value,
                result.risk_score,
                result.threat_category.value,
                json.dumps(signal_ids),
                json.dumps(evidence),
                content_preview[:240],
                datetime.utcnow().isoformat(timespec="seconds") + "Z",
            ),
        )


def recent_history(limit: int = 20) -> List[dict]:
    with _conn() as cx:
        rows = cx.execute(
            "SELECT mode, risk_level, risk_score, threat_category, preview, created_at "
            "FROM analyses ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def insights_summary() -> dict:
    with _conn() as cx:
        total = cx.execute("SELECT COUNT(*) AS c FROM analyses").fetchone()["c"]

        by_category = cx.execute(
            "SELECT threat_category AS category, COUNT(*) AS count "
            "FROM analyses GROUP BY threat_category ORDER BY count DESC"
        ).fetchall()

        by_level = cx.execute(
            "SELECT risk_level AS level, COUNT(*) AS count "
            "FROM analyses GROUP BY risk_level"
        ).fetchall()

        by_mode = cx.execute(
            "SELECT mode, COUNT(*) AS count FROM analyses GROUP BY mode"
        ).fetchall()

        # Aggregate most-seen signal ids across the last 200 analyses
        recent = cx.execute(
            "SELECT signal_ids, evidence_samples FROM analyses "
            "ORDER BY id DESC LIMIT 200"
        ).fetchall()

    signal_counter: dict[str, int] = {}
    evidence_counter: dict[str, int] = {}
    for row in recent:
        for sid in json.loads(row["signal_ids"]):
            signal_counter[sid] = signal_counter.get(sid, 0) + 1
        for ev in json.loads(row["evidence_samples"]):
            k = ev.strip().lower()
            if 2 < len(k) < 60:
                evidence_counter[k] = evidence_counter.get(k, 0) + 1

    top_signals = sorted(signal_counter.items(), key=lambda kv: kv[1], reverse=True)[:8]
    top_phrases = sorted(evidence_counter.items(), key=lambda kv: kv[1], reverse=True)[:10]

    return {
        "total_analyses": total,
        "by_category": [dict(r) for r in by_category],
        "by_level": [dict(r) for r in by_level],
        "by_mode": [dict(r) for r in by_mode],
        "top_signals": [{"signal_id": s, "count": c} for s, c in top_signals],
        "top_phrases": [{"phrase": p, "count": c} for p, c in top_phrases],
    }
