# 🗂️ Git Organization Guide

**Last Updated:** November 17, 2024

## 📚 Understanding Your Git Setup (Simple Explanation)

### What is a Git Worktree?

Think of your project like having **multiple offices**:

1. **Main Office** (Main Repository)
   - Location: `/Users/omrishamai/Desktop/Attendance App Design (admin)new/`
   - This is where Git stores all the "master records"
   - All branches live here: `main`, `test`, `test-video-upload`, `test-online`

2. **Branch Office** (This Worktree)
   - Location: `/Users/omrishamai/.cursor/worktrees/.../jTpGO/`
   - This is where you're working NOW
   - You're working on the `test-online` branch
   - It's connected to the main office, so changes sync back

**Why is this useful?**
- You can work on `test-online` here and `main` in the main folder **at the same time**
- No need to switch branches back and forth
- Each folder has its own files, no conflicts

---

## 🌳 Your Branch Structure

### 1. `main` Branch
- **Purpose:** Stable production version
- **Data:** Original data (Yuval, Gaya, etc.)
- **Status:** Not updated with online features yet
- **Location:** Main repository

### 2. `test-video-upload` Branch
- **Purpose:** Has video testing features
- **Data:** Original data (Yuval, Gaya, etc.)
- **Status:** Stable with video features
- **Location:** Main repository

### 3. `test-online` Branch ⭐ **YOU ARE HERE**
- **Purpose:** New online/offline hybrid system with Supabase
- **Data:** Test data (test users, separate from main)
- **Features:**
  - ✅ Supabase integration (cloud database)
  - ✅ Public enrollment links
  - ✅ Pending inbox for approvals
  - ✅ Offline mode with local storage
  - ✅ Auto-sync when online
  - ✅ Local SQLite cache for face recognition
  - ✅ Direct add person (camera)
  - ✅ Video testing with InsightFace
- **Status:** **Fully working!** 🎉
- **Location:** This worktree (`jTpGO` folder)

---

## 📋 Current Status Summary

### ✅ What's Working
1. **Authentication:** Supabase Auth (sign in/sign out)
2. **Database:** Supabase PostgreSQL (cloud) + SQLite (local cache)
3. **Face Recognition:** InsightFace `buffalo_l` model (local backend)
4. **Photo Storage:** Supabase Storage
5. **Public Enrollment:** People can sign up via link → goes to pending inbox
6. **Pending Inbox:** Review and accept enrollments
7. **Direct Add:** Add people directly through the app (camera)
8. **Offline Mode:** Works without internet after initial data load
9. **Auto-Sync:** Saves to Supabase when online
10. **Group Management:** Create, edit, add/remove members
11. **Attendance:** Scan faces and mark attendance
12. **Video Testing:** Upload video, get recognition report with InsightFace

### 🗄️ Data Separation
- **Supabase:** Each user has their own data (persons, groups, embeddings)
- **Local SQLite:**
  - `faces_original.db` → Used by `main` and `test-video-upload` branches
  - `faces_testonline.db` → Used by `test-online` branch (this one!)
  - Automatically switched using `switch-database.sh` script

---

## 🚀 How to Commit and Push Your Changes

### Step 1: Check What Changed
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO
git status
```

This shows all files you've modified, added, or deleted.

### Step 2: Stage Your Changes
```bash
# Add all changes
git add .

# OR add specific files only
git add src/components/PendingInbox.tsx
git add backend/main.py
```

### Step 3: Commit Your Changes
```bash
git commit -m "feat: Complete Supabase integration with offline mode

- Add Supabase authentication and database integration
- Implement public enrollment links with pending inbox
- Add offline mode with local storage fallback
- Create direct add person flow with backend processing
- Add auto-sync when internet is available
- Implement local SQLite cache for face recognition
- Add video testing with InsightFace model verification
- Create helper scripts for backend management (start.sh, stop.sh, restart.sh)
- Add comprehensive documentation"
```

### Step 4: Push to GitHub (or Remote)
```bash
# Push test-online branch to remote
git push origin test-online

# If this is the first push for this branch
git push -u origin test-online
```

---

## 📝 Files to Commit (Important Ones)

### Frontend Files
- `src/lib/supabase.ts` - Supabase client setup
- `src/hooks/useAuth.tsx` - Authentication hook
- `src/services/SupabaseDataService.ts` - Cloud database operations
- `src/services/LocalStorageService.ts` - Offline storage
- `src/components/LoginPage.tsx` - User login
- `src/components/PublicEnrollmentPage.tsx` - Public sign-up
- `src/components/PendingInbox.tsx` - Pending approvals
- `src/components/AddPersonModal.tsx` - Direct add person
- `src/components/PeoplePanel.tsx` - Manage people
- `src/components/GroupsPanel.tsx` - Manage groups
- `src/utils/frontendQualityChecks.ts` - Photo quality checks
- `src/App.tsx` - Main app logic

### Backend Files
- `backend/main.py` - FastAPI backend with InsightFace
- `backend/requirements.txt` - Python dependencies
- `backend/.env` - Supabase credentials (already in .gitignore, don't commit!)
- `backend/start.sh` - Start backend script
- `backend/stop.sh` - Stop backend script
- `backend/restart.sh` - Restart backend script
- `backend/check_model.py` - Model verification script
- `backend/sync_from_supabase.py` - Sync embeddings script
- `backend/switch-database.sh` - Switch database by branch

### Database Files (DON'T COMMIT THESE)
- `backend/faces.db` - Current active database (ignored by Git)
- `backend/faces_original.db` - Backup for main/test-video-upload
- `backend/faces_testonline.db` - Backup for test-online

### Configuration Files
- `.env.local` - Frontend Supabase credentials (already in .gitignore, don't commit!)
- `supabase-schema.sql` - Database schema
- `package.json` - Frontend dependencies
- `vite.config.ts` - Vite configuration

### Documentation Files (ALL OF THESE!)
- `README.md` - Main documentation
- `SUPABASE_SETUP.md` - Supabase setup guide
- `ENV_SETUP.md` - Environment variables guide
- `SYSTEM_ARCHITECTURE_COMPLETE.md` - System architecture
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `HOW_TO_SWITCH_BRANCHES.md` - Branch switching guide
- `BRANCH_ARCHITECTURE_EXPLAINED.md` - Branch explanation
- `OFFLINE_MODE_COMPLETE.md` - Offline mode details
- `backend/HOW_TO_USE.md` - Backend scripts guide
- `MODEL_AND_TESTING_INFO.md` - InsightFace model info
- `VIDEO_TEST_INSTRUCTIONS.md` - Video testing guide
- `GIT_ORGANIZATION_GUIDE.md` - This file!
- Plus many other `.md` files documenting fixes and features

---

## ⚠️ Important: Files to NEVER Commit

These files contain secrets or local data:

```bash
# Frontend secrets (already in .gitignore)
.env.local

# Backend secrets (already in .gitignore)
backend/.env

# Database files (local data only)
backend/faces.db
backend/faces_original.db
backend/faces_testonline.db

# Python virtual environment (already in .gitignore)
backend/venv/

# Node modules (already in .gitignore)
node_modules/

# Build output (already in .gitignore)
build/
dist/

# Photos (already in .gitignore)
backend/photos/
faces/
```

Your `.gitignore` file should already handle most of these, but double-check before committing!

---

## 🔄 Working with Different Branches

### Switch to Main Branch (in main repository)
```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
git checkout main
```

### Switch to test-video-upload (in main repository)
```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
git checkout test-video-upload
```

### Work on test-online (stay in this worktree)
```bash
# You're already here!
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO
```

### When to Use Which Branch

| Task | Branch | Location |
|------|--------|----------|
| Work on new online features | `test-online` | Worktree (here) |
| Work on video features only | `test-video-upload` | Main repo |
| Stable production version | `main` | Main repo |
| Test everything together | `test-online` | Worktree (here) |

---

## 🎯 Merging test-online into main (Future)

**NOT YET!** Only do this when you're 100% ready to make `test-online` the new stable version.

When you're ready:
```bash
# 1. Go to main repository
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"

# 2. Switch to main branch
git checkout main

# 3. Merge test-online into main
git merge test-online

# 4. Resolve any conflicts (if any)
# (Edit conflicting files, then git add them)

# 5. Push updated main
git push origin main
```

---

## 🛠️ Quick Commands Reference

### Check Status
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO
git status
```

### See What Changed
```bash
git diff                    # See unstaged changes
git diff --staged          # See staged changes
```

### Commit Workflow
```bash
git add .                  # Stage all changes
git status                 # Verify what will be committed
git commit -m "message"    # Commit with message
git push origin test-online  # Push to remote
```

### View Commit History
```bash
git log --oneline -10      # Last 10 commits
git log --graph --all      # Branch visualization
```

### Undo Changes (if needed)
```bash
git restore <file>         # Discard changes to a file
git restore --staged <file>  # Unstage a file
git reset HEAD~1           # Undo last commit (keep changes)
```

---

## 📊 Backend Management Commands

### Start Backend
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
./start.sh
```

### Stop Backend
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
./stop.sh
```

### Restart Backend
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
./restart.sh
```

### Check Which Model is Loaded
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
source venv/bin/activate
python check_model.py
```

### Sync Embeddings from Supabase
```bash
cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
source venv/bin/activate
python sync_from_supabase.py
```

---

## 🎓 Git Concepts Explained (Simple)

### What is a Commit?
A "snapshot" of your project at a specific time. Like taking a photo of all your files.

### What is a Branch?
A separate timeline for your project. You can work on new features without breaking the stable version.

### What is Push?
Sending your commits from your computer to GitHub (or another remote server).

### What is Pull?
Getting the latest commits from GitHub to your computer.

### What is Merge?
Combining changes from one branch into another (e.g., merging `test-online` into `main`).

### What is a Worktree?
A separate folder for a branch, so you can work on multiple branches at the same time in different folders.

---

## ✅ Checklist Before Committing

- [ ] **Test everything works:** Backend starts, frontend loads, can add person, attendance works
- [ ] **Check what changed:** Run `git status` and review all modified files
- [ ] **No secrets in code:** Make sure `.env.local` and `backend/.env` are NOT being committed
- [ ] **No database files:** Make sure `faces.db` is NOT being committed
- [ ] **Write good commit message:** Explain what you added/changed
- [ ] **Push to test-online branch:** Keep `main` stable for now

---

## 🚨 If Something Goes Wrong

### "I committed something I shouldn't have"
```bash
git reset HEAD~1           # Undo last commit, keep changes
git restore <file>         # Discard specific file changes
```

### "Git says there are conflicts"
1. Open the conflicting files
2. Look for `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Edit the file to keep what you want
4. Remove the markers
5. `git add <file>` and `git commit`

### "I don't know what branch I'm on"
```bash
git branch --show-current
```

### "I want to start fresh (CAREFUL!)"
```bash
git reset --hard HEAD      # Discard ALL uncommitted changes
```

---

## 📞 Need Help?

1. **Check Git status:** `git status` (always start here!)
2. **Read the output:** Git usually tells you what to do next
3. **Check documentation:** All `.md` files in this project
4. **Ask for help:** Provide the `git status` output

---

## 🎉 Summary

You are working in the **`test-online` branch** in a **Git worktree**. This branch has:
- ✅ Supabase cloud integration
- ✅ Offline mode
- ✅ Public enrollment links
- ✅ Pending inbox
- ✅ Direct add person
- ✅ InsightFace face recognition
- ✅ Video testing
- ✅ All features working!

**Next steps:**
1. Run `git status` to see what changed
2. Run `git add .` to stage all changes
3. Run `git commit -m "Your message here"` to commit
4. Run `git push origin test-online` to push to GitHub

**Keep `main` branch stable** - don't merge `test-online` into `main` yet until you're 100% ready!

---

**Happy coding! 🚀**

