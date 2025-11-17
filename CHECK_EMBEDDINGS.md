# Check Which Person Has Embeddings

## You said you have 80 embeddings, but recognition doesn't work.

**This means:** The 80 embeddings are probably from the **original database** (Yuval, Gaya, etc.), NOT your new test person.

---

## Run These Commands in YOUR Terminal:

### 1. Navigate to the WORKTREE backend folder:
```bash
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend"
```

### 2. Check which people have embeddings:
```bash
sqlite3 faces.db "SELECT person_id, COUNT(*) FROM embeddings GROUP BY person_id;"
```

**Look for:** `ed400785-410a-406a-b031-e04cceefa057` (your test person)

---

## Expected Results:

### ❌ If you DON'T see `ed400785-410a-406a-b031-e04cceefa057`:
**Problem:** Your test person's embeddings are NOT in the local cache  
**Cause:** You're using the wrong `faces.db` (from main branch)  
**Fix:** Run `./switch-database.sh` to switch to test-online database

### ✅ If you DO see `ed400785-410a-406a-b031-e04cceefa057`:
**Problem:** Embeddings exist but recognition still fails  
**Cause:** Different issue (threshold, backend not receiving requests, etc.)  
**Fix:** Check backend logs during recognition attempt

---

## Quick Fix: Use the Correct Database

Since you're on the `test-online` branch, you should use the test-online database:

```bash
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend"

# Switch to test-online database
./switch-database.sh

# Check embeddings count (should be 0 or only your test data)
sqlite3 faces.db "SELECT COUNT(*) FROM embeddings;"

# Check which people
sqlite3 faces.db "SELECT person_id, COUNT(*) FROM embeddings GROUP BY person_id;"
```

---

## Understanding the Issue

**You have 3 database files:**

1. **`faces_original.db`** - Original data from main branch (Yuval, Gaya, etc.) - ~80 embeddings
2. **`faces_testonline.db`** - Test data for test-online branch (should have your test person)
3. **`faces.db`** - The ACTIVE database (currently pointing to original)

**The problem:** `faces.db` is currently the original database, so it has 80 embeddings for Yuval, Gaya, etc., but NOT your test person.

**The solution:** Run `./switch-database.sh` to make `faces.db` point to the test-online data.

---

## After Switching Database

1. **Restart backend:**
```bash
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend"
lsof -ti:8000 | xargs kill -9 2>/dev/null
source venv/bin/activate
python main.py
```

2. **Re-add your test person** (if embeddings count is 0)
   - Open app
   - Go to People panel
   - Add "Test Person" with 4 photos

3. **Try recognition again**

---

## TL;DR - Just Run This:

```bash
# 1. Go to backend folder
cd "/Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend"

# 2. Check current embeddings
sqlite3 faces.db "SELECT person_id FROM embeddings LIMIT 5;"

# 3. If you see OLD person IDs (not ed400785...), switch database:
./switch-database.sh

# 4. Restart backend
lsof -ti:8000 | xargs kill -9 2>/dev/null
source venv/bin/activate
python main.py &

# 5. In the app, re-add your test person
```

---

**Please run step 2 and tell me what person IDs you see!**

