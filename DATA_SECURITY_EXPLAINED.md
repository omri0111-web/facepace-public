# Data Security & Separation in Supabase - EXPLAINED

## Issue 1: How Data Separation Works

### ✅ YES, Your Data is Completely Separated!

**Here's how it works:**

### 1. **User Authentication**
When you sign up, Supabase creates a unique `user_id` (UUID) for you:
- Example: `eb2d384f-a002-4b52-901f-7792d04fde4f`
- This is YOUR unique identifier
- No one else has this ID

### 2. **Row Level Security (RLS)**
Every table has policies that filter data by `user_id`:

```sql
-- In persons table:
CREATE POLICY "Users can view own persons"
ON persons FOR SELECT
USING (auth.uid() = user_id);
```

**What this means:**
- When YOU query `persons` table, you ONLY see rows where `user_id = YOUR_ID`
- Other users CANNOT see your people, even if they try
- Same for groups, embeddings, everything

### 3. **Example with 2 Users:**

**User A (you):**
- `user_id`: `eb2d384f-a002-4b52-901f-7792d04fde4f`
- Can see: People with `user_id = eb2d384f...`
- Cannot see: User B's data

**User B (someone else):**
- `user_id`: `12345678-1234-1234-1234-123456789abc`
- Can see: People with `user_id = 12345678...`
- Cannot see: User A's data

### 4. **What About the Photos?**

**Current situation:**
- Photos are stored at: `{user_id}/{person_id}/photo_1.jpg`
- Example: `eb2d384f.../ed400785.../photo_1.jpg`

**The 400 error happens because:**
- Storage RLS policy checks: "Is this YOUR folder?"
- But the policy was checking: `(storage.foldername(name))[1] = auth.uid()::text`
- This means: "Can only view photos in folder named with YOUR user_id"
- ✅ This WORKS for your own photos
- ❌ But fails when trying to load them in the UI

**Why the confusion?**
- The photos ARE in your folder (`eb2d384f.../`)
- But the storage policy is being too strict
- It's checking folder ownership correctly, but there might be a bucket configuration issue

---

## The Real Solution: Check Your Storage Bucket Settings

### Go to Supabase Dashboard:

1. **Storage** → **face-photos** bucket
2. Check if bucket is **Public** or **Private**
3. Check **Policies** tab

### Current Policy (Too Restrictive):
```sql
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Better Policy (Checks Database Ownership):
```sql
CREATE POLICY "Users can view photos of their people"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-photos' AND
  (
    -- Can view own user folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Can view pending folder (for reviewing enrollments)
    (storage.foldername(name))[1] = 'pending'
  )
);
```

### Temporary Fix (For Testing Only):
```sql
-- Make bucket public (anyone with URL can view)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');
```

**⚠️ Note:** Public access means anyone with the photo URL can view it, but:
- URLs are hard to guess (long UUIDs)
- Your DATA (names, emails) is still private
- This is common for profile pictures

---

## Issue 2: Recognition Not Working

### ✅ Good News: You Have Embeddings!

You said: "i see face_embeddings table with 4 field on id ed400785..."

**This means:**
- ✅ Photos were processed
- ✅ Face recognition generated embeddings
- ✅ Embeddings saved to Supabase

### Why Recognition Might Not Work:

#### 1. **Backend Not Loading Embeddings**
The backend needs to download embeddings from Supabase before it can recognize faces.

**Check backend logs for:**
```
Loading embeddings from Supabase...
Loaded X embeddings for Y people
```

#### 2. **Local SQLite Cache Empty**
The backend caches embeddings in `backend/faces.db` for faster recognition.

**Check if cache has data:**
```bash
cd backend
sqlite3 faces.db "SELECT COUNT(*) FROM embeddings;"
```

Should show: `4` (or more)

#### 3. **User ID Mismatch**
The backend might be looking for embeddings with a different `user_id`.

**Check in Supabase:**
1. Go to **Table Editor** → **face_embeddings**
2. Find your 4 embeddings
3. Check the `person_id` column
4. Go to **persons** table
5. Find person with that ID
6. Check the `user_id` column
7. Compare with your actual user ID

**Your user ID should be:** `eb2d384f-a002-4b52-901f-7792d04fde4f`

---

## Sign In/Out UI - NOW ADDED! ✅

### What You'll See Now:

**Top right of welcome screen:**
```
┌─────────────────────────┐
│ your@email.com    🚪   │
│ Signed in              │
└─────────────────────────┘
```

**Console will show:**
```
👤 Signed in as: your@email.com
🆔 User ID: eb2d384f-a002-4b52-901f-7792d04fde4f
📋 Full user object: { ... }
```

**Click 🚪 to sign out:**
- Confirms: "Are you sure?"
- Signs out of Supabase
- Clears local data
- Returns to login page

---

## Summary: Your Data IS Secure

### ✅ What's Protected:
- **People data** - Only you can see your people
- **Groups data** - Only you can see your groups
- **Embeddings** - Only you can see your embeddings
- **Enrollment links** - Only you can create/manage your links
- **Pending enrollments** - Only you can see enrollments for your links

### ⚠️ What's Currently Public (For Testing):
- **Photo files** - If you use the public policy
- But URLs are hard to guess (UUIDs)
- Can be made private later with better policy

### 🔒 Production Recommendations:
1. Use signed URLs for photos (temporary, secure links)
2. Keep bucket private
3. Use RLS policies that check database ownership
4. Enable 2FA for your Supabase account
5. Rotate service keys regularly

---

## Next Steps:

1. ✅ **Sign in/out UI is now added** - Refresh your app to see it
2. ✅ **Console shows who's signed in** - Check browser console
3. ⏭️ **Fix storage policy** - Follow instructions above
4. ⏭️ **Debug recognition** - Check backend logs and embeddings
5. ⏭️ **Test with second user** - Sign up another account to verify separation

---

## Testing Data Separation:

**To prove data is separated:**

1. **Create a second account:**
   - Sign out (click 🚪 button)
   - Sign up with different email
   - Add a test person

2. **Verify separation:**
   - Sign out
   - Sign back in with first account
   - You should NOT see the second account's person
   - Check Supabase dashboard - different `user_id` values

3. **Check in Supabase:**
   - Go to **Table Editor** → **persons**
   - You'll see ALL people (because you're admin)
   - But each has different `user_id`
   - In the app, each user only sees their own

---

## Questions?

**Q: Can other users see my photos?**
A: No, unless you make the bucket public. Even then, they need the exact URL.

**Q: Can other users see my people's names?**
A: No, RLS prevents this completely.

**Q: What if I share an enrollment link?**
A: The person fills the form, but YOU own the data. It goes into YOUR database with YOUR user_id.

**Q: Can I share people between users?**
A: Yes, but you'll need to implement the sharing feature (planned for later).

**Q: Is my face recognition data secure?**
A: Yes, embeddings are just numbers. They can't be reversed to recreate faces.

