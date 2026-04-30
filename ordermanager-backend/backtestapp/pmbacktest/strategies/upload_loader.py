"""Load Strategy classes from ``pmbacktest/strategies/uploaded/*.py``."""

from __future__ import annotations

import importlib.util
import inspect
import logging
import sys
from pathlib import Path

from pmbacktest.strategies.base import Strategy
from pmbacktest.strategies.registry import StrategyRegistry

_LOG = logging.getLogger(__name__)

_UPLOAD_DIR = Path(__file__).resolve().parent / "uploaded"


def _load_module(path: Path):
    mod_name = f"_pmbacktest_uploaded_{path.stem}"
    spec = importlib.util.spec_from_file_location(mod_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load {path}")
    mod = importlib.util.module_from_spec(spec)
    # Must register before exec_module: dataclasses (slots) and other tooling
    # resolve cls.__module__ via sys.modules; without this entry, lookup is None.
    sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
    return mod


def strategy_class_from_module(mod) -> type[Strategy]:
    found: list[type[Strategy]] = []
    for _n, obj in inspect.getmembers(mod, inspect.isclass):
        if getattr(obj, "__module__", None) != mod.__name__:
            continue
        if not issubclass(obj, Strategy) or obj is Strategy:
            continue
        found.append(obj)
    if len(found) != 1:
        raise ValueError(
            f"file {mod.__file__!r} must define exactly one Strategy subclass, found {len(found)}: "
            f"{[c.__name__ for c in found]}"
        )
    return found[0]


def load_strategy_class_from_file(path: Path) -> type[Strategy]:
    mod = _load_module(path)
    return strategy_class_from_module(mod)


def uploaded_strategy_registry() -> StrategyRegistry:
    """Register every valid ``uploaded/*.py`` strategy (skips broken files with a warning)."""
    r = StrategyRegistry()
    if not _UPLOAD_DIR.is_dir():
        return r
    for path in sorted(_UPLOAD_DIR.glob("*.py")):
        if path.name == "__init__.py" or path.name.startswith("_"):
            continue
        sid = path.stem
        try:
            cls = load_strategy_class_from_file(path)
            r.register_class(sid, cls)
        except Exception as exc:
            _LOG.warning("skip uploaded strategy %s: %s", path, exc)
    return r
