import os
import pytest

def pytest_configure(config):
    if os.getenv("PLAYWRIGHT_VIDEO_MODE") == "on":
        # Set video recording options for pytest-playwright
        config.option.video = "on"
        config.option.output = "test-videos"
        print("Video recording enabled: output directory set to test-videos")