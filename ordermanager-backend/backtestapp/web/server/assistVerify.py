#!/usr/bin/env python3
"""Verify assistant-produced strategy source: py_compile + import + exactly one Strategy subclass.

Prints one JSON object to stdout. Exit 0 on success, 1 on failure.
Run with repo root as cwd so `import pmbacktest` resolves (same as pmbacktest.cli).
"""
from __future__ import annotations

import importlib.util
import inspect
import json
import py_compile
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "stage": "args", "message": "missing path to .py file"}))
        sys.exit(2)
    path = Path(sys.argv[1])
    if not path.is_file():
        print(json.dumps({"ok": False, "stage": "args", "message": f"not a file: {path}"}))
        sys.exit(2)

    try:
        py_compile.compile(str(path), doraise=True)
    except py_compile.PyCompileError as e:
        print(json.dumps({"ok": False, "stage": "compile", "message": str(e)}))
        sys.exit(1)
    except OSError as e:
        print(json.dumps({"ok": False, "stage": "compile", "message": str(e)}))
        sys.exit(1)

    mod_name = "_pmbacktest_assist_verify"
    try:
        spec = importlib.util.spec_from_file_location(mod_name, path)
        if spec is None or spec.loader is None:
            raise ImportError("spec_from_file_location failed")
        mod = importlib.util.module_from_spec(spec)
        # Needed for Python 3.13 dataclasses to resolve cls.__module__ during decoration.
        sys.modules[mod_name] = mod
        spec.loader.exec_module(mod)
    except Exception as e:
        print(json.dumps({"ok": False, "stage": "import", "message": f"{type(e).__name__}: {e}"}))
        sys.exit(1)

    from pmbacktest.strategies.base import Strategy

    found: list[type] = []
    for _n, obj in inspect.getmembers(mod, inspect.isclass):
        if getattr(obj, "__module__", None) != mod.__name__:
            continue
        if not issubclass(obj, Strategy) or obj is Strategy:
            continue
        found.append(obj)

    if len(found) != 1:
        print(
            json.dumps(
                {
                    "ok": False,
                    "stage": "strategy_class",
                    "message": (
                        f"expected exactly one Strategy subclass in module, found {len(found)}: "
                        f"{[c.__name__ for c in found]}"
                    ),
                }
            )
        )
        sys.exit(1)

    print(json.dumps({"ok": True, "class_name": found[0].__name__}))


if __name__ == "__main__":
    main()
