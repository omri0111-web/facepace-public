# 🎯 FacePace - Simple Guide

## ⚡ Quick Start (3 Steps)

### **Step 1: Start Backend**
```bash
cd backend
./start.sh
```
**Wait for:** `✅ Supabase client initialized`

### **Step 2: Start Frontend** (new terminal)
```bash
npm run dev
```
**Wait for:** `Local: http://localhost:3000`

### **Step 3: Open Browser**
Go to: **http://localhost:3000**

**Done! 🎉**

---

## 🛑 To Stop

Press **CTRL+C** in both terminals

Or run:
```bash
cd backend
./stop.sh
```

---

## ✨ What It Does

### **For You (Guide/Admin):**
- ✅ Sign in with email
- ✅ Add scouts (with photos)
- ✅ Create groups
- ✅ Take attendance (face recognition)
- ✅ View reports

### **For Scouts (People):**
- ✅ Click a link you send them
- ✅ Take 4 photos
- ✅ Fill in their info
- ✅ Done! (You review in "Inbox")

---

## 📱 Main Features

1. **Add People** - Camera + AI face recognition
2. **Groups** - Organize scouts into groups
3. **Enrollment Links** - Let people sign up themselves
4. **Inbox** - Review and approve sign-ups
5. **Attendance** - Automatic face recognition
6. **Offline Mode** - Works without internet (after first load)

---

## 🆘 Problems?

### **Backend won't start:**
```bash
cd backend
./restart.sh
```

### **Frontend shows errors:**
```bash
# Press CTRL+C
npm run dev
```

### **Can't add people:**
- ✅ Check internet connection
- ✅ Backend must be running
- ✅ Sign in first

### **Recognition not working:**
```bash
cd backend
./restart.sh
```

---

## 📚 More Info

- **Full guide:** See `SIMPLE_STATUS.md`
- **Backend help:** See `backend/HOW_TO_USE.md`
- **Offline mode:** See `OFFLINE_MODE_COMPLETE.md`

---

## 🎯 That's It!

Everything else works automatically in the background.

**Just remember:**
1. Start backend: `./start.sh`
2. Start frontend: `npm run dev`
3. Use the app!

**Happy tracking! 🚀**

