import types
import importlib.util


def test_config_sets_video(monkeypatch):
    config = types.SimpleNamespace(option=types.SimpleNamespace())
    monkeypatch.setenv("PLAYWRIGHT_VIDEO_MODE", "on")
    spec = importlib.util.spec_from_file_location("playwright_config", "playwright.config.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    module.pytest_configure(config)
    assert config.option.video == "on"
    assert config.option.output == "test-videos"
