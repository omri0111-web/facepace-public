# Face Recognition Setup – InsightFace (Python backend)

## What We Built

Your attendance app now uses an InsightFace-based Python backend for detection and recognition, with a React frontend that sends snapshots (base64) to the backend.

- InsightFace model pack: buffalo_l
  - Detection: det_10g.onnx
  - Landmarks: 2d106det.onnx (2D), 1k3d68.onnx (3D)
  - Recognition/embedding: w600k_r50.onnx
  - Optional: genderage.onnx
- Storage: SQLite (`backend/faces.db`) for people, embeddings, groups, and membership

## Architecture

```
Browser (React)
  ↓ HTTP (base64 image every ~700ms while recording)
Fast detect: POST /detect  → returns bounding boxes (green borders immediately)
Recognize:   POST /recognize → returns identities + boxes (names overlay when ready)
  ↓
Python FastAPI backend (port 8000)
  ↓
InsightFace (buffalo_l) → detector + embeddings
  ↓
SQLite (faces.db) → persons, embeddings, groups, group_members
```

## Running the App

### 1) Start the Backend (InsightFace Python)
```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
source backend/.venv/bin/activate
python backend/main.py
# in another terminal, one-time model init
curl -s -X POST http://127.0.0.1:8000/init \
  -H 'Content-Type: application/json' \
  -d '{"model_pack":"buffalo_l","det_width":640,"det_height":640}'
```
Backend runs at: `http://127.0.0.1:8000`

### 2) Start the Frontend (React)
```bash
npm run dev
```
Frontend: `http://localhost:3000`

## Database Persistence

Saved in `backend/faces.db`:
- `persons(person_id, person_name)`
- `embeddings(id, person_id, embedding BLOB, created_at)`
- `groups(group_id, group_name)`
- `group_members(group_id, person_id)`

Note: If you previously had a DB created with an older column name (`vector`), delete `backend/faces.db` to let the app recreate the schema with `embedding`.

## How It Works

### Enrollment (Add Person)
1. Open People → Add Person → capture photo
2. Frontend sends photo to backend `/enroll`
3. Backend uses InsightFace to extract an L2-normalized embedding → stores in `embeddings`
4. Person can be linked to a group (via `/group/add`) so recognition can be filtered by group

### Recording (Live)
1. Select a group and start recording
2. Every ~700ms while recording:
   - Frontend calls `/detect` → draws green boxes immediately
   - In parallel calls `/recognize` (with `group_id`) → overlays names when matches return
3. Matching uses cosine similarity vs embeddings stored in SQLite; group filter limits the candidate set

## Models Used (buffalo_l)

- Detector: `det_10g.onnx`
- Landmarks: `2d106det.onnx`, `1k3d68.onnx`
- Recognition: `w600k_r50.onnx`
- Provider: ONNX Runtime CPUExecutionProvider (no GPU required)

## Offline (Local) Models Only

If you need fully offline operation and to avoid any auto-downloaded pretrained models, provide your own ONNX models and initialize the backend with a local model root:

1) Place your models at:

```
<MODEL_ROOT>/models/<PACK_NAME>/
```

For example:

```
/path/to/models_root/
  models/
    custom_pack/
      det.onnx           # detector (e.g., SCRFD)
      recognition.onnx   # recognizer (ArcFace-style)
      landmark.onnx      # optional
```

2) Initialize the backend in offline-only mode (will error if models are missing):

```bash
curl -s -X POST http://127.0.0.1:8000/init \
  -H 'Content-Type: application/json' \
  -d '{
    "model_pack":"custom_pack",
    "det_width":640,
    "det_height":640,
    "model_root":"/path/to/models_root",
    "offline_only":true
  }'
```

Notes:
- When `offline_only` is true, the backend refuses to auto-download and requires local ONNX files.
- You can also export `INSIGHTFACE_HOME=/path/to/models_root` to prefer that directory.

## API Endpoints

- `GET /health` → service status
- `POST /init` → initialize InsightFace (model, detector size)
- `POST /detect` → detect faces only (returns boxes)
- `POST /recognize` → recognize faces (optional `group_id`, `filter_ids`)
- `POST /enroll` → enroll new face `{ person_id, person_name, image }`
- `POST /person` → create/update person `{ person_id, person_name }`
- `POST /group` → create/update group `{ group_id, group_name }`
- `POST /group/add` → add member `{ group_id, person_id }`
- `GET /people` → list persons
- `GET /groups` → list groups with members
- `POST /clear` → clear persons, embeddings, groups

## Troubleshooting

- CORS-like error but status 500: check Network tab → if 500, it’s a backend error. Most common is old DB schema. Remove `backend/faces.db` and restart backend.
- No boxes while recording: ensure backend running, good lighting, face large enough. Network → `/detect` should return boxes.
- No names: enroll at least one face and ensure the person is in the selected group; recognition filters by group.

## Files

- `backend/main.py` → FastAPI app (InsightFace backend)
- `backend/faces.db` → SQLite database
- `src/services/BackendRecognitionService.ts` → Frontend API client
- `src/components/RealFaceCameraView.tsx` → camera + 700ms loop (boxes first, names later)

---

You now have a smooth, CPU-only InsightFace pipeline: fast green boxes via `/detect`, identities via `/recognize`, and persistent storage in SQLite.

