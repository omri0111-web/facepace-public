# 🔄 Restart Backend & Test

## 🎯 Issues to Fix

1. **✅ Photos now showing with signed URLs** (frontend fixed)
2. **⏳ Person not added to group** (need to restart backend)

---

## 🚀 Quick Fix Steps

### **1. Stop Current Backend**

In the terminal running the backend, press:
```
Ctrl+C
```

### **2. Restart Backend**

```bash
cd backend
python main.py
```

Wait for:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
✅ Supabase initialized successfully
```

### **3. Refresh Frontend**

In your browser:
```
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## 🧪 Test Complete Flow

### **Step 1: Submit New Enrollment**

1. **Get a fresh enrollment link:**
   - Go to Groups → Select "test 1" → Click "📋 Share Link"

2. **Open link in incognito/private window**

3. **Fill form:**
   - Name: "Shlomi Test 2"
   - Email: test@example.com
   - Age: 12
   - Age Group: "6th Grade"
   - Parent Name: "Parent"
   - Parent Phone: "555-1234"

4. **Take 4 photos and submit**

---

### **Step 2: Accept in Inbox**

1. **Go to Inbox** (📬 button)

2. **Verify photos are showing** ✅
   - Should see all 4 photos in the card
   - Photos should load (not broken images)

3. **Note the group name**
   - Should see blue badge: "👥 test 1"

4. **Click "✓ Add" button**

5. **Watch for success message**
   - Should see: "✅ Shlomi Test 2 has been enrolled successfully..."

---

### **Step 3: Verify Person Added to Group**

1. **Go to Groups**

2. **Select "test 1"**

3. **Check members list**
   - Should see "Shlomi Test 2" in the list! ✅
   - Member count should have increased

---

### **Step 4: Verify Photos in People Panel**

1. **Go to People**

2. **Find "Shlomi Test 2"**

3. **Click on the person card**

4. **Check photos:**
   - Avatar should show (first photo)
   - If you have a "Manage Photos" section, photos should be there

---

## 📊 Expected Console Logs

### **Backend (when accepting):**
```
📥 Processing pending enrollment: Shlomi Test 2 (ID: xxx-xxx)
✅ Processed photo 1/4 - embedding generated, photo uploaded
✅ Processed photo 2/4 - embedding generated, photo uploaded
✅ Processed photo 3/4 - embedding generated, photo uploaded
✅ Processed photo 4/4 - embedding generated, photo uploaded
✅ Person created in Supabase: Shlomi Test 2 (ID: yyy-yyy)
✅ Added Shlomi Test 2 to group zzz-zzz    ← SHOULD SEE THIS!
✅ Saved 4 embeddings to Supabase
✅ Saved 4 embeddings to local cache
🗑️  Deleted pending photo: pending/xxx-xxx/photo_1.jpg
🗑️  Deleted pending photo: pending/xxx-xxx/photo_2.jpg
🗑️  Deleted pending photo: pending/xxx-xxx/photo_3.jpg
🗑️  Deleted pending photo: pending/xxx-xxx/photo_4.jpg
```

### **Frontend (when accepting):**
```
🔧 SYSTEM Processing enrollment for Shlomi Test 2...
✅ SUCCESS Backend processed enrollment: {person_id: "yyy-yyy", group_id: "zzz-zzz", ...}
✅ SUCCESS Added Shlomi Test 2 to group test 1    ← SHOULD SEE THIS!
✅ SUCCESS ✅ Shlomi Test 2 enrolled successfully!
```

---

## 🐛 Troubleshooting

### **Issue: Photos still not showing in inbox**

**Check browser console:**
- Look for errors with Supabase Storage
- Should NOT see 403 errors anymore (signed URLs fix this)

**If still broken:**
1. Hard refresh: Cmd+Shift+R
2. Clear browser cache
3. Try incognito window

### **Issue: Person not added to group**

**Check backend console:**
- Should see: "✅ Added {name} to group {id}"
- If NOT, backend wasn't restarted with new code

**Fix:**
```bash
# Stop backend (Ctrl+C)
cd backend
python main.py
```

### **Issue: Backend won't start**

**Check for errors:**
- Look for ImportError or SyntaxError
- Make sure you're in the right directory: `cd backend`
- Make sure venv is activated (if using one)

**Common fix:**
```bash
cd backend
source venv/bin/activate  # If using venv
python main.py
```

---

## ✅ Success Checklist

After accepting "Shlomi Test 2":

- [ ] Photos visible in inbox (before accepting)
- [ ] Backend log shows "Added Shlomi Test 2 to group..."
- [ ] Frontend log shows "Added Shlomi Test 2 to group test 1"
- [ ] Person appears in People panel
- [ ] Person appears in "test 1" group members
- [ ] Group member count increased
- [ ] Person's avatar shows in list
- [ ] Face recognition works for this person

---

## 🎉 When Everything Works

You should be able to:
1. ✅ See photos in inbox
2. ✅ Accept enrollment with one click
3. ✅ Person automatically added to correct group
4. ✅ Person immediately available for recognition
5. ✅ All photos visible throughout the app

---

**Ready? Stop the backend (Ctrl+C), restart it, refresh frontend, and test!** 🚀

