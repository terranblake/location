import importlib.util

if importlib.util.find_spec("playwright") is None:
    collect_ignore = ["test_paths.py"]
