import base64
import io
import json
import os
import sqlite3
import time
import uuid
from typing import List, Optional, Tuple

import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file in backend directory
import pathlib
backend_dir = pathlib.Path(__file__).parent
env_path = backend_dir / '.env'
load_dotenv(dotenv_path=env_path)

# ---------------- Photo quality helpers ----------------
def _to_grayscale(arr: np.ndarray) -> np.ndarray:
    if arr.ndim == 3 and arr.shape[2] == 3:
        return (0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]).astype(np.float32)
    if arr.ndim == 2:
        return arr.astype(np.float32)
    if arr.ndim == 3 and arr.shape[2] == 4:
        rgb = arr[:, :, :3]
        return (0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]).astype(np.float32)
    return arr.astype(np.float32)

def _variance_of_laplacian(gray: np.ndarray) -> float:
    # Simple Laplacian kernel convolution
    k = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float32)
    # pad
    g = gray
    pad = np.pad(g, ((1,1),(1,1)), mode='reflect')
    out = (
        k[0,0]*pad[0:-2,0:-2] + k[0,1]*pad[0:-2,1:-1] + k[0,2]*pad[0:-2,2:] +
        k[1,0]*pad[1:-1,0:-2] + k[1,1]*pad[1:-1,1:-1] + k[1,2]*pad[1:-1,2:] +
        k[2,0]*pad[2:,0:-2] + k[2,1]*pad[2:,1:-1] + k[2,2]*pad[2:,2:]
    )
    return float(out.var())

def _compute_quality_metrics(img_pil: Image.Image, face_bbox: Tuple[float,float,float,float], kps: Optional[np.ndarray]) -> dict:
    x1, y1, x2, y2 = face_bbox
    w, h = img_pil.size
    # Clamp bbox
    x1 = max(0, min(w, x1)); x2 = max(0, min(w, x2))
    y1 = max(0, min(h, y1)); y2 = max(0, min(h, y2))
    if x2 <= x1 or y2 <= y1:
        crop = img_pil
    else:
        crop = img_pil.crop((int(x1), int(y1), int(x2), int(y2)))
    arr = np.asarray(crop)
    gray = _to_grayscale(arr)
    face_width = float(x2 - x1)
    sharpness = _variance_of_laplacian(gray)
    brightness = float(gray.mean())
    contrast = float(gray.std())
    # Simple roll proxy from eye points if available (kps shape (5,2))
    roll_abs = None
    if kps is not None and isinstance(kps, np.ndarray) and kps.shape[0] >= 2:
        left_eye, right_eye = kps[0], kps[1]
        dx = float(right_eye[0] - left_eye[0])
        dy = float(right_eye[1] - left_eye[1])
        if dx != 0:
            roll_abs = abs(np.degrees(np.arctan2(dy, dx)))
    return {
        "face_width_px": face_width,
        "sharpness": sharpness,
        "brightness": brightness,
        "contrast": contrast,
        "roll_abs": roll_abs,
    }

def _quality_pass(metrics: dict) -> Tuple[bool, List[str]]:
    reasons: List[str] = []
    face_width = metrics.get("face_width_px", 0.0)
    sharp = metrics.get("sharpness", 0.0)
    bright = metrics.get("brightness", 0.0)
    contr = metrics.get("contrast", 0.0)
    roll_abs = metrics.get("roll_abs", None)
    ok = True
    # thresholds
    if face_width < 120:
        ok = False; reasons.append("Face too small (<120 px)")
    if sharp < 100:
        ok = False; reasons.append("Too blurry (low sharpness)")
    if not (60 <= bright <= 200):
        ok = False; reasons.append("Lighting issue (too dark/bright)")
    if contr < 30:
        ok = False; reasons.append("Low contrast")
    if roll_abs is not None and roll_abs > 10:
        reasons.append("Turn head straighter (reduce roll)")
    return ok, reasons

# Try installed InsightFace first; fallback to local source if needed
try:
    from insightface.app import FaceAnalysis  # site-packages
except Exception:
    try:
        import sys
        LOCAL_INSIGHTFACE = "/Users/omrishamai/Desktop/insightface-master/python-package"
        if os.path.isdir(LOCAL_INSIGHTFACE) and LOCAL_INSIGHTFACE not in sys.path:
            sys.path.insert(0, LOCAL_INSIGHTFACE)
        from insightface.app import FaceAnalysis  # local fallback
    except Exception as e:
        raise RuntimeError(
            f"Failed to import insightface (installed or local) from '{LOCAL_INSIGHTFACE}': {e}. "
            "Install with 'pip install insightface onnxruntime' or ensure the local python-package exists."
        )


DB_PATH = os.environ.get("FACE_DB_PATH", os.path.join(os.path.dirname(__file__), "faces.db"))
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "photos")
THRESHOLD = float(os.environ.get("FACE_SIM_THRESHOLD", "0.42"))

# Ensure photos directory exists
os.makedirs(PHOTOS_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client with service role key (bypasses RLS)
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

logger.info(f"Loading Supabase config - URL: {SUPABASE_URL[:30] if SUPABASE_URL else 'None'}, Key: {'Set' if SUPABASE_SERVICE_KEY else 'None'}")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    try:
        # Create Supabase client without proxy parameter (compatibility fix)
        supabase = create_client(
            supabase_url=SUPABASE_URL,
            supabase_key=SUPABASE_SERVICE_KEY
        )
        logger.info(f"✅ Supabase client initialized: {SUPABASE_URL}")
    except Exception as e:
        logger.error(f"⚠️  Failed to initialize Supabase: {e}")
        import traceback
        logger.error(traceback.format_exc())
else:
    logger.warning("⚠️  Supabase credentials not found in environment variables")

face_app: Optional[FaceAnalysis] = None
# -----------------------
# Test report infrastructure
# -----------------------
TEST_REPORTS_ROOT = os.path.join(os.path.dirname(__file__), "test_reports")
os.makedirs(TEST_REPORTS_ROOT, exist_ok=True)

# In-memory tracking per report_id
# report_state: {
#   report_id: {
#       "dir": str,
#       "faces_known_dir": str,
#       "faces_unknown_dir": str,
#       "events": List[dict],
#       "framesProcessed": int,
#       "totalFacesDetected": int,
#       "unknownFacesDetected": int,
#       "peopleRecognized": set[str],
#       "seen_ts": set[float],
#       "video_name": Optional[str]
#   }
# }
_report_state = {}

def _ensure_report_dirs(report_id: str) -> dict:
    state = _report_state.get(report_id)
    if state:
        return state
    report_dir = os.path.join(TEST_REPORTS_ROOT, report_id)
    faces_known_dir = os.path.join(report_dir, "faces", "known")
    faces_unknown_dir = os.path.join(report_dir, "faces", "unknown")
    os.makedirs(faces_known_dir, exist_ok=True)
    os.makedirs(faces_unknown_dir, exist_ok=True)
    state = {
        "dir": report_dir,
        "faces_known_dir": faces_known_dir,
        "faces_unknown_dir": faces_unknown_dir,
        "events": [],
        "framesProcessed": 0,
        "totalFacesDetected": 0,
        "unknownFacesDetected": 0,
        "peopleRecognized": set(),
        "seen_ts": set(),
        "video_name": None,
    }
    _report_state[report_id] = state
    return state

def _record_frame_seen(report: dict, ts: Optional[float]):
    if ts is None:
        report["framesProcessed"] += 1
        return
    # Only count unique timestamps once
    if ts not in report["seen_ts"]:
        report["seen_ts"].add(ts)
        report["framesProcessed"] += 1

def _save_face_crop(img_pil: Image.Image, bbox: Tuple[float, float, float, float], out_dir: str, prefix: str, person_name: str = None) -> str:
    # bbox = (x1, y1, x2, y2)
    x1, y1, x2, y2 = bbox
    # Clamp to image bounds
    w, h = img_pil.size
    x1 = max(0, min(w, x1))
    x2 = max(0, min(w, x2))
    y1 = max(0, min(h, y1))
    y2 = max(0, min(h, y2))
    if x2 <= x1 or y2 <= y1:
        # Fallback: save whole image if invalid crop
        crop = img_pil
    else:
        crop = img_pil.crop((int(x1), int(y1), int(x2), int(y2)))
    
    # Create descriptive filename with person name and timestamp
    if person_name:
        # Clean person name for filename (remove special characters)
        clean_name = "".join(c for c in person_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        clean_name = clean_name.replace(' ', '_')
        # Extract timestamp from prefix (format: ts1234)
        timestamp = prefix.replace('ts', '') if prefix.startswith('ts') else '0'
        # Convert to seconds with decimal
        timestamp_sec = f"{int(timestamp) / 1000:.1f}"
        filename = f"{clean_name}_{timestamp_sec}.jpg"
    else:
        # Unknown faces: name as unknown_{seconds}.jpg using timestamp from prefix (tsXXXX)
        timestamp = prefix.replace('ts', '') if prefix.startswith('ts') else '0'
        timestamp_sec = f"{int(timestamp) / 1000:.1f}"
        filename = f"unknown_{timestamp_sec}.jpg"
    
    path = os.path.join(out_dir, filename)
    try:
        crop.save(path, "JPEG", quality=90)
    except Exception:
        # If save fails for any reason, ignore silently
        pass
    return path

def _append_event(report: dict, event: dict):
    # Convert any non-serializable items (like sets) later at finalize
    report["events"].append(event)



def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS persons (
            person_id TEXT PRIMARY KEY,
            person_name TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id TEXT,
            embedding BLOB,
            created_at REAL,
            FOREIGN KEY (person_id) REFERENCES persons(person_id)
        )
        """
    )
    # Groups and membership tables
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS groups (
            group_id TEXT PRIMARY KEY,
            group_name TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS group_members (
            group_id TEXT,
            person_id TEXT,
            PRIMARY KEY (group_id, person_id),
            FOREIGN KEY (group_id) REFERENCES groups(group_id),
            FOREIGN KEY (person_id) REFERENCES persons(person_id)
        )
        """
    )
    # Ensure required columns exist even if an older schema was created before
    try:
        cur.execute("PRAGMA table_info(embeddings)")
        cols = [row[1] for row in cur.fetchall()]
        if "embedding" not in cols and "vector" in cols:
            pass
        elif "embedding" not in cols:
            cur.execute("ALTER TABLE embeddings ADD COLUMN embedding BLOB")
        if "created_at" not in cols:
            cur.execute("ALTER TABLE embeddings ADD COLUMN created_at REAL")
        
        # Add additional columns to persons table
        cur.execute("PRAGMA table_info(persons)")
        person_cols = [row[1] for row in cur.fetchall()]
        if "photo_paths" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN photo_paths TEXT")
        if "email" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN email TEXT")
        if "age_group" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN age_group TEXT")
        if "age" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN age INTEGER")
        if "parent_name" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN parent_name TEXT")
        if "parent_phone" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN parent_phone TEXT")
        if "allergies" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN allergies TEXT")  # JSON string array
        
        # Add columns to groups table
        cur.execute("PRAGMA table_info(groups)")
        group_cols = [row[1] for row in cur.fetchall()]
        if "guide_id" not in group_cols:
            cur.execute("ALTER TABLE groups ADD COLUMN guide_id TEXT")
        if "age" not in group_cols:
            cur.execute("ALTER TABLE groups ADD COLUMN age TEXT")
        if "guides_info" not in group_cols:
            cur.execute("ALTER TABLE groups ADD COLUMN guides_info TEXT")
        if "notes" not in group_cols:
            cur.execute("ALTER TABLE groups ADD COLUMN notes TEXT")
    except Exception:
        pass
    conn.commit()
    conn.close()


class InitRequest(BaseModel):
    model_pack: str = "buffalo_l"
    det_width: int = 640
    det_height: int = 640
    # Optional: force models to be loaded from a local root only (no auto-download)
    model_root: Optional[str] = None
    offline_only: bool = False


class EnrollRequest(BaseModel):
    person_id: str
    person_name: str
    image: str  # dataURL or base64


class RecognizeRequest(BaseModel):
    image: str  # dataURL or base64
    filter_ids: Optional[List[str]] = None
    group_id: Optional[str] = None
    report_id: Optional[str] = None
    timestamp: Optional[float] = None


class DetectRequest(BaseModel):
    image: str  # dataURL or base64


def decode_image_b64(data: str) -> Image.Image:
    # Accepts dataURL or plain base64
    if data.startswith("data:"):
        header, b64 = data.split(",", 1)
    else:
        b64 = data
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return img


def pil_to_ndarray(img: Image.Image) -> np.ndarray:
    return np.array(img)[:, :, ::-1].copy()  # RGB->BGR copy for cv2-style


def l2_normalize(vec: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(vec) + 1e-12
    return vec / n


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/init")
def init(req: InitRequest):
    global face_app
    if face_app is None:
        try:
            # If a custom local model root is provided, validate it and force local-only if requested
            root_arg = None
            if req.model_root:
                root_arg = req.model_root
                # Also point INSIGHTFACE_HOME so any internal path resolution prefers this root
                os.environ["INSIGHTFACE_HOME"] = req.model_root
                # If offline_only, ensure expected pack directory exists and has at least one ONNX
                if req.offline_only:
                    pack_dir = os.path.join(req.model_root, "models", req.model_pack)
                    if not os.path.isdir(pack_dir):
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Model pack directory not found for offline mode: {pack_dir}. "
                                "Place your custom ONNX models under models/<pack>/ and retry."
                            ),
                        )
                    has_onnx = any(
                        f.lower().endswith(".onnx") for f in os.listdir(pack_dir)
                    )
                    if not has_onnx:
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"No ONNX files found in {pack_dir}. Offline mode requires local models."
                            ),
                        )

            fa = FaceAnalysis(name=req.model_pack, root=root_arg) if root_arg else FaceAnalysis(name=req.model_pack)
            # CPU: ctx_id=-1. Use 0 for first GPU.
            fa.prepare(ctx_id=-1, det_size=(req.det_width, req.det_height))
            face_app = fa
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to init FaceAnalysis: {e}")
    init_db()
    return {"status": "ready"}


@app.post("/detect")
def detect(req: DetectRequest):
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")

    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    out = []
    for f in faces or []:
        x1, y1, x2, y2 = map(float, f.bbox)
        out.append({
            "x": x1,
            "y": y1,
            "width": x2 - x1,
            "height": y2 - y1,
        })
    return {"boxes": out}


@app.post("/photo/quality")
def photo_quality(req: DetectRequest):
    try:
        if face_app is None:
            raise HTTPException(status_code=400, detail="Service not initialized")
        
        logger.info("📸 Quality check requested")
        img_pil = decode_image_b64(req.image)
        img = pil_to_ndarray(img_pil)
        faces = face_app.get(img)
        
        if not faces:
            logger.warning("⚠️  No face detected in quality check")
            return {"faces": [], "message": "No face detected", "passed": False}
        
        # Score largest face
        faces.sort(key=lambda f: float((f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1])), reverse=True)
        f = faces[0]
        x1, y1, x2, y2 = map(float, f.bbox)
        kps = getattr(f, 'kps', None)
        metrics = _compute_quality_metrics(img_pil, (x1,y1,x2,y2), kps)
        passed, reasons = _quality_pass(metrics)
        
        logger.info(f"✅ Quality check complete: passed={passed}")
        return {
            "metrics": metrics,
            "passed": passed,
            "reasons": reasons
        }
    except Exception as e:
        logger.error(f"❌ Error in quality check: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/embedding")
def get_embedding(req: DetectRequest):
    """Get face embedding from an image without saving it"""
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")

    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected")

    # Take the largest face
    faces.sort(key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
    face = faces[0]
    emb = np.array(face.normed_embedding, dtype=np.float32)
    emb = l2_normalize(emb)

    # Return embedding as list
    return {"embedding": emb.tolist()}

@app.post("/enroll")
def enroll(req: EnrollRequest):
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")

    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    if not faces:
        raise HTTPException(status_code=400, detail="No face detected")

    # Take the largest face
    faces.sort(key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
    face = faces[0]
    emb = np.array(face.normed_embedding, dtype=np.float32)
    emb = l2_normalize(emb)

    # Quality enforcement
    x1, y1, x2, y2 = map(float, face.bbox)
    kps = getattr(face, 'kps', None)
    metrics = _compute_quality_metrics(img_pil, (x1,y1,x2,y2), kps)
    passed, reasons = _quality_pass(metrics)
    if not passed:
        raise HTTPException(status_code=400, detail={
            "message": "Photo quality too low for enrollment",
            "metrics": metrics,
            "reasons": reasons
        })

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR IGNORE INTO persons(person_id, person_name) VALUES (?, ?)",
        (req.person_id, req.person_name),
    )
    # Select correct embedding column name
    cur.execute("PRAGMA table_info(embeddings)")
    cols = [row[1] for row in cur.fetchall()]
    emb_col = "embedding" if "embedding" in cols else "vector"
    cur.execute(
        f"INSERT INTO embeddings(person_id, {emb_col}, created_at) VALUES (?, ?, ?)",
        (req.person_id, emb.tobytes(), time.time()),
    )
    conn.commit()
    conn.close()
    return {"status": "enrolled", "person_id": req.person_id}


def load_embeddings(filter_ids: Optional[List[str]] = None) -> List[Tuple[str, np.ndarray]]:
    conn = get_conn()
    cur = conn.cursor()
    # Determine which column holds the embedding data
    cur.execute("PRAGMA table_info(embeddings)")
    cols = [row[1] for row in cur.fetchall()]
    emb_col = "embedding" if "embedding" in cols else ("vector" if "vector" in cols else None)
    if not emb_col:
        conn.close()
        return []
    if filter_ids:
        q_marks = ",".join(["?"] * len(filter_ids))
        cur.execute(
            f"SELECT person_id, {emb_col} FROM embeddings WHERE person_id IN ({q_marks})",
            filter_ids,
        )
    else:
        cur.execute(f"SELECT person_id, {emb_col} FROM embeddings")
    rows = cur.fetchall()
    conn.close()
    out: List[Tuple[str, np.ndarray]] = []
    for pid, vec in rows:
        arr = np.frombuffer(vec, dtype=np.float32)
        out.append((pid, arr))
    return out


def person_name_map() -> dict:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT person_id, person_name FROM persons")
    rows = cur.fetchall()
    conn.close()
    return {pid: name for pid, name in rows}


# Simple in-memory cache for group members to reduce DB lookups per request
_group_members_cache: dict = {}
_GROUP_MEMBERS_TTL_SECONDS = 60.0

def get_group_members_cached(group_id: str) -> List[str]:
    now = time.time()
    cached = _group_members_cache.get(group_id)
    if cached and (now - cached[0]) < _GROUP_MEMBERS_TTL_SECONDS:
        return cached[1]
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT person_id FROM group_members WHERE group_id = ?", (group_id,))
    members = [r[0] for r in cur.fetchall()]
    conn.close()
    _group_members_cache[group_id] = (now, members)
    return members


# Person & Group management endpoints

class PersonCreate(BaseModel):
    person_id: str
    person_name: str


@app.post("/person")
def create_person(req: PersonCreate):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO persons(person_id, person_name) VALUES (?, ?)",
        (req.person_id, req.person_name),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


class PersonUpdate(BaseModel):
    person_id: str
    person_name: str
    email: Optional[str] = None
    age_group: Optional[str] = None
    age: Optional[int] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    allergies: Optional[List[str]] = None


@app.post("/person/update")
def update_person(req: PersonUpdate):
    """Update person details in the database"""
    conn = get_conn()
    cur = conn.cursor()
    
    # Serialize allergies as JSON string
    allergies_json = json.dumps(req.allergies) if req.allergies else None
    
    cur.execute(
        """
        UPDATE persons 
        SET person_name = ?,
            email = ?,
            age_group = ?,
            age = ?,
            parent_name = ?,
            parent_phone = ?,
            allergies = ?
        WHERE person_id = ?
        """,
        (req.person_name, req.email, req.age_group, req.age, 
         req.parent_name, req.parent_phone, allergies_json, req.person_id),
    )
    
    if cur.rowcount == 0:
        # Person doesn't exist, insert them
        cur.execute(
            """
            INSERT INTO persons 
            (person_id, person_name, email, age_group, age, parent_name, parent_phone, allergies)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (req.person_id, req.person_name, req.email, req.age_group, req.age,
             req.parent_name, req.parent_phone, allergies_json),
        )
    
    conn.commit()
    conn.close()
    return {"status": "ok", "person_id": req.person_id}


class GroupCreate(BaseModel):
    group_id: str
    group_name: str


@app.post("/group")
def create_group(req: GroupCreate):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO groups(group_id, group_name) VALUES (?, ?)",
        (req.group_id, req.group_name),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


class GroupAddMember(BaseModel):
    group_id: str
    person_id: str


@app.post("/group/add")
def add_member(req: GroupAddMember):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR IGNORE INTO group_members(group_id, person_id) VALUES (?, ?)",
        (req.group_id, req.person_id),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


class GroupRemoveMember(BaseModel):
    group_id: str
    person_id: str


@app.post("/group/remove")
def remove_member(req: GroupRemoveMember):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM group_members WHERE group_id = ? AND person_id = ?",
        (req.group_id, req.person_id),
    )
    conn.commit()
    conn.close()
    return {"status": "ok"}


class DeletePersonRequest(BaseModel):
    person_id: str


@app.post("/person/delete")
def delete_person(req: DeletePersonRequest):
    conn = get_conn()
    cur = conn.cursor()
    # Cascade delete: remove embeddings, group memberships, then person
    cur.execute("DELETE FROM embeddings WHERE person_id = ?", (req.person_id,))
    cur.execute("DELETE FROM group_members WHERE person_id = ?", (req.person_id,))
    cur.execute("DELETE FROM persons WHERE person_id = ?", (req.person_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


class DeleteGroupRequest(BaseModel):
    group_id: str


@app.post("/group/delete")
def delete_group(req: DeleteGroupRequest):
    conn = get_conn()
    cur = conn.cursor()
    # Cascade delete: remove group memberships, then group
    cur.execute("DELETE FROM group_members WHERE group_id = ?", (req.group_id,))
    cur.execute("DELETE FROM groups WHERE group_id = ?", (req.group_id,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/groups")
def list_groups():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT group_id, group_name FROM groups")
    groups = cur.fetchall()
    out = []
    for gid, gname in groups:
        cur.execute("SELECT person_id FROM group_members WHERE group_id = ?", (gid,))
        members = [r[0] for r in cur.fetchall()]
        out.append({"group_id": gid, "group_name": gname, "members": members})
    conn.close()
    return {"groups": out}


@app.post("/recognize")
def recognize(req: RecognizeRequest):
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")

    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    if not faces:
        return {"faces": []}

    # If group provided and no filter_ids, derive IDs from group membership (cached)
    filter_ids = req.filter_ids
    if not filter_ids and req.group_id:
        filter_ids = get_group_members_cached(req.group_id)

    enrolled = load_embeddings(filter_ids)
    if not enrolled:
        return {"faces": []}

    id_to_name = person_name_map()
    results = []
    start_time = time.time()
    # Prepare vectorized matrix of enrolled embeddings for faster matching (accuracy preserved)
    enrolled_ids = [pid for pid, _ in enrolled]
    enrolled_mat = np.stack([l2_normalize(e.astype(np.float32)) for _, e in enrolled], axis=0)

    # Optional reporting: record frame and recognized crops if report_id provided
    report_id = req.report_id
    ts = req.timestamp
    state = _ensure_report_dirs(report_id) if report_id else None
    if state:
        _record_frame_seen(state, ts)

    for f in faces:
        emb = np.array(f.normed_embedding, dtype=np.float32)
        emb = l2_normalize(emb)
        # Cosine similarity since both sides are L2-normalized
        sims = enrolled_mat @ emb  # shape: (N,)
        # top-1 and top-2
        best_idx = int(np.argmax(sims))
        best_score = float(sims[best_idx])
        second_score = float(np.partition(sims, -2)[-2]) if sims.shape[0] > 1 else -1.0

        # Face size based rules (disabled small-face gate to restore previous behavior)
        x1, y1, x2, y2 = map(float, f.bbox)
        face_w = x2 - x1
        
        if best_score >= THRESHOLD:
            best_id = enrolled_ids[best_idx]
            results.append(
                {
                    "person_id": best_id,
                    "person_name": id_to_name.get(best_id, best_id),
                    "confidence": best_score,
                    "box": {
                        "x": x1,
                        "y": y1,
                        "width": x2 - x1,
                        "height": y2 - y1,
                    },
                }
            )
            # Save known face crop if report is active
            if state:
                state["totalFacesDetected"] += 1
                state["peopleRecognized"].add(id_to_name.get(best_id, best_id))
                person_name = id_to_name.get(best_id, best_id)
                path = _save_face_crop(img_pil, (x1, y1, x2, y2), state["faces_known_dir"], prefix=f"ts{int((ts or 0)*1000)}", person_name=person_name)
                _append_event(state, {
                    "timestamp": ts,
                    "type": "recognized",
                    "person_id": best_id,
                    "person_name": id_to_name.get(best_id, best_id),
                    "confidence": best_score,
                    "box": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                    "image_path": os.path.relpath(path, state["dir"]) if path else None,
                })
        # stop after ~700ms to avoid blocking live camera
        if (time.time() - start_time) >= 0.7:
            break

    return {"faces": results}


class ValidateFaceRequest(BaseModel):
    image: str  # base64 image

class ProcessVideoFrameRequest(BaseModel):
    image: str  # base64 video frame
    timestamp: float  # timestamp in seconds
    report_id: Optional[str] = None

@app.post("/validate-face")
def validate_face(req: ValidateFaceRequest):
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")
    
    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    
    if not faces:
        return {
            "score": 0,
            "quality": "poor",
            "message": "No face detected - Please upload a clearer photo",
            "face_count": 0,
            "recommendation": "Upload a photo with a clear, well-lit face"
        }
    
    # Take the largest face for quality assessment
    faces.sort(key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
    face = faces[0]
    
    # Calculate quality metrics
    x1, y1, x2, y2 = map(float, face.bbox)
    face_width = x2 - x1
    face_height = y2 - y1
    face_area = face_width * face_height
    img_area = img.shape[0] * img.shape[1]
    face_ratio = face_area / img_area
    
    # Calculate face angle (using landmarks if available)
    angle_score = 1.0  # Default to good angle
    if hasattr(face, 'kps') and face.kps is not None:
        # Simple angle calculation based on eye positions
        left_eye = face.kps[0] if len(face.kps) > 0 else None
        right_eye = face.kps[1] if len(face.kps) > 1 else None
        if left_eye is not None and right_eye is not None:
            eye_distance = np.linalg.norm(np.array(left_eye) - np.array(right_eye))
            if eye_distance > 0:
                # Calculate angle based on eye alignment
                angle = abs(np.arctan2(right_eye[1] - left_eye[1], right_eye[0] - left_eye[0]))
                angle_score = max(0, 1 - abs(angle) / (np.pi / 4))  # Penalize angles > 45 degrees
    
    # Calculate size score (face should be reasonably large)
    size_score = min(1.0, face_ratio * 20)  # Good if face takes up at least 5% of image
    
    # Calculate overall quality score (0-100)
    quality_score = int((size_score * 0.4 + angle_score * 0.3 + 0.3) * 100)  # Base score + size + angle
    
    # Determine quality level
    if quality_score >= 70:
        quality = "excellent"
        message = "Excellent - Face clearly visible"
    elif quality_score >= 40:
        quality = "good"
        message = "Good - Face detected, sufficient quality"
    else:
        quality = "poor"
        message = "Poor - Face too small, blurry, or poorly lit"
    
    return {
        "score": quality_score,
        "quality": quality,
        "message": message,
        "face_count": len(faces),
        "face_ratio": float(face_ratio),
        "angle_score": float(angle_score),
        "size_score": float(size_score),
        "recommendation": "Upload additional photos from different angles" if quality_score < 60 else "Photo quality is good"
    }

@app.post("/process-video-frame")
def process_video_frame(req: ProcessVideoFrameRequest):
    if face_app is None:
        raise HTTPException(status_code=400, detail="Service not initialized")
    
    img_pil = decode_image_b64(req.image)
    img = pil_to_ndarray(img_pil)
    faces = face_app.get(img)
    
    if not faces:
        # Reporting: count empty frame if report active
        state = _ensure_report_dirs(req.report_id) if req.report_id else None
        if state:
            _record_frame_seen(state, req.timestamp)
        return {"faces": [], "timestamp": req.timestamp}
    
    # Use same recognition logic as live camera
    # Optional reporting capture if a report_id is present in a side-channel
    # For now, we only update counters and save unknown crops if called by a test harness that knows the report_id.
    state = _ensure_report_dirs(req.report_id) if req.report_id else None
    if state:
        _record_frame_seen(state, req.timestamp)
        state["totalFacesDetected"] += len(faces)
    results = []

    def _iou(b1, b2) -> float:
        x1 = max(b1[0], b2[0])
        y1 = max(b1[1], b2[1])
        x2 = min(b1[2], b2[2])
        y2 = min(b1[3], b2[3])
        inter = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        if inter <= 0:
            return 0.0
        a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
        a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
        denom = a1 + a2 - inter
        return inter / denom if denom > 0 else 0.0
    for f in faces:
        x1, y1, x2, y2 = map(float, f.bbox)
        results.append({
            "x": x1,
            "y": y1,
            "width": x2 - x1,
            "height": y2 - y1,
            "timestamp": req.timestamp
        })
        if state:
            # Dedupe: if a recognized event exists for same timestamp and overlapping box, skip unknown
            should_save_unknown = True
            try:
                for ev in reversed(state["events"][-50:]):  # scan recent
                    if ev.get("timestamp") == req.timestamp and ev.get("type") == "recognized":
                        bx = ev.get("box", {})
                        rb = (float(bx.get("x", 0)), float(bx.get("y", 0)), float(bx.get("x", 0)) + float(bx.get("width", 0)), float(bx.get("y", 0)) + float(bx.get("height", 0)))
                        if _iou((x1, y1, x2, y2), rb) >= 0.5:
                            should_save_unknown = False
                            break
            except Exception:
                pass

            if should_save_unknown:
                # Save detection crop under unknown; recognition endpoint will later save known
                path = _save_face_crop(img_pil, (x1, y1, x2, y2), state["faces_unknown_dir"], prefix=f"ts{int(req.timestamp*1000)}", person_name=None)
                _append_event(state, {
                    "timestamp": req.timestamp,
                    "type": "detected",
                    "unknown": True,
                    "box": {"x": x1, "y": y1, "width": x2 - x1, "height": y2 - y1},
                    "image_path": os.path.relpath(path, state["dir"]) if path else None,
                })
                state["unknownFacesDetected"] += 1
    
    return {"faces": results, "timestamp": req.timestamp}

@app.post("/clear")
def clear():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM embeddings")
    cur.execute("DELETE FROM persons")
    cur.execute("DELETE FROM group_members")
    cur.execute("DELETE FROM groups")
    conn.commit()
    conn.close()
    return {"status": "cleared"}


@app.get("/people")
def people():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT person_id, person_name, photo_paths FROM persons")
    rows = cur.fetchall()
    conn.close()
    result = []
    for pid, name, photo_paths_json in rows:
        photo_paths = json.loads(photo_paths_json) if photo_paths_json else []
        result.append({"person_id": pid, "person_name": name, "photo_paths": photo_paths})
    return {"people": result}


# Photo Management Endpoints
class UploadPhotoRequest(BaseModel):
    person_id: str
    image: str  # base64 encoded image


@app.post("/person/photo/upload")
def upload_person_photo(req: UploadPhotoRequest):
    """Upload a photo for a person and save it to the filesystem"""
    try:
        # Decode base64 image
        img_data = req.image.split(",")[1] if "," in req.image else req.image
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes))
        
        # Create person directory if it doesn't exist
        person_dir = os.path.join(PHOTOS_DIR, req.person_id)
        os.makedirs(person_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join(person_dir, filename)
        
        # Save image
        img.save(filepath, "JPEG", quality=90)
        
        # Update database with new photo path
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT photo_paths FROM persons WHERE person_id = ?", (req.person_id,))
        row = cur.fetchone()
        
        if row:
            photo_paths = json.loads(row[0]) if row[0] else []
            photo_paths.append(filename)
            cur.execute(
                "UPDATE persons SET photo_paths = ? WHERE person_id = ?",
                (json.dumps(photo_paths), req.person_id)
            )
        
        conn.commit()
        conn.close()
        
        return {"status": "ok", "filename": filename, "path": f"/person/photo/{req.person_id}/{filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


@app.get("/person/photo/{person_id}/{filename}")
def get_person_photo(person_id: str, filename: str):
    """Serve a person's photo"""
    filepath = os.path.join(PHOTOS_DIR, person_id, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Photo not found")
    return FileResponse(
        filepath,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )


class DeletePhotoRequest(BaseModel):
    person_id: str
    filename: str


@app.post("/person/photo/delete")
def delete_person_photo(req: DeletePhotoRequest):
    """Delete a person's photo"""
    try:
        filepath = os.path.join(PHOTOS_DIR, req.person_id, req.filename)
        
        # Remove from filesystem
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Update database
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT photo_paths FROM persons WHERE person_id = ?", (req.person_id,))
        row = cur.fetchone()
        
        if row and row[0]:
            photo_paths = json.loads(row[0])
            if req.filename in photo_paths:
                photo_paths.remove(req.filename)
                cur.execute(
                    "UPDATE persons SET photo_paths = ? WHERE person_id = ?",
                    (json.dumps(photo_paths), req.person_id)
                )
        
        conn.commit()
        conn.close()
        
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")


# Group Management Endpoints
class UpdateGroupRequest(BaseModel):
    group_id: str
    group_name: Optional[str] = None
    age: Optional[str] = None
    guides_info: Optional[str] = None
    notes: Optional[str] = None


@app.post("/group/update")
def update_group(req: UpdateGroupRequest):
    """Update group details"""
    conn = get_conn()
    cur = conn.cursor()
    
    if req.group_name is not None:
        cur.execute(
            "UPDATE groups SET group_name = ? WHERE group_id = ?",
            (req.group_name, req.group_id)
        )
    
    if req.age is not None:
        cur.execute(
            "UPDATE groups SET age = ? WHERE group_id = ?",
            (req.age, req.group_id)
        )
    
    if req.guides_info is not None:
        cur.execute(
            "UPDATE groups SET guides_info = ? WHERE group_id = ?",
            (req.guides_info, req.group_id)
        )
    
    if req.notes is not None:
        cur.execute(
            "UPDATE groups SET notes = ? WHERE group_id = ?",
            (req.notes, req.group_id)
        )
    
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/groups")
def get_groups():
    """Get all groups with their members and metadata"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT group_id, group_name, age, guides_info, notes FROM groups")
    groups_rows = cur.fetchall()
    
    result = []
    for group_id, group_name, age, guides_info, notes in groups_rows:
        cur.execute("SELECT person_id FROM group_members WHERE group_id = ?", (group_id,))
        members = [row[0] for row in cur.fetchall()]
        result.append({
            "group_id": group_id,
            "group_name": group_name,
            "age": age,
            "guides_info": guides_info,
            "notes": notes,
            "members": members
        })
    
    conn.close()
    return {"groups": result}


class TestReportStartRequest(BaseModel):
    video_name: Optional[str] = None


@app.post("/test-report/start")
def test_report_start(req: TestReportStartRequest):
    report_id = uuid.uuid4().hex
    state = _ensure_report_dirs(report_id)
    state["video_name"] = req.video_name
    return {"report_id": report_id, "dir": state["dir"]}


class TestReportFinalizeRequest(BaseModel):
    report_id: str


@app.post("/test-report/finalize")
def test_report_finalize(req: TestReportFinalizeRequest):
    state = _report_state.get(req.report_id)
    if not state:
        raise HTTPException(status_code=404, detail="Report not found")
    # Build summary.json
    people_names = list(state["peopleRecognized"]) if isinstance(state["peopleRecognized"], set) else state["peopleRecognized"]
    summary = {
        "videoName": state.get("video_name"),
        "peopleRecognized": people_names,
        "framesProcessed": state["framesProcessed"],
        "totalFacesDetected": state["totalFacesDetected"],
        "unknownFacesDetected": state["unknownFacesDetected"],
        "details": state["events"],
    }
    try:
        with open(os.path.join(state["dir"], "summary.json"), "w") as f:
            json.dump(summary, f, indent=2)
    except Exception:
        pass
    return summary


@app.get("/test-report/download/{report_id}")
def test_report_download(report_id: str):
    state = _report_state.get(report_id)
    if not state:
        raise HTTPException(status_code=404, detail="Report not found")
    report_dir = state["dir"]
    zip_path = os.path.join(TEST_REPORTS_ROOT, f"{report_id}.zip")
    try:
        import zipfile
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
            for root, _, files in os.walk(report_dir):
                for f in files:
                    full = os.path.join(root, f)
                    arc = os.path.relpath(full, report_dir)
                    z.write(full, arcname=arc)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create zip: {e}")
    return FileResponse(zip_path, media_type='application/zip', filename=f"{report_id}.zip")


class SyncGroupRequest(BaseModel):
    user_id: str
    group_id: str


@app.post("/sync_group_embeddings")
def sync_group_embeddings(req: SyncGroupRequest):
    """
    Download group members and their embeddings from Supabase to local cache
    This enables offline recognition by syncing both group_members and embeddings
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not initialized")
    
    try:
        # 1. Get group info and members from Supabase
        group_response = supabase.table('groups').select('id, name').eq('id', req.group_id).execute()
        if not group_response.data:
            return {"success": False, "message": "Group not found"}
        
        group_data = group_response.data[0]
        group_name = group_data.get('name', '')
        
        members_response = supabase.table('group_members').select('person_id').eq('group_id', req.group_id).execute()
        member_person_ids = [m['person_id'] for m in members_response.data]
        
        if not member_person_ids:
            return {"success": True, "count": 0, "message": "No members in group"}
        
        print(f"🔄 Syncing group '{group_name}' with {len(member_person_ids)} members")
        
        # 2. Sync to local SQLite: groups, group_members, and embeddings
        conn = get_conn()
        c = conn.cursor()
        
        # Sync group info
        c.execute(
            "INSERT OR REPLACE INTO groups(group_id, group_name) VALUES (?, ?)",
            (req.group_id, group_name)
        )
        
        # Sync group members (clear old ones for this group, then insert new)
        c.execute("DELETE FROM group_members WHERE group_id = ?", (req.group_id,))
        for person_id in member_person_ids:
            c.execute(
                "INSERT OR IGNORE INTO group_members(group_id, person_id) VALUES (?, ?)",
                (req.group_id, person_id)
            )
        
        # Sync embeddings (clear existing for these members, then insert new)
        embeddings_count = 0
        if member_person_ids:
            q_marks = ",".join(["?"] * len(member_person_ids))
            c.execute(f"DELETE FROM embeddings WHERE person_id IN ({q_marks})", member_person_ids)
        
        for person_id in member_person_ids:
            # Get embeddings from Supabase
            emb_response = supabase.table('face_embeddings').select('embedding').eq('person_id', person_id).execute()
            
            for emb_row in emb_response.data:
                embedding_list = emb_row['embedding']
                embedding_array = np.array(embedding_list, dtype=np.float32)
                emb_blob = embedding_array.tobytes()
                
                c.execute(
                    "INSERT INTO embeddings (person_id, embedding) VALUES (?, ?)",
                    (person_id, emb_blob)
                )
                embeddings_count += 1
        
        conn.commit()
        conn.close()
        
        # Clear cache so it reloads from DB
        _group_members_cache.pop(req.group_id, None)
        
        print(f"✅ Synced group '{group_name}': {embeddings_count} embeddings for {len(member_person_ids)} members")
        return {"success": True, "count": embeddings_count, "members": len(member_person_ids)}
    except Exception as e:
        print(f"❌ Error syncing group embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync embeddings: {str(e)}")


# ============================================================================
# NEW ENDPOINTS FOR HYBRID ARCHITECTURE
# ============================================================================

class ProcessPendingRequest(BaseModel):
    pending_id: str

class SyncGroupRequest(BaseModel):
    user_id: str
    group_id: str

class EnrollPersonDirectRequest(BaseModel):
    user_id: str
    person_id: str
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    age_group: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    allergies: Optional[List[str]] = None
    photos: List[str]  # Base64 encoded images


@app.post("/enroll_person_direct")
def enroll_person_direct(req: EnrollPersonDirectRequest):
    """
    Direct enrollment from app - backend handles everything
    
    Flow:
    1. Receive photos (base64) + person details from frontend
    2. Generate face embeddings using InsightFace
    3. Upload photos to Supabase Storage: {user_id}/{person_id}/
    4. Create person in Supabase `persons` table
    5. Save embeddings to Supabase `face_embeddings` table
    6. Save to local cache (SQLite)
    7. Return success
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not initialized")
    if not face_app:
        raise HTTPException(status_code=500, detail="Face recognition not initialized")
    
    try:
        logger.info(f"📥 Direct enrollment started: {req.name} (ID: {req.person_id})")
        
        if len(req.photos) < 4:
            raise HTTPException(status_code=400, detail="At least 4 photos required")
        
        embeddings = []
        photo_urls = []
        
        # Process each photo
        for idx, photo_base64 in enumerate(req.photos[:4]):  # Limit to 4 photos
            logger.info(f"📸 Processing photo {idx + 1}/4 for {req.name}")
            
            # 1. Decode base64 image
            if ',' in photo_base64:
                photo_base64 = photo_base64.split(',')[1]  # Remove data URL prefix
            
            img_bytes = base64.b64decode(photo_base64)
            img = Image.open(io.BytesIO(img_bytes))
            
            # 2. Generate embedding
            img_array = np.array(img)
            faces = face_app.get(img_array)
            
            if not faces:
                logger.warning(f"⚠️  No face detected in photo {idx + 1}")
                continue
            
            # Get largest face
            faces.sort(key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
            face = faces[0]
            embedding = np.array(face.normed_embedding, dtype=np.float32)
            
            # Normalize embedding
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            embeddings.append(embedding.tolist())
            logger.info(f"✅ Generated embedding for photo {idx + 1}")
            
            # 3. Upload photo to Supabase Storage: {user_id}/{person_id}/
            photo_path = f"{req.user_id}/{req.person_id}/photo_{idx + 1}.jpg"
            
            # Convert image to JPEG bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=95)
            img_byte_arr.seek(0)
            
            try:
                supabase.storage.from_('face-photos').upload(
                    photo_path,
                    img_byte_arr.getvalue(),
                    {'content-type': 'image/jpeg'}
                )
                logger.info(f"☁️  Uploaded photo {idx + 1} to Supabase Storage")
            except Exception as e:
                # If upload fails due to existing file, try updating
                if 'already exists' in str(e).lower():
                    supabase.storage.from_('face-photos').update(
                        photo_path,
                        img_byte_arr.getvalue(),
                        {'content-type': 'image/jpeg'}
                    )
                    logger.info(f"☁️  Updated existing photo {idx + 1} in Supabase Storage")
                else:
                    raise
            
            photo_url = supabase.storage.from_('face-photos').get_public_url(photo_path)
            photo_urls.append(photo_url)
        
        if not embeddings:
            raise HTTPException(status_code=400, detail="No valid face embeddings could be generated")
        
        logger.info(f"✅ Generated {len(embeddings)} embeddings for {req.name}")
        
        # 4. Create person in Supabase
        person_data = {
            'id': req.person_id,
            'user_id': req.user_id,
            'name': req.name,
            'email': req.email,
            'age': req.age,
            'age_group': req.age_group,
            'parent_name': req.parent_name,
            'parent_phone': req.parent_phone,
            'allergies': req.allergies or [],
            'photo_paths': photo_urls
        }
        
        try:
            supabase.table('persons').insert(person_data).execute()
            logger.info(f"💾 Person created in Supabase: {req.name} (ID: {req.person_id})")
        except Exception as e:
            if 'duplicate' in str(e).lower() or 'already exists' in str(e).lower():
                # Update if already exists
                supabase.table('persons').update(person_data).eq('id', req.person_id).execute()
                logger.info(f"💾 Person updated in Supabase: {req.name} (ID: {req.person_id})")
            else:
                raise
        
        # 5. Save embeddings to Supabase
        for idx, embedding in enumerate(embeddings):
            embedding_data = {
                'person_id': req.person_id,
                'embedding': embedding,
                'photo_url': photo_urls[idx] if idx < len(photo_urls) else None,
                'quality_score': 1.0
            }
            supabase.table('face_embeddings').insert(embedding_data).execute()
        
        logger.info(f"☁️  Saved {len(embeddings)} embeddings to Supabase")
        
        # 6. Save to local cache (SQLite)
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Clear existing embeddings for this person (if re-enrolling)
        c.execute("DELETE FROM embeddings WHERE person_id = ?", (req.person_id,))
        
        for embedding in embeddings:
            emb_blob = np.array(embedding, dtype=np.float32).tobytes()
            c.execute(
                "INSERT INTO embeddings (person_id, embedding) VALUES (?, ?)",
                (req.person_id, emb_blob)
            )
        
        conn.commit()
        conn.close()
        logger.info(f"💽 Saved {len(embeddings)} embeddings to local cache")
        
        logger.info(f"🎉 Direct enrollment complete: {req.name}")
        
        return {
            "success": True,
            "person_id": req.person_id,
            "name": req.name,
            "embeddings_count": len(embeddings),
            "photos_uploaded": len(photo_urls),
            "message": f"✅ {req.name} enrolled successfully!"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in direct enrollment: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process_pending_enrollment")
def process_pending_enrollment(req: ProcessPendingRequest):
    """
    Process a pending enrollment: generate embeddings, move photos, save to Supabase
    
    Flow:
    1. Get pending enrollment from Supabase
    2. Download photos from pending/{pending_id}/
    3. Generate face embeddings
    4. Upload photos to {user_id}/{person_id}/
    5. Create person in Supabase
    6. Save embeddings to Supabase
    7. Save to local cache
    8. Update pending status to 'accepted'
    9. Delete old pending photos
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not initialized")
    if not face_app:
        raise HTTPException(status_code=500, detail="Face recognition not initialized")
    
    try:
        # 1. Get pending enrollment from Supabase
        response = supabase.table('pending_enrollments').select('*').eq('id', req.pending_id).single().execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Pending enrollment not found")
        
        pending = response.data
        user_id = pending['user_id']
        person_id = str(uuid.uuid4())  # Generate new person ID
        
        print(f"📥 Processing pending enrollment: {pending['name']} (ID: {req.pending_id})")
        print(f"📥 Group ID from pending enrollment: {pending.get('group_id')}")
        
        # 2. Download photos from Supabase Storage (pending folder)
        photo_urls = pending.get('photo_urls', [])
        if len(photo_urls) < 4:
            raise HTTPException(status_code=400, detail="Not enough photos in pending enrollment")
        
        embeddings = []
        final_photo_urls = []
        
        for idx, photo_url in enumerate(photo_urls[:4]):  # Process up to 4 photos
            # Extract bucket path from URL
            # URL format: https://.../storage/v1/object/public/face-photos/pending/{id}/photo.jpg
            bucket_path = photo_url.split('/face-photos/')[-1] if '/face-photos/' in photo_url else None
            
            if not bucket_path:
                print(f"⚠️  Skipping invalid photo URL: {photo_url}")
                continue
            
            # 3. Download photo from storage
            photo_data = supabase.storage.from_('face-photos').download(bucket_path)
            img = Image.open(io.BytesIO(photo_data))
            
            # 4. Generate embedding
            img_array = np.array(img)
            faces = face_app.get(img_array)
            
            if not faces:
                print(f"⚠️  No face detected in photo {idx + 1}")
                continue
            
            # Get largest face
            faces.sort(key=lambda f: float((f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1])), reverse=True)
            face = faces[0]
            embedding = np.array(face.normed_embedding, dtype=np.float32)
            
            # Normalize embedding
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            embeddings.append(embedding.tolist())
            
            # 5. Upload photo to final location: {user_id}/{person_id}/
            final_path = f"{user_id}/{person_id}/photo_{idx + 1}.jpg"
            
            # Convert image back to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG')
            img_byte_arr.seek(0)
            
            supabase.storage.from_('face-photos').upload(
                final_path,
                img_byte_arr.getvalue(),
                {'content-type': 'image/jpeg'}
            )
            
            final_photo_url = supabase.storage.from_('face-photos').get_public_url(final_path)
            final_photo_urls.append(final_photo_url)
            
            print(f"✅ Processed photo {idx + 1}/4 - embedding generated, photo uploaded")
        
        if not embeddings:
            raise HTTPException(status_code=400, detail="No valid face embeddings could be generated")
        
        # 6. Create person in Supabase
        person_data = {
            'id': person_id,
            'user_id': user_id,
            'name': pending['name'],
            'email': pending.get('email'),
            'age': pending.get('age'),
            'age_group': pending.get('age_group'),
            'parent_name': pending.get('parent_name'),
            'parent_phone': pending.get('parent_phone'),
            'allergies': pending.get('allergies', []),
            'photo_paths': final_photo_urls
        }
        
        supabase.table('persons').insert(person_data).execute()
        print(f"✅ Person created in Supabase: {pending['name']} (ID: {person_id})")
        
        # 6.5. Add person to group if group_id is specified
        group_id = pending.get('group_id')
        if group_id:
            try:
                supabase.table('group_members').insert({
                    'group_id': group_id,
                    'person_id': person_id
                }).execute()
                print(f"✅ Added {pending['name']} to group {group_id}")
            except Exception as e:
                print(f"⚠️  Failed to add person to group: {e}")
        
        # 7. Save embeddings to Supabase
        for idx, embedding in enumerate(embeddings):
            embedding_data = {
                'person_id': person_id,
                'embedding': embedding,
                'photo_url': final_photo_urls[idx] if idx < len(final_photo_urls) else None,
                'quality_score': 1.0  # Could add actual quality score
            }
            supabase.table('face_embeddings').insert(embedding_data).execute()
        
        print(f"✅ Saved {len(embeddings)} embeddings to Supabase")
        
        # 8. Save to local cache (SQLite)
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        for embedding in embeddings:
            emb_blob = np.array(embedding, dtype=np.float32).tobytes()
            c.execute(
                "INSERT INTO embeddings (person_id, embedding) VALUES (?, ?)",
                (person_id, emb_blob)
            )
        
        conn.commit()
        conn.close()
        print(f"✅ Saved {len(embeddings)} embeddings to local cache")
        
        # 9. Update pending status to 'accepted'
        supabase.table('pending_enrollments').update({'status': 'accepted'}).eq('id', req.pending_id).execute()
        
        # 10. Delete old pending photos from storage
        for photo_url in photo_urls:
            bucket_path = photo_url.split('/face-photos/')[-1] if '/face-photos/' in photo_url else None
            if bucket_path:
                try:
                    supabase.storage.from_('face-photos').remove([bucket_path])
                    print(f"🗑️  Deleted pending photo: {bucket_path}")
                except Exception as e:
                    print(f"⚠️  Failed to delete pending photo: {e}")
        
        return {
            "success": True,
            "person_id": person_id,
            "name": pending['name'],
            "embeddings_count": len(embeddings),
            "photos_uploaded": len(final_photo_urls),
            "photo_urls": final_photo_urls,
            "group_id": group_id
        }
        
    except Exception as e:
        print(f"❌ Error processing pending enrollment: {e}")
        raise HTTPException(status_code=500, detail=str(e))




if __name__ == "__main__":
    import uvicorn

    init_db()
    uvicorn.run(app, host="0.0.0.0", port=8000)


