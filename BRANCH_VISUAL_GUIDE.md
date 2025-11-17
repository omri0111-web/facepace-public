# 🌳 Branch Structure Visual Guide

**A simple picture to understand your Git setup**

---

## 🏢 Your Project Structure (Simple View)

```
📁 Desktop
│
└── 📁 Attendance App Design (admin)new  ← MAIN REPOSITORY
    │
    ├── 🌿 main branch (stable, original data)
    │   └── Local Files: Everything without online features
    │
    ├── 🌿 test-video-upload branch (video testing)
    │   └── Local Files: Everything + video testing features
    │
    └── 🌿 test-online branch (NEW ONLINE FEATURES) ⭐
        │
        └── 📁 Worktree: jTpGO (YOU ARE HERE!)
            └── Location: /Users/omrishamai/.cursor/worktrees/.../jTpGO/
            └── Local Files: Everything + online + offline + Supabase
```

---

## 🎯 What Each Branch Has

### Branch: `main`
```
📦 Features:
  ✅ Basic attendance system
  ✅ Face recognition (InsightFace)
  ✅ Add people manually
  ✅ Create groups
  ✅ Scan attendance
  ❌ NO online features
  ❌ NO public enrollment
  ❌ NO Supabase

💾 Database: faces_original.db
👥 People: Yuval, Gaya, etc. (your original data)
📍 Location: Main repository folder
```

### Branch: `test-video-upload`
```
📦 Features:
  ✅ Everything from main
  ✅ Video upload testing
  ✅ Frame-by-frame recognition
  ✅ Test report generation
  ❌ NO online features
  ❌ NO public enrollment
  ❌ NO Supabase

💾 Database: faces_original.db
👥 People: Yuval, Gaya, etc. (your original data)
📍 Location: Main repository folder
```

### Branch: `test-online` ⭐ **YOU ARE HERE**
```
📦 Features:
  ✅ Everything from test-video-upload
  ✅ Supabase cloud database
  ✅ Supabase authentication
  ✅ Supabase photo storage
  ✅ Public enrollment links
  ✅ Pending inbox
  ✅ Offline mode
  ✅ Auto-sync when online
  ✅ Local storage caching
  ✅ Direct add person
  ✅ All features working!

💾 Database: faces_testonline.db
👥 People: Test users (separate from main)
📍 Location: Worktree folder (jTpGO)
```

---

## 🗺️ File System Map

```
/Users/omrishamai/
│
├── Desktop/
│   │
│   └── Attendance App Design (admin)new/     ← MAIN REPOSITORY
│       ├── .git/                             ← Git storage
│       │   └── worktrees/
│       │       └── jTpGO/                    ← Worktree config
│       ├── src/                              ← Source code (main or test-video-upload)
│       ├── backend/
│       │   └── faces.db → faces_original.db  ← Points to original DB
│       └── ...
│
└── .cursor/
    └── worktrees/
        └── .../
            └── jTpGO/                         ← WORKTREE (test-online branch)
                ├── .git                       ← Points to main repo
                ├── src/                       ← Source code (test-online)
                ├── backend/
                │   ├── faces.db → faces_testonline.db  ← Points to test DB
                │   ├── faces_original.db      ← Backup for main
                │   ├── faces_testonline.db    ← Backup for test-online
                │   ├── start.sh               ← Backend scripts
                │   ├── stop.sh
                │   └── restart.sh
                ├── commit-changes.sh          ← Commit helper
                └── ...
```

---

## 🔄 How They Connect

```
┌─────────────────────────────────────┐
│   GitHub (Remote Repository)        │
│                                      │
│   ├── main branch                   │
│   ├── test-video-upload branch      │
│   └── test-online branch            │
│                                      │
└──────────────┬──────────────────────┘
               │
               │ git push / git pull
               │
┌──────────────▼──────────────────────┐
│   Main Repository (Desktop)         │
│                                      │
│   ├── main branch                   │
│   ├── test-video-upload branch      │
│   └── test-online branch            │
│       │                              │
│       └─────────────┐                │
│                     │                │
└─────────────────────┼────────────────┘
                      │
                      │ Connected via Git worktree
                      │
┌─────────────────────▼────────────────┐
│   Worktree (jTpGO folder)            │
│   ⭐ YOU ARE HERE                     │
│                                      │
│   test-online branch                 │
│   (All files, working directory)     │
│                                      │
└──────────────────────────────────────┘
```

---

## 📊 Data Flow Diagram

### When You Work on test-online:

```
┌─────────────────┐
│  Your Computer  │
│  (Worktree)     │
│  test-online    │
└────────┬────────┘
         │
         │ Edit files, make changes
         ▼
┌─────────────────┐
│  Git Commit     │ ← Saves snapshot of changes
└────────┬────────┘
         │
         │ git push origin test-online
         ▼
┌─────────────────┐
│  GitHub         │ ← Stores your code online
│  test-online    │
└─────────────────┘
```

### When Someone Else Wants Your Changes:

```
┌─────────────────┐
│  GitHub         │
│  test-online    │
└────────┬────────┘
         │
         │ git pull origin test-online
         ▼
┌─────────────────┐
│  Their Computer │
│  test-online    │
└─────────────────┘
```

---

## 🎯 Why Use Worktrees?

### Without Worktrees (Normal Git):
```
You're on test-online branch:
📁 Attendance App Design (admin)new/
   └── (test-online files)

Want to check main branch?
→ git checkout main
→ All files change to main version
→ Can't work on both at same time!

Want to go back to test-online?
→ git checkout test-online
→ All files change back
→ Takes time, files keep changing
```

### With Worktrees (What You Have):
```
Main repository:
📁 Attendance App Design (admin)new/
   └── (main or test-video-upload files)

Worktree folder:
📁 jTpGO/
   └── (test-online files)

✅ Work on test-online in jTpGO folder
✅ Work on main in Desktop folder
✅ Both available at the same time!
✅ No switching, no waiting!
```

---

## 🚦 Workflow Examples

### Scenario 1: Daily Development
```
1. You: Open jTpGO folder (worktree)
2. You: Edit code for test-online branch
3. You: Test changes
4. You: Commit changes
5. You: Push to GitHub (test-online branch)
```

### Scenario 2: Need to Check Main
```
1. You: Open Desktop folder (main repo)
2. You: git checkout main
3. You: Check main branch code
4. You: Go back to jTpGO folder
5. You: Continue working on test-online
   (No need to switch branches!)
```

### Scenario 3: Merging test-online into main (Future)
```
1. You: Open Desktop folder (main repo)
2. You: git checkout main
3. You: git merge test-online
4. You: Resolve any conflicts
5. You: git push origin main
6. Done! Main now has all test-online features
```

---

## 🗄️ Database Files Explained

### Three Database Files:

```
📁 backend/
├── faces.db               ← ACTIVE database (symlink)
├── faces_original.db      ← BACKUP for main & test-video-upload
└── faces_testonline.db    ← BACKUP for test-online
```

### How It Works:

```
When on test-online branch:
  faces.db → points to → faces_testonline.db
  
When on main branch:
  faces.db → points to → faces_original.db
  
When on test-video-upload branch:
  faces.db → points to → faces_original.db
```

### Automatic Switching:
```bash
./switch-database.sh  ← Runs this script

Script checks current branch:
  If test-online   → Use faces_testonline.db
  If main          → Use faces_original.db
  If test-video-upload → Use faces_original.db
```

### Why Separate Databases?

```
test-online uses TEST DATA:
  👤 Test User 1
  👤 Test User 2
  👤 Shlomi Test
  (For testing new features without breaking real data)

main/test-video-upload use REAL DATA:
  👤 Yuval
  👤 Gaya
  👤 Your real people
  (Keep your actual data safe)
```

---

## 🎓 Key Terms Simplified

| Term | Simple Explanation | Example |
|------|-------------------|---------|
| **Repository** | A folder tracked by Git | "Attendance App Design (admin)new" |
| **Branch** | A version of your project | main, test-online |
| **Worktree** | A separate folder for a branch | jTpGO folder |
| **Commit** | A snapshot of your code | "Added new feature" |
| **Push** | Send changes to GitHub | `git push origin test-online` |
| **Pull** | Get changes from GitHub | `git pull origin test-online` |
| **Merge** | Combine two branches | Merge test-online into main |
| **Remote** | GitHub server | Where code is stored online |
| **Local** | Your computer | Where you edit code |

---

## ✅ Current Status Checklist

### Where You Are:
- [ ] ✅ Location: `/Users/omrishamai/.cursor/worktrees/.../jTpGO/`
- [ ] ✅ Branch: `test-online`
- [ ] ✅ Database: `faces_testonline.db` (test data)
- [ ] ✅ Features: All online features working
- [ ] ✅ Changes: Ready to commit and push

### What You Have:
- [ ] ✅ Main repository on Desktop (untouched)
- [ ] ✅ Worktree folder with test-online branch
- [ ] ✅ Separate database for test data
- [ ] ✅ All new features implemented
- [ ] ✅ Everything tested and working

### What's Next:
- [ ] ⏳ Read these guides to understand Git
- [ ] ⏳ Run `./commit-changes.sh` to commit
- [ ] ⏳ Push to GitHub to back up your work
- [ ] ⏳ Keep testing and improving
- [ ] ⏸️ Eventually merge into main (NOT YET!)

---

## 🎯 Quick Commands Reference

### Check Where You Are:
```bash
pwd                        # Show current folder
git branch --show-current  # Show current branch
```

### Work on test-online (YOU):
```bash
cd /Users/omrishamai/.cursor/worktrees/.../jTpGO
# Edit code, test, commit, push
```

### Work on main (DESKTOP):
```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
git checkout main
# Check main branch code
```

### Commit Changes:
```bash
cd /Users/omrishamai/.cursor/worktrees/.../jTpGO
./commit-changes.sh        # Easy way
# OR
git add .
git commit -m "message"
git push origin test-online
```

---

## 🚨 Important Reminders

1. **You are working on `test-online` branch** in the worktree folder
2. **Main repository is safe** on your Desktop
3. **Databases are separate** - test-online has its own data
4. **Always commit in the worktree folder** (jTpGO)
5. **Push to `test-online` branch** on GitHub
6. **Don't merge into `main` yet** - keep testing!

---

## 📞 Need Help?

### "Where am I?"
```bash
pwd
git branch --show-current
```

### "What changed?"
```bash
git status
```

### "How do I save my work?"
```bash
./commit-changes.sh
```

### "Is my main branch safe?"
Yes! It's in a different folder on your Desktop, completely untouched.

### "Can I delete the worktree?"
Yes, but commit and push first! Then:
```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"
git worktree remove jTpGO
```

---

## 🎉 Summary

```
┌─────────────────────────────────────┐
│         YOUR GIT SETUP              │
│                                      │
│  📁 Main Repo (Desktop)             │
│     ├── main branch                 │
│     ├── test-video-upload           │
│     └── test-online (source)        │
│                                      │
│  📁 Worktree (jTpGO) ⭐             │
│     └── test-online (working copy)  │
│         YOU ARE HERE!                │
│                                      │
│  ☁️  GitHub                          │
│     └── All branches backed up      │
│                                      │
└─────────────────────────────────────┘
```

**Simple Rule:**  
Work in jTpGO folder → Commit changes → Push to GitHub → Everything is safe!

**Ready to commit?**  
Run: `./commit-changes.sh`

**Happy coding! 🚀**

