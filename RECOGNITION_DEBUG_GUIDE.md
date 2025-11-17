# Recognition Not Working - Debug Guide

## Quick Diagnosis

### Step 1: Check if Backend is Running

Open a new terminal and run:
```bash
cd backend
lsof -i :8000
```

**Expected:** Should show `python` process  
**If empty:** Backend is not running

---

### Step 2: Check Local Database for Embeddings

```bash
cd backend
sqlite3 faces.db "SELECT COUNT(*) FROM embeddings;"
```

**Expected:** Should show `4` (or more)  
**If 0:** Embeddings not saved to local cache  
**If error:** Database not initialized

---

### Step 3: Check Which Person IDs Have Embeddings

```bash
cd backend
sqlite3 faces.db "SELECT person_id, COUNT(*) as count FROM embeddings GROUP BY person_id;"
```

**Expected:** Should show your person's ID with count of 4  
**Example:** `ed400785-410a-406a-b031-e04cceefa057|4`

---

### Step 4: Check Backend Logs

```bash
cd backend
tail -100 backend.log
```

**Look for:**
- ✅ `Direct enrollment complete: Omri 16.11 test 3`
- ✅ `Saved 4 embeddings to local cache`
- ❌ Any errors during enrollment
- ❌ `table embeddings has no column named user_id`

---

### Step 5: Check Supabase Embeddings

1. Go to Supabase Dashboard
2. Click **Table Editor** → **face_embeddings**
3. Look for rows with `person_id = ed400785-410a-406a-b031-e04cceefa057`

**Expected:** 4 rows  
**If 0:** Embeddings not saved to Supabase

---

## Common Issues & Fixes

### Issue 1: No Embeddings in Local Cache

**Symptom:** `SELECT COUNT(*) FROM embeddings;` returns `0`

**Causes:**
1. Person was added but backend failed to save locally
2. Wrong database file (different branch)
3. Backend crashed during enrollment

**Fix:**
1. Check backend logs for errors
2. Re-add the person through the app
3. Make sure you're on the correct branch (`test-online`)

---

### Issue 2: Backend Not Running

**Symptom:** Frontend shows "Backend not responding"

**Fix:**
```bash
cd backend
source venv/bin/activate
python main.py
```

---

### Issue 3: Wrong Database File

**Symptom:** Embeddings exist but recognition doesn't work

**Cause:** Using `faces.db` from different branch

**Fix:**
```bash
cd backend
ls -la faces*.db
# Should see:
# faces.db (current)
# faces_original.db (backup)
# faces_testonline.db (test-online branch)

# If on test-online branch, use:
./switch-database.sh
```

---

### Issue 4: Person ID Mismatch

**Symptom:** Embeddings exist but for different person_id

**Check:**
1. In frontend console, look for: `Person ID: ed400785...`
2. In backend, check: `sqlite3 faces.db "SELECT person_id FROM embeddings;"`
3. They should match!

**Fix:** Delete and re-add the person

---

## Testing Recognition

### Manual Test:

1. **Open browser console** (F12)
2. **Go to camera screen** (start attendance)
3. **Look at your face**
4. **Check console for:**
   - `Recognizing faces...`
   - `Found X faces`
   - `Recognized: [person_id]`

### Backend Test:

Check backend terminal for:
```
POST /recognize
Loading embeddings...
Loaded 4 embeddings for 1 person
Recognized person: ed400785...
```

---

## Most Likely Cause

Based on your situation:

✅ **You have 4 embeddings in Supabase** (you confirmed this)  
❓ **Are they in local cache?**

**The backend loads embeddings from LOCAL SQLite, not Supabase!**

This is the architecture:
```
Recognition Flow:
1. Frontend sends photo to backend
2. Backend loads embeddings from LOCAL faces.db
3. Backend compares photo to cached embeddings
4. Backend returns match
```

**Supabase is only for:**
- Backup/sync
- Sharing between devices
- Persistence

**Local cache is for:**
- Fast recognition (no network delay)
- Offline capability

---

## Quick Fix (Try This First)

### Option 1: Re-add the Person

1. Delete "Omri 16.11 test 3" from People panel
2. Click "Add Person" again
3. Take 4 new photos
4. Submit

**This will:**
- Generate new embeddings
- Save to Supabase ✅
- Save to local cache ✅

---

### Option 2: Sync from Supabase (Manual)

If you want to keep the existing person, we need to download embeddings from Supabase to local cache.

**I can create a sync script for you** that:
1. Fetches all embeddings from Supabase
2. Saves them to local `faces.db`
3. Enables recognition

Would you like me to create this script?

---

## Expected Console Output (When Working)

### Frontend Console:
```
🚀 FacePace - Face Recognition Attendance System
👤 Signed in as: your@email.com
🆔 User ID: eb2d384f-a002-4b52-901f-7792d04fde4f
✅ InsightFace backend ready!
✅ Loaded 1 people from Supabase
✅ Loaded 0 groups from Supabase

[Start attendance]
📸 Recognizing faces...
✅ Found 1 face
✅ Recognized: Omri 16.11 test 3
```

### Backend Terminal:
```
POST /recognize
Loading embeddings for recognition...
Loaded 4 embeddings from local cache
Found 1 face in image
Comparing to 1 person (4 embeddings)
✅ Match found: ed400785-410a-406a-b031-e04cceefa057 (similarity: 0.85)
```

---

## Next Steps

1. **Run Step 2** from above to check if embeddings are in local cache
2. **If 0:** Re-add the person (Option 1)
3. **If > 0:** Check backend logs for recognition errors
4. **If still stuck:** Let me know the output of Step 2 and I'll help further

---

## Need the Sync Script?

If you want to download embeddings from Supabase to local cache without re-adding the person, say "create sync script" and I'll make it for you.

