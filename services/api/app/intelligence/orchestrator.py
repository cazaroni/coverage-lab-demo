"""Deterministic intent router — answers coaching questions by selecting tools and
rendering a templated report. This is the no-LLM path (works with no API key, fast,
predictable). A Claude tool-use orchestrator can later drive the SAME Toolbox +
report builders for queries that need multi-tool reasoning, returning the same
ChatReport contract."""

from __future__ import annotations

import re

from app.contracts import ChatReport, Citation
from app.contracts.analytics import PlayListRow
from app.intelligence import report
from app.intelligence.labels import score_phrase
from app.intelligence.tools import Toolbox
from projectedge_analytics import AnalyticsReadNotFoundError

_PLAY_ID = re.compile(r"\b(\d{10}_\d+)\b")
_WEEK = re.compile(r"\bweek\s*(\d{1,2})\b", re.IGNORECASE)
_LIMIT = re.compile(r"\btop\s*(\d{1,2})\b", re.IGNORECASE)

_TREND_WORDS = ("trend", "improv", "declin", "over the season", "across the season", "getting better", "getting worse", "by week", "week over week")
_DRIFT_WORDS = ("drift", "chaos", "unstable", "integrity", "collapse", "highest dis", "most dis")


class DeterministicOrchestrator:
    def __init__(self, toolbox: Toolbox, *, model_version: str) -> None:
        self.tb = toolbox
        self.model_version = model_version

    def answer(self, question: str) -> ChatReport:
        lowered = question.lower()
        play_match = _PLAY_ID.search(question)
        week = self._first_int(_WEEK, question)
        limit = self._first_int(_LIMIT, question) or 5

        # 1. Explain a specific play (whenever a play id is present).
        if play_match:
            play_id = play_match.group(1)
            try:
                forensics = self.tb.explain_play(play_id=play_id)
            except AnalyticsReadNotFoundError:
                return ChatReport(
                    question=question,
                    intent="explain_play",
                    title=f"Play {play_id} not found",
                    summary=f"No play '{play_id}' was found for your team.",
                    sections=[],
                    model_version=self.model_version,
                )
            return report.explain_play_report(
                question=question,
                forensics=forensics,
                citation=self._cite(play_id, forensics.dci, forensics.dis),
                model_version=self.model_version,
            )

        # 2. Season integrity trend.
        if any(w in lowered for w in _TREND_WORDS):
            return report.team_trend_report(
                question=question,
                points=self.tb.team_integrity_trend(),
                model_version=self.model_version,
            )

        # 3. Most structural drift.
        if any(w in lowered for w in _DRIFT_WORDS):
            rows = self.tb.find_plays(week=week, sort="dis_desc", limit=limit)
            return self._find_report(
                question, rows, descriptor="plays with the most structural drift",
                title="Highest structural drift",
            )

        # 4. Default: weakest coverage plays.
        rows = self.tb.find_plays(week=week, sort="dci_asc", limit=limit)
        return self._find_report(
            question, rows, descriptor="plays with the weakest coverage",
            title="Weakest coverage plays",
        )

    # ── helpers ──────────────────────────────────────────────────────────────────
    @staticmethod
    def _first_int(pattern: re.Pattern, text: str) -> int | None:
        match = pattern.search(text)
        return int(match.group(1)) if match else None

    def _find_report(self, question: str, rows: list[PlayListRow], *, descriptor: str, title: str) -> ChatReport:
        citations = [self._cite(r.play_id, r.dci, r.dis, week=r.week, opp=r.offense_team_id) for r in rows]
        return report.find_plays_report(
            question=question, rows=rows, citations=citations,
            descriptor=descriptor, title=title, model_version=self.model_version,
        )

    def _cite(self, play_id: str, dci: float | None, dis: float | None, *, week: int | None = None, opp: str | None = None) -> Citation:
        prefix = f"Wk{week} {opp or 'OPP'}" if week is not None else play_id
        return Citation(
            play_id=play_id,
            label=f"{prefix} — {score_phrase(dci, dis)}",
            deep_link=f"/plays/{play_id}",
            replay_token=self.tb.open_replay(play_id=play_id).token,
        )
