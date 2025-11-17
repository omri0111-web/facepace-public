# How to Switch Branches with Different Databases 🔄

## ✅ Setup Complete!

Your databases are now configured:

```
test-online branch:
  └─ Test data only (68K)
     - 1 person (omri 16.11)
     - Test groups

main & test-video-upload branches:
  └─ Original data (356K) ✅
     - 21 people (Gaya, Razi, Yonatan, Dani, Yaron, etc.)
     - checking 1, checking 2, checking 3
```

---

## 🔄 How to Switch Branches:

### Method 1: Automatic (Using the Script)

```bash
# Switch to main (with original data)
git checkout main
./switch-database.sh

# Switch to test-video-upload (with original data)
git checkout test-video-upload
./switch-database.sh

# Switch to test-online (with test data)
git checkout test-online
./switch-database.sh
```

**The script automatically swaps the database for you!** ✅

---

### Method 2: Manual One-Command

I can also create a Git hook that runs automatically when you switch branches!

---

## 📊 What You'll See on Each Branch:

### Branch: `test-online`
```
Database: 68K (test data)
Login: Required (Supabase)
Data Source: Supabase (cloud)

You'll see:
  - omri 16.11 test 3
  - omri 16.11 test 4
  - Test groups

Perfect for: Testing cloud features
```

### Branch: `main`
```
Database: 356K (original data)
Login: Not required
Data Source: Local database only

You'll see:
  - Gaya Z ✅
  - Razi ✅
  - Yonatan Z, Yonatan S ✅
  - Dani ✅
  - Yaron Shamai ✅
  - checking 1, checking 2, checking 3 ✅

Perfect for: Production work with real data
```

### Branch: `test-video-upload`
```
Database: 356K (original data)
Login: Not required
Data Source: Local database only

You'll see:
  - Same as main branch
  - Plus video upload features ✅

Perfect for: Testing video features with real data
```

---

## 🚀 Quick Start Workflow:

### Scenario 1: Test Cloud Features
```bash
git checkout test-online
./switch-database.sh
npm run dev

# Backend in another terminal:
cd backend
source venv/bin/activate
python main.py
```

### Scenario 2: Work with Real Data
```bash
git checkout main
./switch-database.sh
npm run dev

# Backend in another terminal:
cd backend
source venv/bin/activate
python main.py
```

### Scenario 3: Test Video Upload
```bash
git checkout test-video-upload
./switch-database.sh
npm run dev

# Backend in another terminal:
cd backend
source venv/bin/activate
python main.py
```

---

## 📁 Database Files (Behind the Scenes):

The script manages these files:

```
backend/
  ├─ faces.db              ← Active database (changes per branch)
  ├─ faces_testonline.db   ← Backup of test-online data
  └─ faces_original.db     ← Backup of original data (356K)
```

**Don't delete these files!** They contain your backups.

---

## 🔐 Data Safety:

### Your Data is Protected:
- ✅ Original database backed up in `faces_original.db`
- ✅ Test-online database backed up in `faces_testonline.db`
- ✅ Source database on Desktop is untouched
- ✅ Script never deletes data, only copies

### If Something Goes Wrong:
```bash
# Restore original data manually:
cp backend/faces_original.db backend/faces.db

# Or restore test-online data:
cp backend/faces_testonline.db backend/faces.db
```

---

## 🎯 Common Workflows:

### Working on Cloud Features:
```bash
git checkout test-online
./switch-database.sh
# Start coding...
# Test with small test dataset
# No risk to production data ✅
```

### Taking Real Attendance:
```bash
git checkout main
./switch-database.sh
# Launch app
# Take attendance with real people ✅
# All your scouts are there!
```

### Testing Video Features:
```bash
git checkout test-video-upload
./switch-database.sh
# Test video upload
# With real people data ✅
```

---

## ⚠️ Important Notes:

### Don't Forget to Run the Script!
```
❌ BAD:  git checkout main
         npm run dev
         (Still has test-online data!)

✅ GOOD: git checkout main
         ./switch-database.sh
         npm run dev
         (Has original data!)
```

### The Script Shows You Confirmation:
```
✅ Switched to original database (Gaya, checking 1, etc.)
Active database: backend/faces.db
Size: 356K
People: 21
Groups: 3
```

Always check the output to confirm!

---

## 🔄 Want Automatic Switching?

I can create a Git hook to run the script automatically when you switch branches!

**Would you like me to set that up?**

It will run `./switch-database.sh` every time you do `git checkout`.

---

## 📝 Summary:

- ✅ `test-online`: Test data (1 person, test groups)
- ✅ `main` & `test-video-upload`: Original data (21 people, checking 1-3)
- ✅ Script handles switching automatically
- ✅ All data safely backed up
- ✅ Works perfectly!

**Just remember to run `./switch-database.sh` after switching branches!** 🎯

