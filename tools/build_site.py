#!/usr/bin/env python3
"""Build the static SHITTOWN website into site/ for any static host.

Usage: python3 tools/build_site.py
Output: site/index.html + site/assets/
"""
from __future__ import annotations

import os
import shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "site")


def main() -> int:
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    shutil.copy2(os.path.join(ROOT, "index.html"), os.path.join(OUT, "index.html"))
    shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(OUT, "assets"))
    # GitHub Pages/Netlify: unknown paths fall back to the game.
    shutil.copy2(os.path.join(ROOT, "index.html"), os.path.join(OUT, "404.html"))
    size = 0
    for base, _dirs, files in os.walk(OUT):
        for f in files:
            size += os.path.getsize(os.path.join(base, f))
    print("site/ built: %.1f MB" % (size / 1048576.0))
    print("Upload site/ to any static host, or use the included GitHub Actions workflow.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
