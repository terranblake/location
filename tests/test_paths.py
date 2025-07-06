import os
import subprocess
import time
import urllib.request
import pytest
from playwright.sync_api import sync_playwright


@pytest.fixture(scope="session")
def server():
    env = os.environ.copy()
    env["PORT"] = "5000"
    proc = subprocess.Popen(["python", "server.py"], env=env)
    for _ in range(20):
        try:
            urllib.request.urlopen("http://localhost:5000/health", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    else:
        proc.kill()
        raise RuntimeError("Server did not start")
    yield "http://localhost:5000"
    proc.terminate()
    proc.wait()


def test_paths(server):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(f"{server}/")
        page.wait_for_function("() => window.L !== undefined", timeout=10000)
        assert "Find Hub" in page.title()
        browser.close()
