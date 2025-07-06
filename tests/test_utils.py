import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from utils import latest_timestamp


def test_latest_timestamp():
    devices = [
        {"device_id": "a", "timestamp": "2024-01-01T00:00:00"},
        {"device_id": "b", "timestamp": "2024-01-02T00:00:00"},
    ]
    assert latest_timestamp(devices) == "2024-01-02T00:00:00"
    assert latest_timestamp([]) is None
