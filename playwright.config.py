import os

def pytest_configure(config):
    if os.getenv("PLAYWRIGHT_VIDEO_MODE") == "on":
        config.option.video = "on"
        config.option.output = "test-videos"
