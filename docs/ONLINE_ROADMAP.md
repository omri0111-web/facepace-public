# Web → Server → iOS Rollout Plan

This document describes how we will move FacePace from the current
local-development setup to an online web version and finally to a
native offline-first iOS app with on-device recognition.

## Phase 1 – Stabilize & Document (Web + Local Backend)

- Confirm existing behavior (only fix if broken, no redesigns):
  - Offline sync for **people + groups** using LocalStorage + Supabase.
  - Pending Inbox is full-page, supports bulk select / “Accept selected”,
    and updates people/groups after acceptance.
  - Face recognition pipeline works end-to-end on the **local Python backend**
    (InsightFace) via `/process_pending_enrollment` and `/sync_group_embeddings`.
- Make engine changes easy and isolated:
  - Keep all recognition logic behind a small backend interface
    (e.g. `embedFace`, `matchFace`), so changing the model later mostly
    touches one module, **not** the rest of the backend, and **never** the
    frontend.
  - Optionally tag embeddings with `model_id` in `face_embeddings` so
    multiple engines can coexist.
- Document the current architecture in `README_DEPLOYMENT.md`:
  - Supabase as the source of truth (persons, groups, pending_enrollments,
    face_embeddings, photos).
  - Public enrollment flow (`PublicEnrollmentPage`).
  - Admin app (People/Groups/Records/Admin, Offline sync, Inbox).
  - Engine location today: local FastAPI backend with InsightFace used
    for research/testing only.
  - Final goal: **iOS app with on-device engine and offline option**,
    Supabase as shared database.

## Phase 2 – Put Only Public Enrollment Online

- Deploy the React frontend to **Vercel**, but initially only *share* the
  `/enroll/{userId}/{groupId}` links.
- Configure Vercel env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Update Supabase auth redirect / site URLs to allow the Vercel domain.
- Keep backend + admin app local:
  - Parents/scouts enroll on phones via the Vercel URL.
  - `pending_enrollments` and photos appear in Supabase.
  - From a laptop, run the app + backend locally, open Inbox, accept
    enrollments, and let the local backend create persons + embeddings.

## Phase 3 – Move Full Web App + Backend to Servers

- Frontend: move the full React app (welcome, People, Groups, Records,
  Admin, Inbox, camera) to **Vercel**.
- Backend: deploy FastAPI + InsightFace (with its SQLite cache) to
  **Railway**:
  - SQLite remains a backend cache for embeddings/groups.
  - Supabase stays the main database and storage.
- LocalStorage on the frontend continues as a per-device offline cache
  (similar to the future iOS local database).
- Expectation vs local engine:
  - Accuracy: same model → same accuracy.
  - Latency: adds network round-trip, so slower than local, especially
    on phones, but acceptable to test bigger groups and many guides.

## Phase 4 – Change the Recognition Model

- Keep the recognition interface abstract on the backend.
- If the vendor provides a **server SDK**, plug it into the Railway
  backend behind the same interface and tag new embeddings with a new
  `model_id`.
- If the vendor provides only a **mobile SDK**, plan to test it directly
  on iOS (Phase 5) but keep the same schema and flows.
- Decide how to handle old embeddings (keep for reference or gradually
  replace with new-model embeddings).

## Phase 5 – Native iOS App with On‑Device Engine (Final Product)

- Build an iOS app that:
  - Maintains a local encrypted store of people, groups, and embeddings.
  - Uses a mobile face SDK **on-device** for recognition (offline-first).
  - Syncs changes with Supabase when online.
- Reuse the Supabase schema where possible.
- Use the same conceptual API (`embedFace`, `matchFace`) inside the iOS
  app, now implemented with the mobile SDK.
- Eventually retire or minimize the server-side engine; Supabase becomes
  primarily the shared database and storage, plus optional admin tools
  and public enrollment pages.


