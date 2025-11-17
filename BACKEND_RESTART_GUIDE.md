# 🔄 Backend Restart Guide - IMPORTANT!

## 🚨 Problem
The backend is running **OLD CODE** that doesn't have the `/process_pending_enrollment` endpoint!

You're getting: `404 Not Found` when trying to accept enrollments.

---

## ✅ Solution: Restart Backend from CORRECT Directory

### **Step 1: Stop ALL Python Processes**

Open a **NEW terminal** and run:

```bash
pkill -9 python
```

Wait 2 seconds.

---

### **Step 2: Navigate to Backend Directory**

**IMPORTANT:** Make sure you're in the **WORKTREE directory**, not the main repo!

```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
```

**Verify you're in the right place:**
```bash
pwd
# Should output:
# /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
```

---

### **Step 3: Check Backend File**

Make sure the backend has the new endpoint:

```bash
grep -n "process_pending_enrollment" main.py | head -1
```

**Should see:**
```
1498:@app.post("/process_pending_enrollment")
```

**If you DON'T see this, you're in the WRONG directory!**

---

### **Step 4: Start Backend**

```bash
python main.py
```

**Wait for:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
✅ Supabase initialized successfully
```

**NO ERROR messages!**

---

### **Step 5: Verify Endpoint Exists**

Open **ANOTHER terminal** and test:

```bash
curl -X POST http://127.0.0.1:8000/process_pending_enrollment \
  -H "Content-Type: application/json" \
  -d '{"pending_id": "test"}'
```

**Should get:**
```json
{"detail":"Pending enrollment not found"}
```

**Good!** This means the endpoint EXISTS (404 would mean it doesn't exist).

**If you get 404, the backend is still running old code!**

---

## 🔍 Troubleshooting

### **Issue: Still getting 404**

**Possible causes:**

1. **Backend running from wrong directory**
   - You're in the main repo, not the worktree
   - Check with `pwd`

2. **Backend running from different branch**
   - The code might not have the new endpoint
   - Check git branch: `git branch`
   - Should be on `test-online`

3. **Backend file not saved**
   - The changes to `main.py` weren't saved
   - Check: `grep "process_pending_enrollment" main.py`

4. **Multiple backends running**
   - One old, one new
   - Kill ALL: `pkill -9 python`
   - Then start fresh

---

### **Issue: Address already in use**

```
ERROR: [Errno 48] error while attempting to bind on address ('0.0.0.0', 8000): address already in use
```

**Fix:**
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9

# Wait 2 seconds
sleep 2

# Try again
python main.py
```

---

### **Issue: Wrong directory**

If you see this path in your terminal:
```
/Users/omrishamai/Desktop/Attendance App Design (admin)new/backend
```

**That's the WRONG directory!** (That's the main repo, not the worktree)

**Go to the worktree:**
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
```

---

## ✅ Success Checklist

Backend is correctly running when:

- [ ] `pwd` shows: `.../worktrees/.../jTpGO/backend`
- [ ] `grep process_pending_enrollment main.py` finds the endpoint
- [ ] Backend starts without errors
- [ ] Shows: "✅ Supabase initialized successfully"
- [ ] `curl` test returns "Pending enrollment not found" (not 404)
- [ ] No other Python processes running: `ps aux | grep python`

---

## 🧪 Test After Restart

1. **Refresh frontend** (Cmd+Shift+R)

2. **Go to Inbox**

3. **Click "✓ Add" on an enrollment**

4. **Should see in backend console:**
   ```
   📥 Processing pending enrollment: Shlomi Test 3 (ID: xxx)
   📥 Group ID from pending enrollment: yyy-yyy-yyy
   ✅ Processed photo 1/4...
   ✅ Person created in Supabase...
   ✅ Added Shlomi Test 3 to group yyy-yyy-yyy
   ```

5. **Should see in frontend:**
   ```
   ✅ SUCCESS Added Shlomi Test 3 to group test 1
   ```

6. **Verify in Groups:**
   - Go to Groups → "test 1"
   - Person should be in members list!

---

## 📝 Quick Command Summary

```bash
# 1. Stop all Python
pkill -9 python

# 2. Go to WORKTREE backend
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend

# 3. Verify location
pwd

# 4. Check endpoint exists
grep "process_pending_enrollment" main.py

# 5. Start backend
python main.py

# 6. In another terminal, test endpoint
curl -X POST http://127.0.0.1:8000/process_pending_enrollment \
  -H "Content-Type: application/json" \
  -d '{"pending_id": "test"}'
```

---

**Follow these steps carefully - the most common issue is running from the wrong directory!** 🎯

