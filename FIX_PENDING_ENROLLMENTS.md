# 🔧 Fix Pending Enrollments - Add group_id Column

## 🐛 Problem

The enrollment submission fails with:
```
Could not find the 'group_id' column of 'pending_enrollments' in the schema cache
```

This is because the `pending_enrollments` table doesn't have a `group_id` column yet!

---

## ✅ Solution

Run the migration SQL to add the `group_id` column.

---

## 📋 Steps to Fix

### **1. Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar

---

### **2. Run the Migration**

1. Click **"New Query"**
2. **Copy and paste** this SQL:

```sql
-- Migration: Add group_id column to pending_enrollments table
-- This allows direct enrollment links without needing the enrollment_links table

-- Add group_id column (optional, can be NULL for general enrollments)
ALTER TABLE pending_enrollments 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pending_enrollments_group_id 
ON pending_enrollments(group_id);

-- Add processed_at timestamp to track when enrollment was accepted/rejected
ALTER TABLE pending_enrollments 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Update the status check to include 'approved' (we were using this in the code)
ALTER TABLE pending_enrollments 
DROP CONSTRAINT IF EXISTS pending_enrollments_status_check;

ALTER TABLE pending_enrollments 
ADD CONSTRAINT pending_enrollments_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'approved'));

-- Done! Now pending_enrollments can store group_id directly
```

3. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter)

---

### **3. Verify Success**

You should see:
```
Success. No rows returned
```

---

### **4. Verify the Column Exists**

1. Go to **"Table Editor"** in left sidebar
2. Click **"pending_enrollments"** table
3. You should now see a **"group_id"** column

---

### **5. Test Again**

1. Go back to the enrollment page
2. Fill the form and take 4 photos
3. Click "Submit Enrollment"
4. Should now work! ✅

---

## 📊 What This Migration Does

1. ✅ Adds `group_id` column to `pending_enrollments`
2. ✅ Makes it optional (NULL allowed) for general enrollments
3. ✅ Links to `groups` table with foreign key
4. ✅ Adds index for better performance
5. ✅ Adds `processed_at` timestamp
6. ✅ Updates status constraint to include 'approved'

---

## 🎯 Expected Result

After running the migration:

**Console logs when submitting enrollment:**
```
📤 Submitting enrollment for: Test Scout
👤 User ID: eb2d384f-a002-4b52-901f-7792d04fde4f
👥 Group ID: eff0e647-cb2b-4289-9ca3-33c57da34365
🆔 Pending ID: {new-uuid}
📤 Uploading 4 photos to Supabase...
✅ Uploaded photo 1/4
✅ Uploaded photo 2/4
✅ Uploaded photo 3/4
✅ Uploaded photo 4/4
✅ All photos uploaded
📝 Creating pending enrollment...
✅ Enrollment submitted successfully!
```

**Success message:**
```
✅ Enrollment Submitted!
Thank you, Test Scout! Your enrollment has been submitted successfully.
Your submission is now pending review. You'll be notified once it's approved.
```

---

## 🔍 Verify in Database

After successful submission:

1. Go to **Table Editor** → **pending_enrollments**
2. You should see a new row with:
   - `id`: UUID
   - `user_id`: Your user ID
   - `group_id`: The group ID from the link ✅ (NEW!)
   - `name`: "Test Scout"
   - `status`: "pending"
   - `photo_urls`: Array of 4 URLs
   - All other fields filled in

---

## 🎉 Next Steps

Once the migration is complete:

1. ✅ Submit enrollment (should work now!)
2. ✅ Check inbox in main app
3. ✅ Accept the enrollment
4. ✅ Verify person appears in People panel
5. ✅ Test face recognition

---

**Ready?** Go to Supabase Dashboard → SQL Editor → Run the migration! 🚀

