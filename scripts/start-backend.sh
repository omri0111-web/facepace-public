#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export FACE_DB_PATH="${FACE_DB_PATH:-backend/faces.db}"
exec python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
