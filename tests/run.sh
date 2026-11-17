#!/bin/sh
set -e
cd "$(dirname "$0")/.."
python3 tests/smoke.py
python3 tests/ws_test.py
