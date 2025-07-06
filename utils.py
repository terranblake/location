from __future__ import annotations

from datetime import datetime
from typing import Iterable, Mapping, Optional


def latest_timestamp(devices: Iterable[Mapping[str, str]]) -> Optional[str]:
    """Return the most recent timestamp from a collection of device dicts."""
    latest: Optional[datetime] = None
    for device in devices:
        ts = datetime.fromisoformat(device["timestamp"])
        if latest is None or ts > latest:
            latest = ts
    return latest.isoformat() if latest else None
