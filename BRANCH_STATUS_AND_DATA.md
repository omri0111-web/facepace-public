# Branch Status and Data Explanation 🌳

## ✅ Current Status:

```
Branch: test-online
Backend: Running (localhost:8000)
Frontend: Running (localhost:3000)
Database: backend/faces.db + Supabase (cloud)
```

---

## 🔍 Investigation Results:

I checked your database on BOTH branches:

### On `test-online` branch:
```sql
People in faces.db: 1
  - omri 16.11 (test person)
```

### On `main` branch:
```sql
People in faces.db: 1
  - omri 16.11 (same)
```

**Finding:** The `faces.db` file is THE SAME on both branches (as expected - Git doesn't version control `.db` files by default)

---

## ❓ Where is Yuval, Gaya, and Your Original Data?

There are a few possibilities:

### 1. **Data Was Cleared** (Most Likely)
The database might have been reset at some point during development/testing.

### 2. **Data Is in Supabase** (For test-online only)
Your new cloud-based data is in Supabase, not the local database.

### 3. **Different Computer/Setup**
The original data might be on a different machine or in a backup.

---

## 🌳 How Branches Affect Data Loading:

### Branch: `main` or `test-video-upload`
```
App Startup:
  1. Frontend loads
  2. Frontend calls: http://localhost:8000/persons
  3. Backend reads: faces.db
  4. Backend returns: List of people
  5. Frontend displays: People from faces.db

Data Source: LOCAL (faces.db) ONLY 💽
```

**What you see:** Whatever is in `faces.db` (currently just "omri 16.11")

---

### Branch: `test-online`
```
App Startup:
  1. Frontend loads
  2. User logs in (Supabase Auth)
  3. Frontend calls: Supabase API
  4. Supabase returns: People for this user
  5. Frontend displays: People from Supabase

Data Source: SUPABASE (cloud) PRIMARY ☁️
             faces.db (cache for offline) 💽
```

**What you see:** Whatever is in Supabase for your user account

---

## 📊 Your Data Locations:

### Local Database (`faces.db`):
- ✅ Location: `backend/faces.db`
- ✅ Same file across ALL branches
- ✅ Currently has: "omri 16.11"
- ⚠️  Does NOT have: Yuval, Gaya, etc. (they're gone or were never here)

### Supabase Cloud Database:
- ✅ Only accessible on `test-online` branch
- ✅ Currently has: "omri 16.11 test 3", "omri 16.11 test 4"
- ✅ Separate from local database
- ✅ Persists across devices
- ⚠️  Does NOT have: Yuval, Gaya (you'd need to re-add them)

---

## 🔄 What Happens When You Switch Branches:

### Scenario 1: Switch to `main` or `test-video-upload`

```bash
git checkout main
npm run dev
```

**Result:**
- ✅ App loads normally
- ✅ Backend serves data from `faces.db`
- ✅ You see: "omri 16.11" (the one person in local DB)
- ❌ You DON'T see: Yuval, Gaya (they're not in the database)
- ❌ You DON'T see: Supabase data (no cloud integration)
- ✅ Works offline
- ❌ No login required

---

### Scenario 2: Stay on `test-online`

```bash
git checkout test-online
npm run dev
```

**Result:**
- ✅ App loads with login screen
- ✅ After login, loads data from Supabase
- ✅ You see: "omri 16.11 test 3", "omri 16.11 test 4" (from cloud)
- ❌ You DON'T see: "omri 16.11" from local DB (different data source)
- ✅ Works online + offline (with cache)
- ✅ Login required
- ✅ Data persists across devices

---

## 💡 Important Concepts:

### 1. **Git Does NOT Version Control Databases**
```
.gitignore contains:
  *.db
  backend/faces.db
```

This means:
- ✅ Switching branches does NOT change `faces.db`
- ✅ Same database file across all branches
- ✅ Your database is safe from Git operations
- ⚠️  But also means database changes aren't tracked

---

### 2. **Two Separate Data Systems**

#### System A: Local (main, test-video-upload)
```
Frontend → Backend (localhost:8000) → faces.db
```
- All data in one file
- No cloud
- Works offline
- No login

#### System B: Cloud (test-online)
```
Frontend → Supabase (cloud) ☁️
         → Backend (only for face recognition)
```
- Data in cloud database
- Backup/cache in local DB
- Works online + offline
- Requires login
- Multi-device

---

## 🎯 What This Means for You:

### If You Want to See Yuval, Gaya, etc.:

**Option 1: Re-add them in `test-online`**
- Stay on `test-online` branch
- Add Yuval, Gaya through the UI
- They'll save to Supabase (cloud)
- You can access from any device

**Option 2: Add them in `main` branch**
- Switch to `main`
- Add Yuval, Gaya through the UI
- They'll save to `faces.db` (local)
- Only accessible on this computer

**Option 3: Restore from backup (if you have one)**
- If you have a backup of the old `faces.db`, restore it

---

## 🔒 Data Safety:

### Your Data is Safe:
- ✅ `faces.db` exists and has not been corrupted
- ✅ Supabase data is backed up in the cloud
- ✅ You can add people in either system

### Clarification:
- The data (Yuval, Gaya) is not lost due to branches
- It's either:
  - Never was in this database file
  - Was cleared during testing
  - Is on a different machine/backup

---

## 📝 Summary:

**Current Branch:** `test-online` ✅  
**Data Source:** Supabase (cloud) ☁️  
**Local Database:** Still exists, has "omri 16.11"  
**Switching Branches:** Safe, data persists  

**When you switch to `main`:**
- App loads people from `faces.db`
- Currently only has "omri 16.11"
- No Yuval, Gaya (need to re-add or restore from backup)

**When you stay on `test-online`:**
- App loads people from Supabase
- Has your test data
- Need to re-add Yuval, Gaya if you want them in cloud

---

## 🚀 Recommendation:

**For testing the cloud system (test-online):**
1. Stay on `test-online` branch
2. Add a few people (including Yuval, Gaya if you want)
3. Test all features with cloud integration
4. Everything saves to Supabase

**For using the local system (main):**
1. Switch to `main` branch
2. Data comes from `faces.db`
3. Add people as needed
4. Everything stays local

---

**Both systems work independently. You can have different data in each!** 🎯

