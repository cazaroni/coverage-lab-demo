from __future__ import annotations


class AnalyticsReadNotFoundError(LookupError):
    """Raised when an analytics object is missing or not visible to the active team."""

