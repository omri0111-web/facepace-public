# Complete System Architecture & Implementation Plan

## 🎯 Mission
Create a hybrid online/offline attendance app where:
- Users can add people directly OR via public enrollment links
- Backend only does face recognition (local, fast)
- Supabase stores all data (cloud, source of truth)
- Works offline after syncing
- Each user has their own isolated database

---

## 📊 System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE (CLOUD)                        │
│  - Authentication (users)                                   │
│  - Database (PostgreSQL)                                    │
│  - Storage (photos)                                         │
│  - NO face recognition                                      │
└─────────────────────────────────────────────────────────────┘
                            ↕️
┌─────────────────────────────────────────────────────────────┐
│                   LOCAL (Computer/iPhone)                   │
│  ┌───────────────────┐    ┌───────────────────────────┐   │
│  │   FRONTEND        │    │   BACKEND                 │   │
│  │   React Web App   │←──→│   Python + InsightFace    │   │
│  │                   │    │   Local SQLite Cache      │   │
│  └───────────────────┘    └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Supabase Tables

#### 1. `persons` (Enrolled people)
```sql
- id: UUID (primary key)
- user_id: UUID (owner)
- name: TEXT
- email: TEXT
- age: INTEGER
- age_group: TEXT
- parent_name: TEXT
- parent_phone: TEXT
- allergies: TEXT[]
- photo_paths: TEXT[] (URLs in Supabase Storage)
- created_at: TIMESTAMP
```

#### 2. `pending_enrollments` (Awaiting review) **NEW**
```sql
- id: UUID (primary key)
- enrollment_link_id: UUID (which link was used)
- user_id: UUID (owner of the link)
- name: TEXT
- email: TEXT
- age: INTEGER
- age_group: TEXT
- parent_name: TEXT
- parent_phone: TEXT
- allergies: TEXT[]
- photo_urls: TEXT[] (pending photos)
- status: TEXT ('pending', 'accepted', 'rejected')
- created_at: TIMESTAMP
```

#### 3. `face_embeddings` (Face recognition data)
```sql
- id: UUID
- person_id: UUID (references persons)
- embedding: FLOAT8[] (512-dimensional array)
- photo_url: TEXT
- quality_score: FLOAT
- created_at: TIMESTAMP
```

#### 4. `groups`
```sql
- id: UUID
- user_id: UUID
- name: TEXT
- description: TEXT
- guides_info: JSONB
- notes: TEXT
- capacity: INTEGER
- is_active: BOOLEAN
- created_at: TIMESTAMP
```

#### 5. `group_members` (junction table)
```sql
- group_id: UUID
- person_id: UUID
- joined_at: TIMESTAMP
```

#### 6. `enrollment_links`
```sql
- id: UUID
- link_code: TEXT (e.g., "abc123")
- user_id: UUID
- group_id: UUID (optional)
- expires_at: TIMESTAMP
- used_count: INTEGER
- max_uses: INTEGER
- created_at: TIMESTAMP
```

### Local Backend SQLite Cache
```sql
- persons (copy of user's people)
- face_embeddings (copy of user's embeddings)
- sync_metadata (last sync timestamps)
```

---

## 📁 Storage Structure

### Supabase Storage Bucket: `face-photos`

```
face-photos/
├── pending/                          ← Temporary (public upload)
│   └── {pending_id}/
│       ├── photo_1.jpg
│       ├── photo_2.jpg
│       ├── photo_3.jpg
│       └── photo_4.jpg
│
└── {user_id}/                        ← Final location (private)
    └── {person_id}/
        ├── photo_1.jpg
        ├── photo_2.jpg
        ├── photo_3.jpg
        └── photo_4.jpg
```

---

## 🔄 Complete Workflows

### Workflow 1: Direct Add Person (In-App)

**User Experience:**
1. User clicks "Add Person" button in app
2. Fills form (name, email, age, grade, parent info, allergies)
3. Captures 4 photos (with quality checks)
4. Clicks "Enroll"

**Technical Flow:**
```
Frontend (AddPersonModal.tsx)
├─ 1. Capture 4 photos with quality checks
├─ 2. Upload photos to Supabase Storage: {user_id}/{person_id}/
├─ 3. Send photos to Local Backend
│     └─ Backend generates embeddings (InsightFace)
├─ 4. Create person in Supabase `persons` table
├─ 5. Save embeddings to Supabase `face_embeddings` table
└─ 6. Save to local backend cache (SQLite)
```

**Result:** Person immediately ready for recognition

---

### Workflow 2: Public Enrollment Link (External)

#### Phase A: User Creates Link

**User Experience:**
1. User clicks "Generate Enrollment Link"
2. Optional: Select group to add enrollees to
3. Gets shareable URL: `app.com/enroll/abc123`

**Technical Flow:**
```
Frontend (EnrollmentLinks.tsx)
├─ 1. Generate random link_code
├─ 2. Create record in Supabase `enrollment_links` table
│     └─ link_code: "abc123"
│     └─ user_id: current user
│     └─ group_id: optional
│     └─ expires_at: optional
└─ 3. Show shareable URL to user
```

#### Phase B: Person Uses Link (Public)

**User Experience:**
1. Person opens link in browser (no login needed)
2. Sees form with ALL fields:
   - Full Name (required)
   - Email (optional)
   - Grade
   - Age
   - Parent Name
   - Parent Phone
   - Allergies
3. Captures 4 photos (with FRONTEND quality checks)
4. Submits form

**Technical Flow:**
```
Frontend (PublicEnrollmentPage.tsx)
├─ 1. Load enrollment link details (Supabase)
├─ 2. Person fills form
├─ 3. Capture 4 photos
│     └─ Use frontendQualityChecks.ts (NO backend)
│     └─ Check: blur, brightness, face size
│     └─ Must pass quality to be "Accepted Photo"
├─ 4. Upload 4 photos to Supabase Storage:
│     └─ pending/{pending_id}/photo_1.jpg
│     └─ pending/{pending_id}/photo_2.jpg
│     └─ pending/{pending_id}/photo_3.jpg
│     └─ pending/{pending_id}/photo_4.jpg
├─ 5. Create record in `pending_enrollments` table:
│     └─ user_id: link owner
│     └─ name, email, age, etc.
│     └─ photo_urls: [pending photos]
│     └─ status: 'pending'
└─ 6. Show success: "Submitted for review!"
```

**Result:** Entry in "Pending Inbox", waiting for user approval

#### Phase C: User Reviews & Accepts

**User Experience:**
1. User opens app, sees "Pending Inbox" badge (3 new)
2. Opens Pending Inbox
3. Sees list of pending enrollments with:
   - Name and details
   - 4 photos
4. Clicks "Accept" or "Reject"

**Technical Flow (Accept):**
```
Frontend (PendingInbox.tsx)
├─ 1. User clicks "Accept"
├─ 2. Call Backend: /process_pending_enrollment
│     └─ pending_id: UUID
│
Backend (main.py)
├─ 3. Get pending enrollment from Supabase
├─ 4. Download 4 photos from: pending/{pending_id}/
├─ 5. Generate embeddings using InsightFace
│     └─ 4 embeddings (one per photo)
├─ 6. Upload photos to final location:
│     └─ {user_id}/{person_id}/photo_1.jpg
│     └─ {user_id}/{person_id}/photo_2.jpg
│     └─ {user_id}/{person_id}/photo_3.jpg
│     └─ {user_id}/{person_id}/photo_4.jpg
├─ 7. Create person in Supabase `persons` table
├─ 8. Save 4 embeddings to Supabase `face_embeddings` table
├─ 9. Save to local SQLite cache
├─ 10. Update pending status: 'pending' → 'accepted'
├─ 11. Delete old photos from: pending/{pending_id}/
└─ 12. Return success to Frontend

Frontend
└─ 13. Remove from pending list
    └─ Show success message
```

**Result:** Person now in `persons` table, ready for recognition

---

### Workflow 3: Attendance Recognition

**User Experience:**
1. User opens group
2. Clicks "Start Attendance"
3. (If needed) System syncs group data
4. Camera starts, faces recognized in real-time
5. Recognized people marked as "Present"

**Technical Flow:**
```
Frontend (GroupsPanel.tsx)
├─ 1. User clicks "Start Attendance"
├─ 2. Check if group data synced
│     └─ If not: Call Backend /sync_group_embeddings
│
Backend (/sync_group_embeddings)
├─ 3. Get group members from Supabase
├─ 4. Download their embeddings from Supabase
├─ 5. Store in local SQLite cache
└─ 6. Return success

Frontend (RealFaceCameraView.tsx)
├─ 7. Capture camera frame
├─ 8. Send frame to Backend /recognize
│
Backend (/recognize)
├─ 9. Extract face embedding from frame
├─ 10. Compare to local cache embeddings
│     └─ Find best match (cosine similarity)
├─ 11. Return person_id + name
│
Frontend
└─ 12. Mark person as "Present"
    └─ Update attendance UI
```

---

## 🔐 Security & Row Level Security (RLS)

### Principles:
- Each user sees ONLY their own data
- Public can create pending enrollments (validated by link)
- Public can upload to `pending/` folder
- Backend uses service_role key (bypass RLS)

### Key Policies:

**persons table:**
```sql
SELECT: WHERE auth.uid() = user_id
INSERT: WHERE auth.uid() = user_id
UPDATE: WHERE auth.uid() = user_id
DELETE: WHERE auth.uid() = user_id
```

**pending_enrollments table:**
```sql
SELECT: WHERE auth.uid() = user_id
INSERT: true (public can insert)
UPDATE: WHERE auth.uid() = user_id
DELETE: WHERE auth.uid() = user_id
```

**Storage `face-photos` bucket:**
```sql
INSERT: (user_id folder) OR (pending/ folder - public)
SELECT: (user_id folder) OR (pending/ folder - authenticated)
DELETE: (user_id folder) OR (pending/ folder - service_role)
```

---

## 📝 Component Responsibilities

### Frontend Components

#### `App.tsx`
- Authentication check
- Route to LoginPage or main app
- Route `/enroll/{code}` to PublicEnrollmentPage

#### `LoginPage.tsx`
- Email/password login
- Sign up
- Uses Supabase Auth

#### `AddPersonModal.tsx` (Direct Add)
- Form for person details
- Camera for 4 photos
- Quality checks via backend
- Upload to Supabase Storage: `{user_id}/{person_id}/`
- Save to Supabase database
- Save embeddings to Supabase

#### `PublicEnrollmentPage.tsx` (Public Enrollment)
- Accessible without login
- Same form as AddPersonModal
- Frontend quality checks (frontendQualityChecks.ts)
- Upload to Supabase Storage: `pending/{pending_id}/`
- Save to `pending_enrollments` table
- No face recognition here

#### `PendingInbox.tsx` **NEW**
- List all pending enrollments
- Show person details + 4 photos
- "Accept" button → calls backend
- "Reject" button → updates status

#### `GroupsPanel.tsx`
- List groups
- "Start Attendance" button
- Trigger sync if needed

#### `RealFaceCameraView.tsx`
- Camera view
- Send frames to backend
- Display recognition results

### Frontend Services

#### `SupabaseDataService.ts`
- All Supabase operations
- CRUD for persons, groups, embeddings, pending_enrollments
- Photo upload/download
- Uses anon key (respects RLS)

#### `BackendRecognitionService.ts`
- HTTP client for local backend
- `/recognize` - recognize faces
- `/embedding` - get embeddings (for direct add)
- `/process_pending_enrollment` - process pending (for inbox)
- `/sync_group_embeddings` - sync group data

#### `frontendQualityChecks.ts` **NEW**
- Blur detection (Laplacian variance)
- Brightness check (pixel analysis)
- Face size check (browser FaceDetector API or manual)
- No backend needed

#### `SyncService.ts` **NEW**
- Auto-save to Supabase after edits
- Queue changes when offline
- Sync status indicator
- Process queue when back online

### Backend Endpoints (Python FastAPI)

#### `POST /recognize`
```python
Input: { user_id, group_id, frame (base64 image) }
Process:
  1. Extract face embedding from frame
  2. Load embeddings from local cache (for this user/group)
  3. Compare with cosine similarity
  4. Find best match
Output: { person_id, name, confidence }
```

#### `POST /embedding`
```python
Input: { image (base64) }
Process:
  1. Detect face in image
  2. Generate embedding
Output: { embedding: [512 floats] }
```

#### `POST /process_pending_enrollment` **NEW**
```python
Input: { pending_id }
Process:
  1. Get pending enrollment from Supabase (using service_role key)
  2. Download photos from: pending/{pending_id}/
  3. Generate 4 embeddings using InsightFace
  4. Upload photos to: {user_id}/{person_id}/
  5. Create person in Supabase
  6. Save embeddings to Supabase
  7. Save to local cache
  8. Update pending status: 'accepted'
  9. Delete old photos from pending/
Output: { success: true, person_id }
```

#### `POST /sync_group_embeddings` **NEW**
```python
Input: { user_id, group_id }
Process:
  1. Get group members from Supabase
  2. Get their embeddings from Supabase
  3. Store in local SQLite cache
  4. Update sync_metadata timestamp
Output: { success: true, count: 15 }
```

---

## 🔄 Data Sync Strategy

### Principle: Supabase = Source of Truth

**When to Sync:**
1. Opening a group for attendance
2. Accepting a pending enrollment (auto)
3. Manual "Sync" button (optional)
4. App startup (optional, just metadata)

**Sync Flow:**
```
Frontend:           Backend:              Supabase:
   │                    │                     │
   │  sync_group(id)    │                     │
   ├───────────────────>│                     │
   │                    │  Get group members  │
   │                    ├────────────────────>│
   │                    │  Get embeddings     │
   │                    │<────────────────────┤
   │                    │                     │
   │                    │  Save to SQLite     │
   │                    │  (local cache)      │
   │                    │                     │
   │    success         │                     │
   │<───────────────────┤                     │
```

**Offline Handling:**
- Recognition works from local cache (no internet needed)
- Edits queue in frontend
- Show "Waiting for internet" indicator
- Auto-sync when back online

---

## 📋 Implementation Checklist

### Phase 1: Backend Setup ✅
- [x] Fix Python/numpy ARM64 issue
- [x] Create virtual environment
- [x] Backend running on port 8000
- [x] `/embedding` endpoint working

### Phase 2: Database Schema ✅
- [x] Add `pending_enrollments` table
- [x] Add indexes
- [x] Add RLS policies
- [ ] USER: Run schema in Supabase SQL Editor

### Phase 3: Storage Policies
- [ ] USER: Add storage policies for `pending/` folder

### Phase 4: Backend - Supabase Integration
- [ ] Add Supabase client to backend (python-dotenv, supabase-py)
- [ ] Add `.env` file with SUPABASE_URL and SERVICE_ROLE_KEY
- [ ] Create `/process_pending_enrollment` endpoint
- [ ] Create `/sync_group_embeddings` endpoint
- [ ] Test with Postman/curl

### Phase 5: Frontend - Quality Checks
- [ ] Create `frontendQualityChecks.ts` utility
- [ ] Implement blur detection
- [ ] Implement brightness check
- [ ] Implement face size check
- [ ] Test with sample photos

### Phase 6: Frontend - Public Enrollment
- [ ] Update `PublicEnrollmentPage.tsx`
- [ ] Add all form fields (matching AddPersonModal)
- [ ] Use frontend quality checks
- [ ] Upload to `pending/{id}/` in Supabase Storage
- [ ] Save to `pending_enrollments` table
- [ ] Test end-to-end

### Phase 7: Frontend - Pending Inbox
- [ ] Create `PendingInbox.tsx` component
- [ ] List pending enrollments
- [ ] Show person details + photos
- [ ] "Accept" button → call backend
- [ ] "Reject" button → update status
- [ ] Integrate into main app

### Phase 8: Frontend - Sign In/Out UI
- [ ] Add user bar between title and buttons
- [ ] Display username
- [ ] Sign out button
- [ ] Test

### Phase 9: Frontend - Sync Service
- [ ] Create `SyncService.ts`
- [ ] Auto-save to Supabase
- [ ] Offline queue
- [ ] Sync status indicator
- [ ] Process queue when online

### Phase 10: Integration Testing
- [ ] Test direct add person (existing flow)
- [ ] Test enrollment link creation
- [ ] Test public enrollment submission
- [ ] Test pending inbox accept/reject
- [ ] Test attendance with synced data
- [ ] Test offline mode

### Phase 11: Deployment (Later)
- [ ] Deploy frontend to Vercel
- [ ] Keep backend local for now
- [ ] Test with real users

---

## 🎨 UI/UX Guidelines

### Public Enrollment Page
- **Must look identical to "Add Person" modal**
- Same fields, same order
- Same photo capture UI
- Same "Accepted Photos" indicator
- No login required
- Clear "Submit for Review" button
- Success message after submission

### Pending Inbox
- Badge on main nav showing count
- List view with:
  - Avatar (first photo)
  - Name + basic info
  - Thumbnail grid of 4 photos
  - "Accept" and "Reject" buttons
- Click to expand for full details
- Auto-refresh after accept/reject

### Sync Status
- Small indicator in header
- States:
  - ✓ All changes saved (green)
  - ⚠️ Waiting for internet (yellow)
  - 🔄 Syncing... (blue)
- Click to force sync

---

## 🚨 Critical Rules

1. **NEVER bypass RLS in frontend** - always use anon key
2. **Backend uses service_role key** - full permissions needed
3. **Always validate enrollment links** - check expiry, max uses
4. **Photos must pass quality checks** - frontend for public, backend for direct
5. **Delete pending photos after processing** - keep storage clean
6. **Supabase is source of truth** - always sync from cloud to local
7. **Each user isolated** - RLS policies enforce this
8. **Keep main branch safe** - all work on test-online

---

## 🔗 Important Files

```
Frontend:
  src/App.tsx
  src/components/LoginPage.tsx
  src/components/AddPersonModal.tsx
  src/components/PublicEnrollmentPage.tsx
  src/components/PendingInbox.tsx (NEW)
  src/services/SupabaseDataService.ts
  src/services/BackendRecognitionService.ts
  src/services/SyncService.ts (NEW)
  src/utils/frontendQualityChecks.ts (NEW)

Backend:
  backend/main.py
  backend/.env
  backend/requirements.txt

Database:
  supabase-schema.sql

Documentation:
  SUPABASE_SETUP.md
  SUPABASE_NEXT_STEPS.md
  SYSTEM_ARCHITECTURE_COMPLETE.md (this file)
```

---

## ✅ Definition of Done

A feature is complete when:
1. Code implemented and tested locally
2. No console errors
3. Works online AND offline (where applicable)
4. RLS policies tested (can't see other users' data)
5. User experience smooth (no confusing steps)
6. Backend logs show no errors
7. Supabase data structured correctly

---

**This is the complete reference! Everything we agreed on is here. Follow this and we won't miss anything!** 🎯

