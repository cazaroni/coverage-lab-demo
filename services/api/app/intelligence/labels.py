"""Plain-English DCI/DIS labels for the intelligence layer.

Mirrors the frontend `scoreLabels.ts` thresholds (CONTINUATION_2026-04-23.md §4.5)
so chatbot reports use the same language coaches see in the UI. The DIS<0.25
"point of no return" note comes from the research writeup (after that threshold,
~82% of plays yield explosive gains).
"""

from __future__ import annotations

# DIS below this is the empirical "point of no return" from the research.
DIS_POINT_OF_NO_RETURN = 0.25


def dci_label(dci: float | None) -> str:
    if dci is None:
        return "Unscored"
    if dci >= 0.85:
        return "Tight coverage"
    if dci >= 0.70:
        return "Above archetype"
    if dci >= 0.50:
        return "Moderate coverage"
    if dci >= 0.30:
        return "Coverage stress"
    return "Coverage breakdown"


def dis_label(dis: float | None) -> str:
    if dis is None:
        return "Unscored"
    if dis < 0.20:
        return "Structurally intact"
    if dis < 0.40:
        return "Moderate drift"
    if dis < 0.60:
        return "Structural stress"
    return "Collapse detected"


def score_phrase(dci: float | None, dis: float | None) -> str:
    """Compact 'DCI 0.41 (Coverage stress) / DIS 0.22 (Moderate drift)' phrase."""
    dci_part = f"DCI {dci:.2f} ({dci_label(dci)})" if dci is not None else "DCI —"
    dis_part = f"DIS {dis:.2f} ({dis_label(dis)})" if dis is not None else "DIS —"
    return f"{dci_part} / {dis_part}"
