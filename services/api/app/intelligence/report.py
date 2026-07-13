"""Deterministic report rendering: turn tool outputs into a ChatReport with
template-driven prose and play-link citations. No LLM — these are Jinja2 templates
so latency and wording are predictable (ARCHITECTURE.md §5)."""

from __future__ import annotations

from jinja2 import Template

from app.contracts import ChatReport, Citation, ReportSection
from app.contracts.analytics import PlayListRow
from app.intelligence.labels import (
    DIS_POINT_OF_NO_RETURN,
    dci_label,
    dis_label,
    score_phrase,
)
from projectedge_analytics import PlayForensics, TeamIntegrityPoint

_FIND_SUMMARY = Template(
    "{{ n }} {{ descriptor }} for the season. "
    "{{ leader_label }}, week {{ worst.week }} vs {{ worst.opp }}, graded {{ worst.phrase }}."
)

_FIND_ROW = "{{ i }}. Week {{ p.week }} vs {{ p.opp }} — {{ p.phrase }}"

_EXPLAIN_BODY = Template(
    "Coverage graded {{ phrase }}. Peak individual stress reached {{ peak_value }} "
    "on {{ peak_entity }} at frame {{ peak_frame }}."
    "{% if collapse %} The shell collapsed between frames {{ collapse.start }}–{{ collapse.end }}.{% endif %}"
    "{% if dis >= pnr %} DIS crossed the {{ pnr }} 'point of no return' — historically ~82% of "
    "plays past this threshold yield explosive gains.{% endif %}"
    " Nearest archetype: {{ archetype }}."
)

# No tracking sample -> headline scores only. Must NOT narrate peak stress / collapse.
_EXPLAIN_NO_MOTION = Template(
    "Coverage graded {{ phrase }}. This play has no tracking sample on file, so only the "
    "headline scores are known — there is no frame-by-frame breakdown (peak stress or "
    "collapse window) for it."
)

_TREND_SUMMARY = Template(
    "Across {{ n }} weeks, average DCI moved from {{ first.dci }} ({{ first.label }}) in week "
    "{{ first.week }} to {{ last.dci }} ({{ last.label }}) in week {{ last.week }} — {{ direction }}."
)

_TREND_ROW = "Week {{ w.week }}: {{ phrase }} ({{ w.play_count }} plays)"


def _opp(row: PlayListRow) -> str:
    return row.offense_team_id or "OPP"


def find_plays_report(
    *,
    question: str,
    rows: list[PlayListRow],
    citations: list[Citation],
    descriptor: str,
    title: str,
    model_version: str,
    leader_label: str,
) -> ChatReport:
    if not rows:
        return ChatReport(
            question=question,
            intent="find_plays",
            title=title,
            summary="No scored plays matched that filter for your team this season.",
            sections=[],
            model_version=model_version,
        )
    worst = rows[0]
    summary = _FIND_SUMMARY.render(
        n=len(rows),
        descriptor=descriptor,
        leader_label=leader_label,
        worst={"week": worst.week, "opp": _opp(worst), "phrase": score_phrase(worst.dci, worst.dis)},
    )
    body = "\n".join(
        Template(_FIND_ROW).render(
            i=i + 1,
            p={"week": r.week, "opp": _opp(r), "phrase": score_phrase(r.dci, r.dis)},
        )
        for i, r in enumerate(rows)
    )
    return ChatReport(
        question=question,
        intent="find_plays",
        title=title,
        summary=summary,
        sections=[ReportSection(heading="Plays", body=body, citations=citations)],
        model_version=model_version,
    )


def explain_play_report(
    *,
    question: str,
    forensics: PlayForensics,
    citation: Citation,
    model_version: str,
) -> ChatReport:
    if not forensics.has_motion:
        body = _EXPLAIN_NO_MOTION.render(phrase=score_phrase(forensics.dci, forensics.dis))
    else:
        collapse = None
        if forensics.collapse_window is not None:
            collapse = {
                "start": forensics.collapse_window.start_frame,
                "end": forensics.collapse_window.end_frame,
            }
        body = _EXPLAIN_BODY.render(
            phrase=score_phrase(forensics.dci, forensics.dis),
            peak_value=round(forensics.peak_stress_value, 2),
            peak_entity=forensics.peak_stress_entity_id,
            peak_frame=forensics.peak_stress_frame,
            collapse=collapse,
            dis=forensics.dis,
            pnr=DIS_POINT_OF_NO_RETURN,
            archetype=forensics.archetype_label,
        )
    return ChatReport(
        question=question,
        intent="explain_play",
        title=f"Coverage analysis — {forensics.play_id}",
        summary=forensics.plain_text_summary,
        sections=[ReportSection(heading="Structural breakdown", body=body, citations=[citation])],
        model_version=model_version,
    )


def team_trend_report(
    *,
    question: str,
    points: list[TeamIntegrityPoint],
    model_version: str,
) -> ChatReport:
    if not points:
        return ChatReport(
            question=question,
            intent="team_trend",
            title="Defensive integrity trend",
            summary="No scored plays yet this season to build a trend.",
            sections=[],
            model_version=model_version,
        )
    first, last = points[0], points[-1]
    delta = last.avg_dci - first.avg_dci
    direction = "improving" if delta > 0.02 else "declining" if delta < -0.02 else "holding steady"
    summary = _TREND_SUMMARY.render(
        n=len(points),
        first={"week": first.week, "dci": round(first.avg_dci, 2), "label": dci_label(first.avg_dci)},
        last={"week": last.week, "dci": round(last.avg_dci, 2), "label": dci_label(last.avg_dci)},
        direction=direction,
    )
    body = "\n".join(
        Template(_TREND_ROW).render(
            w={"week": p.week, "play_count": p.play_count},
            phrase=score_phrase(round(p.avg_dci, 2), round(p.avg_dis, 2)),
        )
        for p in points
    )
    return ChatReport(
        question=question,
        intent="team_trend",
        title="Defensive integrity trend",
        summary=summary,
        sections=[ReportSection(heading="Weekly integrity", body=body, citations=[])],
        model_version=model_version,
    )
