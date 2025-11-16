# FacePace Architecture - Deployment Ready

## Overview

FacePace now uses a hybrid architecture that splits responsibilities between Supabase (data & auth) and Railway (AI face recognition).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER'S BROWSER                                             │
│  ↓                                                           │
│  React App (Vercel)                                         │
│  - User Interface                                            │
│  - Camera Access                                             │
│  - Photo Upload                                              │
└─────────────────────────────────────────────────────────────┘
         │                                  │
         │ (Data Operations)                │ (Face Recognition)
         ↓                                  ↓
┌─────────────────────────┐    ┌──────────────────────────────┐
│   SUPABASE              │    │  RAILWAY (Python Backend)    │
│                         │    │                              │
│  • PostgreSQL Database  │    │  • InsightFace AI           │
│  • Authentication       │    │  • Face Detection           │
│  • Photo Storage        │    │  • Embedding Generation     │
│  • Row Level Security   │    │  • Face Recognition         │
│                         │    │  • Quality Validation       │
│  Tables:                │    │                              │
│  - persons              │    │  Endpoints:                  │
│  - groups               │    │  - /init                     │
│  - group_members        │    │  - /detect                   │
│  - face_embeddings      │    │  - /enroll                   │
│  - enrollment_links     │    │  - /recognize                │
│  - share_requests       │    │  - /validate-face            │
│                         │    │                              │
│  Storage:               │    │                              │
│  - face-photos/         │    │                              │
│    {user_id}/           │    │                              │
│      {person_id}/       │    │                              │
│        photo_*.jpg      │    │                              │
└─────────────────────────┘    └──────────────────────────────┘
```

## Data Flow

### 1. User Signs Up / Logs In

```
Browser → Supabase Auth → Returns Session Token → Stored in localStorage
```

**Files Involved:**
- `src/components/LoginPage.tsx` - UI for login/signup
- `src/hooks/useAuth.tsx` - Authentication logic
- `src/App.tsx` - Checks auth state and shows LoginPage if not authenticated

### 2. Adding a Person with Face Recognition

```
1. User enters name/details in AddPersonModal
   └─> src/components/AddPersonModal.tsx

2. User captures photos with camera
   └─> Takes 3-5 photos for better recognition

3. Frontend uploads photos to Supabase Storage
   └─> supabaseDataService.uploadPersonPhoto()
   └─> Uploads to: face-photos/{user_id}/{person_id}/photo_*.jpg

4. Frontend creates person record in Supabase
   └─> supabaseDataService.createPerson()
   └─> Inserts into 'persons' table with user_id

5. For each photo, frontend calls Railway to analyze face
   └─> backendRecognitionService.enrollFace()
   └─> Railway extracts 512-dimensional embedding
   └─> Returns embedding + quality metrics

6. Frontend stores embeddings in Supabase
   └─> supabaseDataService.storeFaceEmbedding()
   └─> Inserts into 'face_embeddings' table

Person is now enrolled and can be recognized!
```

**Files Involved:**
- `src/services/SupabaseDataService.ts` - Data CRUD operations
- `src/services/BackendRecognitionService.ts` - Face AI operations
- `src/components/AddPersonModal.tsx` - Person enrollment UI

### 3. Face Recognition During Attendance

```
1. User selects a group and starts camera
   └─> src/components/RealFaceCameraView.tsx

2. Frontend fetches all group members from Supabase
   └─> supabaseDataService.getGroupMembers()

3. Frontend fetches all embeddings for those members
   └─> supabaseDataService.getPersonEmbeddings()

4. For each video frame (30 FPS):
   a. Capture frame as base64 image
   b. Send to Railway with known embeddings
      └─> backendRecognitionService.recognizeFrame()
   c. Railway detects faces and matches against embeddings
   d. Returns: [{personId, confidence, bbox}, ...]
   e. Frontend draws boxes and names on video

5. User confirms attendance
   └─> Saves attendance record
```

**Files Involved:**
- `src/components/RealFaceCameraView.tsx` - Live face recognition UI
- `src/services/BackendRecognitionService.ts` - Sends frames to Railway
- `backend/main.py` - Face recognition endpoints (on Railway)

### 4. Enrollment Links (Public Signup)

```
1. User creates enrollment link
   └─> supabaseDataService.createEnrollmentLink()
   └─> Generates code like "abc123"
   └─> Stores in 'enrollment_links' table

2. User shares link: https://yourapp.vercel.app/enroll/abc123

3. Person (not logged in) clicks link
   └─> Opens PublicEnrollmentPage.tsx
   └─> No login required!

4. Person enters their info and takes photos
   └─> Photos uploaded to link creator's Supabase storage
   └─> Person created with link creator's user_id
   └─> Embeddings generated via Railway
   └─> Stored in link creator's database

5. Link creator sees new person in their People list!
```

**Files Involved:**
- `src/components/PublicEnrollmentPage.tsx` - Public enrollment UI
- `src/services/SupabaseDataService.ts` - Creates person for link owner

## Service Layer Responsibilities

### SupabaseDataService (`src/services/SupabaseDataService.ts`)

**Handles:**
- ✅ Creating/reading/updating/deleting persons
- ✅ Creating/reading/updating/deleting groups
- ✅ Managing group memberships
- ✅ Uploading/deleting photos to Supabase Storage
- ✅ Storing/fetching face embeddings
- ✅ Managing enrollment links
- ✅ Share requests (future feature)

**Does NOT handle:**
- ❌ Face detection
- ❌ Face recognition
- ❌ Embedding generation
- ❌ Quality validation

### BackendRecognitionService (`src/services/BackendRecognitionService.ts`)

**Handles:**
- ✅ Face detection in photos
- ✅ Face recognition in video frames
- ✅ Embedding generation (512-dimensional vectors)
- ✅ Face quality validation (blur, lighting, angle)
- ✅ Multi-face enrollment

**Does NOT handle:**
- ❌ Data storage (delegates to SupabaseDataService)
- ❌ Photo storage (delegates to SupabaseDataService)
- ❌ User authentication

## Security Architecture

### Row Level Security (RLS)

Every table in Supabase has RLS policies that ensure:

```sql
-- Example: Users can only see their own people
CREATE POLICY "Users can view own persons"
  ON persons FOR SELECT
  USING (auth.uid() = user_id);
```

**What this means:**
- User A cannot see User B's people
- User A cannot see User B's groups
- User A cannot see User B's photos
- Even if someone tries to hack the API, RLS blocks it!

### Photo Storage Security

Photos are stored with RLS policies:

```
face-photos/
  {user_id}/         ← Only this user can access
    {person_id}/
      photo_1.jpg
      photo_2.jpg
```

Users can only:
- Upload to their own folder
- View photos in their own folder
- Delete photos in their own folder

### Authentication Flow

```
1. User logs in → Supabase returns JWT token
2. Token stored in localStorage
3. Every request includes token in Authorization header
4. Supabase validates token
5. RLS policies check: does token.user_id match row.user_id?
6. If yes → allow, if no → block
```

## Environment Variables

### Frontend (React)

```env
# .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...  # Public key, safe for frontend
VITE_RAILWAY_API_URL=http://localhost:8000  # Or Railway URL after deploy
```

### Backend (Python on Railway)

```env
# Railway Environment Variables
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...  # SECRET key, backend only!
ALLOWED_ORIGINS=https://yourapp.vercel.app
```

## Database Schema

### Core Tables

**persons** - People enrolled in the system
- `id` (UUID) - Primary key
- `user_id` (UUID) - Who owns this person (FK to auth.users)
- `name`, `email`, `age`, `age_group`, `parent_name`, `parent_phone`, `allergies`
- `photo_paths` (TEXT[]) - Array of Supabase Storage URLs
- `created_at`

**groups** - Groups/patrols/classes
- `id` (UUID)
- `user_id` (UUID) - Who owns this group
- `name`, `description`, `age`, `guides_info`, `notes`, `capacity`, `is_active`
- `created_at`

**group_members** - Junction table
- `group_id` (UUID) - FK to groups
- `person_id` (UUID) - FK to persons
- `joined_at`

**face_embeddings** - Face recognition data
- `id` (UUID)
- `person_id` (UUID) - FK to persons
- `embedding` (FLOAT8[]) - 512-dimensional vector from InsightFace
- `photo_url` (TEXT) - Reference to photo in storage
- `quality_score` (FLOAT) - Quality metrics (0-1)
- `created_at`

**enrollment_links** - Shareable signup links
- `id` (UUID)
- `link_code` (TEXT UNIQUE) - Short code like "abc123"
- `user_id` (UUID) - Who created this link
- `group_id` (UUID) - Optional group to add people to
- `expires_at`, `used_count`, `max_uses`
- `created_at`

## Deployment Architecture

### Local Development

```
Frontend: http://localhost:3000
├─> Supabase: https://yourproject.supabase.co (online)
└─> Backend: http://localhost:8000 (local Python)
```

**How to run:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend && python main.py
```

### Production Deployment

```
Frontend: https://yourapp.vercel.app
├─> Supabase: https://yourproject.supabase.co (same as dev!)
└─> Backend: https://yourapp.up.railway.app
```

**How to deploy:**
1. Push code to GitHub
2. Vercel auto-deploys frontend (watches `test` branch)
3. Railway auto-deploys backend (watches `test` branch)

### Why This Architecture?

**Separation of Concerns:**
- Supabase = Data expert (PostgreSQL, fast queries, RLS security)
- Railway = AI expert (heavy compute for face recognition)
- Vercel = Frontend expert (fast CDN, edge network)

**Cost Optimization:**
- Supabase handles 90% of requests (free tier: 500MB DB)
- Railway only used for face recognition (free tier: $5 credit/month)
- Vercel completely free for personal use

**Scalability:**
- Each service can scale independently
- Face recognition load doesn't affect database
- Database load doesn't affect face recognition

**Security:**
- Sensitive data (passwords, personal info) never goes to Railway
- Face recognition backend only sees images
- RLS ensures data isolation between users

## Migration from Old Architecture

### Old (SQLite Local)

```
Frontend → Python Backend (FastAPI)
            ├─> SQLite Database (local file)
            ├─> Photo Files (backend/photos/)
            └─> InsightFace (face recognition)
```

### New (Supabase + Railway)

```
Frontend ──┬─> Supabase (data + photos)
           └─> Railway (face recognition only)
```

**What Changed:**
- ✅ SQLite → PostgreSQL (better for internet)
- ✅ Local files → Supabase Storage (accessible anywhere)
- ✅ Single backend → Split backend (data vs AI)
- ✅ No auth → Supabase Auth (multi-user support)
- ✅ Shared data → User-isolated data (RLS)

**What Stayed the Same:**
- ✅ InsightFace models (same face recognition)
- ✅ Frontend UI (same React components)
- ✅ Face recognition accuracy (same algorithms)
- ✅ Offline development (still works on localhost)

## Next Steps

1. **Setup Supabase** → Run `supabase-schema.sql` in SQL Editor
2. **Configure Environment** → Create `.env.local` with Supabase keys
3. **Test Locally** → Run frontend + backend, add a person, test recognition
4. **Deploy Backend** → Push to Railway
5. **Deploy Frontend** → Push to Vercel
6. **Test Production** → Sign up, add people, test recognition online!

See `SUPABASE_SETUP.md` for detailed setup instructions.


