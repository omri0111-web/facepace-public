# 🚀 Backend - Super Simple Guide

## 📁 Where is this?
You're in the **test-online** branch backend.

**Full path:**
```
/Users/omrishamai/.cursor/worktrees/.../jTpGO/backend/
```

---

## 🎯 3 Simple Commands (That's It!)

### ▶️ **START the backend**
```bash
./start.sh
```
**What it does:**
- Cleans up old processes
- Starts the server
- Shows you logs

**You'll see:**
```
✅ Supabase client initialized
INFO: Uvicorn running on http://0.0.0.0:8000
```

---

### 🛑 **STOP the backend**
```bash
./stop.sh
```
**What it does:**
- Stops the server
- Frees up port 8000

---

### 🔄 **RESTART the backend** (if something is weird)
```bash
./restart.sh
```
**What it does:**
- Stops the old one
- Starts a fresh one

---

## 📋 Step-by-Step Instructions

### **Option 1: Using Terminal (Recommended)**

1. **Open Terminal** (search "Terminal" on Mac)

2. **Go to backend folder:**
   ```bash
   cd /Users/omrishamai/.cursor/worktrees/Attendance_App_Design__admin_new__Workspace_/jTpGO/backend
   ```

3. **Start backend:**
   ```bash
   ./start.sh
   ```

4. **Keep this terminal window open** while using the app

5. **To stop:** Press `CTRL+C` or run `./stop.sh` in a new terminal

---

### **Option 2: Using Cursor Terminal**

1. Open **Cursor**
2. Click **Terminal** → **New Terminal** (bottom of screen)
3. Type:
   ```bash
   cd backend
   ./start.sh
   ```
4. Done! ✅

---

## 🆘 Common Problems & Solutions

### ❌ **"Address already in use" error**
**Solution:** Run this first:
```bash
./stop.sh
./start.sh
```

### ❌ **"Permission denied" error**
**Solution:** Run this once:
```bash
chmod +x start.sh stop.sh restart.sh
```

### ❌ **"Module not found" error**
**Solution:** The script will auto-install packages, just wait 30 seconds

### ❌ **Backend not responding**
**Solution:**
```bash
./restart.sh
```

---

## 🧪 How to Test if Backend is Working

1. **Start the backend** (`./start.sh`)

2. **Open browser:** http://127.0.0.1:8000/health

3. **You should see:** `{"status":"ok"}`

4. ✅ **It's working!**

---

## 📝 Notes

- **Always start the backend BEFORE opening the app**
- **Keep the terminal window open** while using the app
- **Press CTRL+C** to stop the backend when done
- **If something weird happens:** Just run `./restart.sh`

---

## 🎯 Quick Reference Card

| What you want | Command |
|---------------|---------|
| Start backend | `./start.sh` |
| Stop backend | `./stop.sh` or `CTRL+C` |
| Restart backend | `./restart.sh` |
| Check if working | Open `http://127.0.0.1:8000/health` |

---

**That's it! You only need to remember `./start.sh` 🚀**

