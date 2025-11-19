# 🔄 Switch Everything to test-online Branch

**Complete guide to switch backend, frontend, database, and branch to test-online**

---

## ✅ Quick Setup (One Command)

```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO
./verify-setup.sh
```

This script will:
1. ✅ Check/switch to test-online branch
2. ✅ Switch database to test-online version
3. ✅ Verify backend setup
4. ✅ Verify frontend setup
5. ✅ Check all dependencies

---

## 📋 Manual Setup Steps

### Step 1: Verify You're on test-online Branch

```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO

# Check current branch
git branch --show-current

# Should show: test-online
# If not, switch to it:
git checkout test-online
```

### Step 2: Switch Database

```bash
# Make sure script is executable
chmod +x switch-database.sh

# Run database switcher
./switch-database.sh
```

This will:
- ✅ Copy `faces_testonline.db` → `faces.db` (active database)
- ✅ Show database info (size, people count, groups count)

**Expected output:**
```
🔄 Database Switcher
Current branch: test-online
✅ Switched to test-online database (test data only)

Active database: backend/faces.db
Size: [size]
People: [count]
Groups: [count]
```

### Step 3: Verify Backend Setup

```bash
# Check backend .env file exists
ls -la backend/.env

# Should show the file (if not, create it)
# Contents should be:
# SUPABASE_URL=your_supabase_url
# SUPABASE_SERVICE_KEY=your_service_key
```

**If backend/.env doesn't exist:**
```bash
cd backend
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
EOF
```

### Step 4: Verify Frontend Setup

```bash
# Check frontend .env.local file exists
ls -la .env.local

# Should show the file (if not, create it)
# Contents should be:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

**If .env.local doesn't exist:**
```bash
cat > .env.local << EOF
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

### Step 5: Verify Backend Dependencies

```bash
cd backend

# Check if venv exists
ls -la venv

# If not, create it:
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install -r requirements.txt
```

### Step 6: Verify Frontend Dependencies

```bash
# Check if node_modules exists
ls -la node_modules

# If not, install:
npm install
```

### Step 7: Make Scripts Executable

```bash
chmod +x switch-database.sh
chmod +x verify-setup.sh
chmod +x backend/start.sh
chmod +x backend/stop.sh
chmod +x backend/restart.sh
```

---

## ✅ Verification Checklist

After setup, verify everything:

- [ ] ✅ On `test-online` branch
- [ ] ✅ Database switched to `faces_testonline.db`
- [ ] ✅ `backend/.env` exists with Supabase credentials
- [ ] ✅ `.env.local` exists with Supabase credentials
- [ ] ✅ Backend venv exists and dependencies installed
- [ ] ✅ Frontend node_modules exists
- [ ] ✅ All scripts are executable

---

## 🚀 Start Everything

### Start Backend:
```bash
cd backend
./start.sh
```

**Expected output:**
```
✅ Backend starting...
✅ InsightFace loading...
✅ Supabase initialized...
✅ Server running on http://0.0.0.0:8000
```

### Start Frontend (new terminal):
```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

### Open Browser:
```
http://localhost:3000
```

---

## 🔍 Troubleshooting

### "Branch doesn't exist"
```bash
# Create test-online branch from current
git checkout -b test-online

# Or switch to existing
git checkout test-online
```

### "Database not found"
```bash
# Create test-online database if it doesn't exist
cd backend
sqlite3 faces_testonline.db ".schema" > /dev/null 2>&1 || sqlite3 faces_testonline.db "CREATE TABLE IF NOT EXISTS persons (id TEXT PRIMARY KEY, name TEXT);"
./switch-database.sh
```

### "Backend .env missing"
```bash
cd backend
# Create .env file with your Supabase credentials
# Get credentials from Supabase dashboard
```

### "Frontend .env.local missing"
```bash
# Create .env.local file with your Supabase credentials
# Get credentials from Supabase dashboard
```

### "Backend won't start"
```bash
cd backend
./stop.sh        # Stop any running processes
source venv/bin/activate
pip install -r requirements.txt  # Reinstall dependencies
./start.sh
```

### "Frontend won't start"
```bash
rm -rf node_modules
npm install
npm run dev
```

---

## 📊 Current Setup Status

### Branch:
- **Current:** `test-online` ✅
- **Location:** Worktree folder (`jTpGO`)

### Database:
- **Active:** `backend/faces.db` → points to `faces_testonline.db`
- **Contains:** Test data only (separate from main branch)

### Backend:
- **Location:** `backend/`
- **Port:** `8000`
- **Database:** `backend/faces.db` (test-online version)
- **Config:** `backend/.env`

### Frontend:
- **Location:** Root directory
- **Port:** `3000`
- **Config:** `.env.local`

---

## 🎯 What's Different in test-online?

### Features:
- ✅ Supabase cloud database integration
- ✅ Authentication (sign in/out)
- ✅ Public enrollment links
- ✅ Pending inbox
- ✅ Offline mode
- ✅ Auto-sync
- ✅ Direct add person
- ✅ Video testing

### Data:
- ✅ Separate test database (`faces_testonline.db`)
- ✅ Test users and people (not your real data)
- ✅ Safe to experiment without affecting main branch

---

## 📝 Quick Reference

### Check Status:
```bash
./verify-setup.sh
```

### Switch Database:
```bash
./switch-database.sh
```

### Start Backend:
```bash
cd backend && ./start.sh
```

### Start Frontend:
```bash
npm run dev
```

### Check Branch:
```bash
git branch --show-current
```

### Check Database:
```bash
ls -lh backend/faces.db
sqlite3 backend/faces.db "SELECT COUNT(*) FROM persons;"
```

---

## ✅ Summary

**Everything is now switched to test-online:**

1. ✅ Branch: `test-online`
2. ✅ Database: `faces_testonline.db` (test data)
3. ✅ Backend: Configured for test-online
4. ✅ Frontend: Configured for test-online
5. ✅ Dependencies: Installed and ready

**Next:** Start backend and frontend, then continue development!

---

**Ready to continue! 🚀**


