# 🧪 Integration Test Guide - Complete Enrollment Workflow

This guide will walk you through testing the **complete public enrollment workflow** from start to finish.

## 📋 Prerequisites

Before starting, make sure:
- ✅ Frontend is running (`npm run dev` at http://localhost:3000)
- ✅ Backend is running (`cd backend && python main.py` at http://localhost:8000)
- ✅ You are signed in to the app
- ✅ You have at least one group created

---

## 🔄 Complete Workflow Test

### **Phase 1: Generate Enrollment Link**

1. **Open the app** at http://localhost:3000
2. **Click "Groups"** from the welcome screen
3. **Select a group** (or create a new one)
4. **Click "📋 Share Link"** button
5. **Verify** you see: "✅ Enrollment link copied to clipboard!"

**Expected link format:**
```
http://localhost:3000/enroll/{user_id}/{group_id}
```

**Console check:**
```javascript
// The link should be in your clipboard
// Paste it somewhere to verify the format
```

---

### **Phase 2: Public Sign-Up (Pending Enrollment)**

1. **Open a new browser tab/window** (or use incognito mode)
2. **Paste the enrollment link** you copied
3. **Fill in the form:**
   - Name: "Test Scout"
   - Email: test@example.com
   - Age: 12
   - Age Group: "6th Grade"
   - Parent Name: "Test Parent"
   - Parent Phone: "555-1234"
   - Allergies: "None"

4. **Take 4 photos:**
   - Click "Capture Photo" 4 times
   - Make sure each photo passes quality checks (green checkmark)
   - You should see: "✅ 4/4 photos captured (Avg quality: X%)"

5. **Click "Submit Enrollment"**

**Expected result:**
- ✅ Success message: "Enrollment submitted! Your request is pending review."
- ✅ Photos uploaded to Supabase Storage (`pending/{pending_id}/`)
- ✅ Record created in `pending_enrollments` table

**Console logs (public page):**
```
📸 Photo 1/4 captured with quality: X%
📸 Photo 2/4 captured with quality: X%
📸 Photo 3/4 captured with quality: X%
📸 Photo 4/4 captured with quality: X%
📤 Uploading 4 photos to Supabase...
✅ All photos uploaded
📝 Creating pending enrollment...
✅ Enrollment submitted successfully!
```

**Verify in Supabase Dashboard:**
1. Go to **Storage** → `face-photos` bucket
2. Navigate to `pending/{pending_id}/`
3. You should see 4 photos: `photo_1.jpg`, `photo_2.jpg`, etc.

4. Go to **Table Editor** → `pending_enrollments`
5. You should see 1 row with:
   - `status`: "pending"
   - `name`: "Test Scout"
   - `user_id`: your user ID
   - `group_id`: the group ID from the link
   - `photo_urls`: array of 4 URLs

---

### **Phase 3: Review Pending Enrollment (Inbox)**

1. **Go back to the main app tab** (where you're signed in)
2. **Click "📬 Inbox"** from the welcome screen

**Expected UI:**
- You should see **1 pending enrollment card** with:
  - Name: "Test Scout"
  - Email: test@example.com
  - Age: 12
  - Age Group: "6th Grade"
  - Parent info
  - Allergies
  - 4 photos displayed
  - "✅ Accept" and "❌ Reject" buttons

**Console logs:**
```
📬 Loading pending enrollments...
✅ Found 1 pending enrollment(s)
```

---

### **Phase 4: Accept Enrollment (Process with AI)**

1. **Click "✅ Accept"** on the pending enrollment card

**Expected process:**
1. **Frontend** sends request to backend `/process_pending_enrollment`
2. **Backend** downloads photos from Supabase
3. **Backend** generates face embeddings using InsightFace
4. **Backend** creates person in Supabase `persons` table
5. **Backend** saves embeddings to Supabase `face_embeddings` table
6. **Backend** saves embeddings to local SQLite cache
7. **Backend** adds person to the group
8. **Backend** updates pending enrollment status to "approved"
9. **Frontend** removes card from inbox
10. **Frontend** adds person to local state

**Console logs (frontend):**
```
🔄 Processing enrollment for Test Scout...
📤 Sending to backend for AI processing...
```

**Console logs (backend):**
```
🔄 Processing pending enrollment: {pending_id}
📥 Downloading 4 photos from Supabase...
✅ Downloaded photo 1/4
✅ Downloaded photo 2/4
✅ Downloaded photo 3/4
✅ Downloaded photo 4/4
🤖 Generating face embeddings...
✅ Generated 4 embeddings
☁️ Saving person to Supabase...
✅ Person created in Supabase
💾 Saving embeddings to Supabase...
✅ Saved 4 embeddings to Supabase
💽 Caching embeddings locally...
✅ Cached 4 embeddings in local SQLite
👥 Adding person to group...
✅ Person added to group
📝 Updating pending enrollment status...
✅ Enrollment processed successfully!
```

**Verify in Supabase:**
1. **Table Editor** → `persons`: New row for "Test Scout"
2. **Table Editor** → `face_embeddings`: 4 new rows with embeddings
3. **Table Editor** → `group_members`: New row linking person to group
4. **Table Editor** → `pending_enrollments`: Status changed to "approved"
5. **Storage** → `face-photos/{user_id}/{person_id}/`: 4 photos moved here

**Verify in Local SQLite:**
```bash
cd backend
sqlite3 faces.db "SELECT person_id, COUNT(*) FROM embeddings WHERE person_id = '{person_id}';"
```
Should show: `{person_id}|4`

---

### **Phase 5: Verify Person in App**

1. **Go to "People"** from the welcome screen
2. **Find "Test Scout"** in the list
3. **Click on the person card** to view details
4. **Verify:**
   - ✅ Name: "Test Scout"
   - ✅ Email: test@example.com
   - ✅ Age: 12
   - ✅ Age Group: "6th Grade"
   - ✅ Parent info displayed
   - ✅ Allergies displayed
   - ✅ 4 photos displayed
   - ✅ Photo quality metrics shown

5. **Go to "Groups"** and select the group
6. **Verify:**
   - ✅ "Test Scout" appears in the members list
   - ✅ Member count increased by 1

---

### **Phase 6: Test Face Recognition**

1. **Go to "Groups"** and select the group with "Test Scout"
2. **Click "Start Attendance"**
3. **Point camera at the person** who submitted the enrollment
4. **Wait for recognition**

**Expected result:**
- ✅ Face detected
- ✅ Face recognized as "Test Scout"
- ✅ Green box around face
- ✅ Name displayed
- ✅ Attendance marked

**Console logs:**
```
🔍 Searching for match in local cache...
✅ Match found: Test Scout (confidence: X%)
```

**If recognition fails:**
1. Check local SQLite cache:
   ```bash
   cd backend
   sqlite3 faces.db "SELECT person_id, COUNT(*) FROM embeddings WHERE person_id = '{person_id}';"
   ```
2. If no embeddings, run sync script:
   ```bash
   python sync_from_supabase.py
   ```

---

## ✅ Success Criteria

All of the following should work:

- [x] **Link Generation**: Share link button copies correct URL
- [x] **Public Sign-Up**: Form submission creates pending enrollment
- [x] **Photo Upload**: 4 photos uploaded to Supabase Storage
- [x] **Inbox Display**: Pending enrollment appears in inbox
- [x] **Accept Process**: Backend generates embeddings and creates person
- [x] **Data Sync**: Person saved to both Supabase and local cache
- [x] **Group Membership**: Person added to correct group
- [x] **UI Update**: Person appears in People and Groups panels
- [x] **Face Recognition**: Person can be recognized during attendance

---

## 🐛 Troubleshooting

### Issue: "No pending enrollments found"
**Check:**
1. Supabase `pending_enrollments` table has rows with your `user_id`
2. Status is "pending" (not "approved" or "rejected")
3. You're signed in with the correct user account

### Issue: "Failed to process enrollment"
**Check:**
1. Backend is running and accessible
2. Backend `.env` file has correct Supabase credentials
3. Backend console for detailed error messages

### Issue: "Photos not displaying in inbox"
**Check:**
1. Supabase Storage RLS policies allow authenticated users to view `pending/` folder
2. Browser console for 400/403 errors
3. Photo URLs in `pending_enrollments.photo_urls` are valid

### Issue: "Recognition not working after accept"
**Check:**
1. Local SQLite has embeddings:
   ```bash
   sqlite3 backend/faces.db "SELECT person_id, COUNT(*) FROM embeddings WHERE person_id = '{person_id}';"
   ```
2. If missing, run sync:
   ```bash
   cd backend && python sync_from_supabase.py
   ```
3. Restart backend after sync

### Issue: "Person not appearing in group"
**Check:**
1. Supabase `group_members` table has row with correct `group_id` and `person_id`
2. Refresh the app (hard refresh: Cmd+Shift+R)

---

## 📊 Expected Database State After Test

### Supabase Tables:

**`persons`** (1 new row):
```
id: {uuid}
user_id: {your_user_id}
name: "Test Scout"
email: "test@example.com"
age: 12
age_group: "6th Grade"
parent_name: "Test Parent"
parent_phone: "555-1234"
allergies: []
photo_paths: [4 URLs]
```

**`face_embeddings`** (4 new rows):
```
person_id: {uuid}
embedding: [512 floats]
```

**`group_members`** (1 new row):
```
group_id: {group_uuid}
person_id: {person_uuid}
```

**`pending_enrollments`** (1 updated row):
```
status: "approved"
processed_at: {timestamp}
```

### Local SQLite (`backend/faces.db`):

**`embeddings`** (4 new rows):
```
person_id: {uuid}
embedding: [512 floats]
```

---

## 🎉 Next Steps After Successful Test

Once all phases pass:

1. **Test Rejection Flow:**
   - Create another pending enrollment
   - Click "❌ Reject" instead of "✅ Accept"
   - Verify it's removed from inbox and status updated to "rejected"

2. **Test Offline Mode:**
   - Disconnect from internet
   - Try to accept a pending enrollment
   - Verify error message about needing internet

3. **Test Multiple Pending Enrollments:**
   - Create 3-5 pending enrollments
   - Verify all appear in inbox
   - Accept/reject them one by one

4. **Test Link Without Group:**
   - Generate link without selecting a group (general enrollment)
   - Verify person is created but not added to any group

5. **Deploy to Production:**
   - Follow `DEPLOYMENT_GUIDE.md`
   - Test with real URLs (not localhost)

---

## 📝 Notes

- **Frontend quality checks** happen during photo capture (no backend needed)
- **Backend AI processing** only happens when accepting enrollment
- **Supabase is the source of truth** for all data
- **Local SQLite is a cache** for offline recognition
- **Sync happens automatically** when accepting enrollments

---

Good luck with testing! 🚀

