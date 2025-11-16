# Supabase Setup - Next Steps

## 🎯 What We've Done So Far:
✅ Created virtual environment for backend (fixed numpy ARM64 issue)
✅ Backend server running successfully on port 8000
✅ `/embedding` endpoint working
✅ Updated database schema with `pending_enrollments` table
✅ Created new branch `test-online` for this work

---

## 📋 What YOU Need to Do in Supabase:

### Step 1: Run the Database Schema

1. Open your Supabase dashboard: https://app.supabase.com
2. Go to your project (the one with URL: `https://ytoqfqqnpivalkjxfvvn.supabase.co`)
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Open the file `supabase-schema.sql` from this project
6. Copy the **ENTIRE** file contents
7. Paste into the Supabase SQL Editor
8. Click **Run** (or press Cmd+Enter)
9. Wait for success message: "Success. No rows returned"

**Note:** If you get errors about tables already existing, that's okay! It means those tables are already created. The important new table is `pending_enrollments`.

---

### Step 2: Update Storage Policies

You need to add new storage policies for the `pending/` folder (for public enrollment photos).

1. In Supabase dashboard, go to **Storage** → **Policies**
2. Find the `face-photos` bucket
3. Click **New Policy**
4. Add the following policies (copy from `supabase-schema.sql` lines 360-399):

**Policy 2: Public can upload to pending folder**
```sql
CREATE POLICY "Public can upload to pending folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = 'pending'
);
```

**Policy 4: Users can view pending photos**
```sql
CREATE POLICY "Users can view pending photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = 'pending'
);
```

**Policy 6: Service can delete pending photos**
```sql
CREATE POLICY "Service can delete pending photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = 'pending'
);
```

---

### Step 3: Get Service Role Key (for Backend)

The backend needs a **Service Role Key** to access Supabase with full permissions (to move/delete photos).

1. In Supabase dashboard, go to **Settings** → **API**
2. Find **Service Role Key** (it's SECRET - don't share!)
3. Copy it (it starts with `eyJ...`)
4. Keep it ready - we'll add it to `backend/.env` next

---

## ✅ When You're Done:

Let me know when you've completed these steps, and I'll continue with:
- Adding Supabase client to backend
- Creating the frontend quality checks utility
- Building the Public Enrollment Page
- Creating the Pending Inbox component

---

## 📁 Current Branch:
**`test-online`** - All changes are here, `main` is untouched.

---

## 🆘 If You Have Issues:

**"Table already exists" error?**
- That's okay! Skip that part of the schema. The important new table is `pending_enrollments`.

**Can't find Storage Policies?**
- Go to **Storage** → Click on `face-photos` bucket → Click **Policies** tab

**Need help?**
- Just ask! I'm here to guide you through each step.

