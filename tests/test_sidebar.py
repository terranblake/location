import os
import subprocess
import time
import urllib.request
from datetime import datetime, timedelta

import pytest
from playwright.sync_api import sync_playwright


def write_logs(log_dir: str):
    now = datetime.utcnow()
    first = now - timedelta(minutes=30)
    second = now - timedelta(hours=1)
    (log_dir / "terran_phone.log").write_text(
        f"{first.isoformat()},terran_phone,0,0,5\n"
    )
    (log_dir / "terran_watch.log").write_text(
        f"{second.isoformat()},terran_watch,0,0,5\n"
    )
    return first, second


@pytest.fixture()
def server_with_logs(tmp_path):
    log_dir = tmp_path / "logs"
    log_dir.mkdir()
    first_ts, second_ts = write_logs(log_dir)
    env = os.environ.copy()
    env["PORT"] = "5001"
    env["LOG_DIR"] = str(log_dir)
    proc = subprocess.Popen(["python", "server.py"], env=env)
    for _ in range(20):
        try:
            urllib.request.urlopen("http://localhost:5001/health", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    else:
        proc.kill()
        raise RuntimeError("Server did not start")
    yield "http://localhost:5001", first_ts
    proc.terminate()
    proc.wait()


def _format_time(ts: datetime) -> str:
    diff = datetime.utcnow() - ts
    mins = int(diff.total_seconds() // 60)
    hours = mins // 60
    if mins < 60:
        return f"{mins}m ago"
    return f"{hours}h ago"


def test_people_sidebar(server_with_logs):
    url, first_ts = server_with_logs
    with sync_playwright() as p:
        browser = p.chromium.launch(
            # Ensure headless mode for CI environment
            headless=True
        )
        context = browser.new_context(
            # Enable video recording if configured
            record_video_dir="test-videos" if os.getenv("PLAYWRIGHT_VIDEO_MODE") == "on" else None
        )
        page = context.new_page()
        try:
            page.goto(f"{url}/")
            page.wait_for_function("() => window.findHub !== undefined", timeout=10000)
            page.click("#people-tab")
            page.wait_for_selector(".person-item")
            persons = page.query_selector_all(".person-item")
            assert len(persons) == 1
            rows = []
            for item in persons:
                name = item.query_selector(".person-name").inner_text()
                status = item.query_selector(".person-status").inner_text()
                rows.append((name, status))
            assert rows == [("terran", _format_time(first_ts))]
        finally:
            # Ensure context is closed to finalize video
            context.close()
            browser.close()
