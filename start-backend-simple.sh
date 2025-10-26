#!/bin/bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
source .venv/bin/activate
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

