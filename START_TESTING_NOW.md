# 🚀 START TESTING NOW!

✅ **Enrollment link issue FIXED!** Everything is ready! Here's how to test the complete public enrollment workflow.

---

## ⚡ Quick Start (3 Steps)

### **Step 1: Start the Servers**

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Wait for: `http://localhost:3000`

**Terminal 2 - Backend:**
```bash
cd backend
python main.py
```
Wait for: `INFO:     Uvicorn running on http://0.0.0.0:8000`

---

### **Step 2: Generate Enrollment Link**

1. Open http://localhost:3000
2. Sign in (if not already)
3. Click **"Groups"**
4. Select a group (or create one)
5. Click **"📋 Share Link"**
6. See notification: "✅ Enrollment link copied to clipboard!"

**The link will look like:**
```
http://localhost:3000/enroll/{user_id}/{group_id}
```

---

### **Step 3: Test Public Sign-Up**

1. **Open the link** in a new browser tab/window
2. **Fill the form:**
   - Name: "Test Scout"
   - Email: test@example.com
   - Age: 12
   - Age Group: "6th Grade"
   - Parent Name: "Test Parent"
   - Parent Phone: "555-1234"
   - Allergies: "None"

3. **Take 4 photos** (click "Capture Photo" 4 times)
   - Each photo should show a green checkmark ✅
   - Quality score should be > 60%

4. **Click "Submit Enrollment"**
   - Should see: "Enrollment submitted! Your request is pending review."

---

### **Step 4: Check Inbox**

1. **Go back to main app** (http://localhost:3000)
2. Click **"📬 Inbox"** from welcome screen
3. **You should see:**
   - 1 pending enrollment card
   - "Test Scout" with all details
   - 4 photos displayed
   - "✅ Accept" and "❌ Reject" buttons

---

### **Step 5: Accept Enrollment**

1. **Click "✅ Accept"** on the card
2. **Watch the console logs:**
   - Frontend: "🔄 Processing enrollment..."
   - Backend: "🤖 Generating face embeddings..."
   - Backend: "✅ Enrollment processed successfully!"
3. **Card should disappear** from inbox
4. **Go to "People"** - "Test Scout" should be there!
5. **Go to "Groups"** - "Test Scout" should be in the group!

---

### **Step 6: Test Recognition**

1. **Go to "Groups"**
2. **Select the group** with "Test Scout"
3. **Click "Start Attendance"**
4. **Point camera** at the person who submitted the enrollment
5. **Should recognize** as "Test Scout" with green box!

---

## ✅ Success Checklist

After testing, all of these should work:

- [ ] Share link button copies enrollment URL
- [ ] Public enrollment form accepts all fields
- [ ] 4 photos can be captured with quality checks
- [ ] Form submission shows success message
- [ ] Inbox shows pending enrollment with photos
- [ ] Accept button processes enrollment (check backend logs)
- [ ] Person appears in People panel
- [ ] Person appears in Group members
- [ ] Face recognition works during attendance

---

## 🐛 If Something Doesn't Work

### **No pending enrollments in inbox?**
Check Supabase dashboard:
1. Go to Table Editor → `pending_enrollments`
2. Make sure there's a row with your `user_id`
3. Status should be "pending"

### **Accept button doesn't work?**
Check backend console for errors:
- Should see: "🔄 Processing pending enrollment..."
- If error, read the error message

### **Recognition doesn't work?**
Check local cache:
```bash
cd backend
sqlite3 faces.db "SELECT person_id, COUNT(*) FROM embeddings WHERE person_id = (SELECT id FROM persons ORDER BY created_at DESC LIMIT 1);"
```
Should show: `{person_id}|4`

If no embeddings, run sync:
```bash
python sync_from_supabase.py
```

### **Photos not showing?**
Check Supabase Storage:
1. Go to Storage → `face-photos` bucket
2. Navigate to `pending/{pending_id}/`
3. Should see 4 photos

---

## 📖 Full Testing Guide

For comprehensive testing with troubleshooting:
👉 **See `INTEGRATION_TEST_GUIDE.md`**

---

## 🎉 What You're Testing

This is the **complete hybrid online/offline enrollment workflow**:

1. **User** generates shareable enrollment link
2. **Public visitor** fills form and takes photos (no login)
3. **Photos** uploaded to Supabase (cloud)
4. **Enrollment** goes to pending state
5. **User** reviews in inbox
6. **Backend** processes with AI when accepted
7. **Person** created in Supabase + local cache
8. **Recognition** works offline using local cache

---

## 💡 Tips

- **Use incognito mode** for public enrollment to simulate a real visitor
- **Check browser console** (F12) to see detailed logs
- **Check backend terminal** to see AI processing logs
- **Verify in Supabase dashboard** to see cloud data
- **Test offline** by disconnecting internet after accepting enrollment

---

## 🚀 Ready?

**Open two terminals, start the servers, and begin testing!**

If you encounter any issues, check:
1. Backend console logs
2. Frontend console logs (F12)
3. Supabase dashboard
4. `INTEGRATION_TEST_GUIDE.md` troubleshooting section

Good luck! 🎉

