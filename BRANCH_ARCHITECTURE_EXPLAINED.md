# Branch Architecture Explained 🌳

## Your Current Setup:

```
✅ Frontend Branch: test-online
✅ Backend: Same code (backend doesn't have branches, it's shared)
✅ Local Database: backend/faces.db (STILL EXISTS!)
```

---

## 🌳 How Branches Affect Everything:

### Branch: `main` (Your Original)
```
Frontend Code:
  └─ Loads data from BACKEND only (localhost:8000)
  
Backend (backend/):
  └─ Uses LOCAL database: faces.db
  └─ Has your original people: Yuval, Gaya, etc.

Data Source: LOCAL ONLY 💽
  └─ backend/faces.db
```

**When on `main`:**
- ✅ You see Yuval, Gaya, and all your original people
- ✅ Everything stored locally
- ✅ Works offline
- ❌ No Supabase (cloud)

---

### Branch: `test-video-upload` (Video Features)
```
Frontend Code:
  └─ Loads data from BACKEND only (localhost:8000)
  └─ + Video upload features
  
Backend (backend/):
  └─ Uses LOCAL database: faces.db
  └─ Has your original people: Yuval, Gaya, etc.

Data Source: LOCAL ONLY 💽
  └─ backend/faces.db
```

**When on `test-video-upload`:**
- ✅ You see Yuval, Gaya, and all your original people
- ✅ Everything stored locally
- ✅ Works offline
- ✅ Can upload videos
- ❌ No Supabase (cloud)

---

### Branch: `test-online` (Current - Cloud Integration)
```
Frontend Code:
  └─ Loads data from SUPABASE (cloud) ☁️
  └─ Uses backend for face recognition only
  
Backend (backend/):
  └─ Uses LOCAL database: faces.db (for caching)
  └─ Uses SUPABASE (cloud) for permanent storage

Data Source: SUPABASE + LOCAL CACHE ☁️💽
  └─ Primary: Supabase (cloud)
  └─ Cache: backend/faces.db
```

**When on `test-online`:**
- ✅ You see people from SUPABASE (cloud)
- ✅ Can access from any device
- ✅ Data persists after refresh
- ⚠️  You DON'T see Yuval, Gaya (they're in local DB, not Supabase)
- ✅ Works online + offline (with cache)

---

## 🔄 What Happens When You Switch Branches:

### Switching FROM `test-online` TO `main`:

```bash
# 1. Git switches the code
git checkout main

# 2. Frontend code changes:
   - Loads from backend only (not Supabase)
   - No cloud integration

# 3. Backend code is THE SAME
   - Still uses faces.db

# 4. Frontend refreshes:
   - Loads people from backend
   - Backend reads from faces.db
   - ✅ You see Yuval, Gaya again!
```

**Result:** You'll see your original local data! ✅

---

### Switching FROM `main` TO `test-online`:

```bash
# 1. Git switches the code
git checkout test-online

# 2. Frontend code changes:
   - Loads from Supabase (cloud)
   - Has login system

# 3. Backend code is THE SAME
   - Still uses faces.db

# 4. Frontend refreshes:
   - Loads people from Supabase
   - ⚠️  You DON'T see Yuval, Gaya
   - ✅ You see people you added in test-online
```

**Result:** You'll see cloud data (different from local)! ☁️

---

## 🗂️ The Database File:

**Location:** `backend/faces.db`

**Important:** This file is **SHARED across all branches!**

When you switch branches:
- ❌ Git does NOT change faces.db
- ✅ faces.db stays exactly the same
- ✅ Your data (Yuval, Gaya, etc.) is SAFE

**But** different branches **read** from it differently:
- `main`: Frontend → Backend → faces.db ✅
- `test-online`: Frontend → Supabase (primary), faces.db (cache)

---

## 📊 Current Data Status:

### Local Database (`faces.db`):
```
People: 1
  - omri 16.11 (test person from test-online)

Expected on main branch:
  - Yuval
  - Gaya
  - [other people you added before]
```

**Wait, where are Yuval and Gaya?** 🤔

They might be in a different database file, or they might have been cleared.

Let me check for other database files:

---

## 🔍 Let me check if there are other database files:


