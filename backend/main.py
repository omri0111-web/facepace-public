import base64
import io
import json
import os
import sqlite3
import time
import uuid
from typing import List, Optional, Tuple

import numpy as np
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from PIL import Image

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

face_app: Optional[FaceAnalysis] = None


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
        
        # Add photo_paths column to persons table
        cur.execute("PRAGMA table_info(persons)")
        person_cols = [row[1] for row in cur.fetchall()]
        if "photo_paths" not in person_cols:
            cur.execute("ALTER TABLE persons ADD COLUMN photo_paths TEXT")
        
        # Add guide_id column to groups table
        cur.execute("PRAGMA table_info(groups)")
        group_cols = [row[1] for row in cur.fetchall()]
        if "guide_id" not in group_cols:
            cur.execute("ALTER TABLE groups ADD COLUMN guide_id TEXT")
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

    # If group provided and no filter_ids, derive IDs from group membership
    filter_ids = req.filter_ids
    if not filter_ids and req.group_id:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT person_id FROM group_members WHERE group_id = ?", (req.group_id,))
        filter_ids = [r[0] for r in cur.fetchall()]
        conn.close()

    enrolled = load_embeddings(filter_ids)
    if not enrolled:
        return {"faces": []}

    id_to_name = person_name_map()
    results = []
    start_time = time.time()
    for f in faces:
        emb = np.array(f.normed_embedding, dtype=np.float32)
        emb = l2_normalize(emb)
        best_id = None
        best_score = -1.0
        for pid, e in enrolled:
            s = cosine(emb, e)
            if s > best_score:
                best_score = s
                best_id = pid
        if best_id is not None and best_score >= THRESHOLD:
            x1, y1, x2, y2 = map(float, f.bbox)
            results.append(
                {
                    "person_id": best_id,
                    "person_name": id_to_name.get(best_id, best_id),
                    "confidence": float(best_score),
                    "box": {
                        "x": x1,
                        "y": y1,
                        "width": x2 - x1,
                        "height": y2 - y1,
                    },
                }
            )
        # stop after ~700ms to avoid blocking live camera
        if (time.time() - start_time) >= 0.7:
            break

    return {"faces": results}


class ValidateFaceRequest(BaseModel):
    image: str  # base64 image

class ProcessVideoFrameRequest(BaseModel):
    image: str  # base64 video frame
    timestamp: float  # timestamp in seconds

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
        return {"faces": [], "timestamp": req.timestamp}
    
    # Use same recognition logic as live camera
    results = []
    for f in faces:
        x1, y1, x2, y2 = map(float, f.bbox)
        results.append({
            "x": x1,
            "y": y1,
            "width": x2 - x1,
            "height": y2 - y1,
            "timestamp": req.timestamp
        })
    
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
    return FileResponse(filepath)


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
    guide_id: Optional[str] = None


@app.post("/group/update")
def update_group(req: UpdateGroupRequest):
    """Update group details including guide assignment"""
    conn = get_conn()
    cur = conn.cursor()
    
    if req.group_name is not None:
        cur.execute(
            "UPDATE groups SET group_name = ? WHERE group_id = ?",
            (req.group_name, req.group_id)
        )
    
    if req.guide_id is not None:
        cur.execute(
            "UPDATE groups SET guide_id = ? WHERE group_id = ?",
            (req.guide_id, req.group_id)
        )
    
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/groups")
def get_groups():
    """Get all groups with their members and guide"""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT group_id, group_name, guide_id FROM groups")
    groups_rows = cur.fetchall()
    
    result = []
    for group_id, group_name, guide_id in groups_rows:
        cur.execute("SELECT person_id FROM group_members WHERE group_id = ?", (group_id,))
        members = [row[0] for row in cur.fetchall()]
        result.append({
            "group_id": group_id,
            "group_name": group_name,
            "guide_id": guide_id,
            "members": members
        })
    
    conn.close()
    return {"groups": result}


if __name__ == "__main__":
    import uvicorn

    init_db()
    uvicorn.run(app, host="127.0.0.1", port=8000)


