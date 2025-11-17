# Fix: Photos Not Loading (400 Bad Request)

## Problem
Photos are getting 400 errors from Supabase Storage because the RLS policies are too restrictive.

**Current situation:**
- Photos are stored at: `{user_id}/{person_id}/photo_X.jpg`
- Storage policy only allows viewing: `(storage.foldername(name))[1] = auth.uid()::text`
- This means you can only see photos in folders named with YOUR user ID
- But the photos are in folders named with the person's user_id

## Solution Options

### Option 1: Make Photos Publicly Readable (RECOMMENDED for testing)

Go to Supabase Dashboard → Storage → face-photos bucket → Policies

**Delete the restrictive "Users can view own photos" policy and replace with:**

```sql
-- Policy: Anyone can view photos (public read)
CREATE POLICY "Public can view all photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');
```

**Pros:**
- Simple, works immediately
- No authentication issues
- Good for testing

**Cons:**
- Photos are publicly accessible (anyone with URL can view)
- Not ideal for production with sensitive data

---

### Option 2: Update Policy to Check Database Ownership (More Secure)

```sql
-- Policy: Users can view photos of their own people
CREATE POLICY "Users can view photos of own people"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-photos' AND
  (
    -- Can view own folder
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Can view pending folder
    (storage.foldername(name))[1] = 'pending'
    OR
    -- Can view photos of people they own
    EXISTS (
      SELECT 1 FROM persons
      WHERE persons.user_id = auth.uid()
      AND (storage.foldername(name))[2] = persons.id::text
    )
  )
);
```

**Pros:**
- Secure - only owner can see photos
- Follows RLS best practices

**Cons:**
- More complex
- Requires database query for each photo load
- Might be slower

---

## Quick Fix (Do This Now)

1. Go to: https://supabase.com/dashboard/project/ytoqfqqnpivalkjxfvvn/storage/policies

2. Click on `face-photos` bucket

3. Find the policy "Users can view own photos" and **DELETE IT**

4. Click "New Policy" → "Custom"

5. Paste this:
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'face-photos');
```

6. Click "Review" → "Save"

7. Refresh your app - photos should now load!

---

## Issue 2: Recognition Not Working

You mentioned "recognition doesn't work, detection does work."

**This means:**
- ✅ Face detection is working (camera finds faces)
- ❌ Face recognition is failing (can't identify who it is)

**Possible causes:**

1. **No embeddings in database**
   - Check if embeddings were saved when you added the person
   - Look in Supabase `face_embeddings` table
   - Should have 4 rows (one per photo) for the person

2. **Backend not loading embeddings**
   - Check backend logs for errors
   - Backend needs to download embeddings from Supabase before recognition

3. **Local SQLite cache empty**
   - Backend caches embeddings in local `faces.db`
   - Check if `embeddings` table has data

**To debug:**
1. Open browser console
2. Look for recognition-related errors
3. Check backend terminal for logs
4. Verify embeddings exist in Supabase dashboard

---

## Public Enrollment Page Deployment

**Your question:** "Are we going to design it on other localhost and then upload to Vercel?"

**My recommendation:**

### For Development/Testing (Now):
✅ **Keep it on localhost:3000**
- Faster iteration
- Easy debugging
- No deployment delays
- Can test with local backend

### For Production (Later):
✅ **Deploy to Vercel**

**Deployment workflow:**
```bash
# 1. Test locally first
npm run dev  # Test at localhost:3000

# 2. Build for production
npm run build

# 3. Test production build locally
npm run preview

# 4. Deploy to Vercel
vercel --prod
```

**Vercel deployment is easy:**
1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel auto-deploys on every push
4. Get URL like: `https://facepace.vercel.app`

**Environment variables on Vercel:**
- Add `VITE_SUPABASE_URL`
- Add `VITE_SUPABASE_ANON_KEY`
- Vercel will inject them at build time

**Public enrollment page will work at:**
- Local: `http://localhost:3000/enroll/ABC123`
- Production: `https://facepace.vercel.app/enroll/ABC123`

**Backend stays local for now:**
- Your Mac runs the Python backend
- Frontend (Vercel) calls `http://127.0.0.1:8000` (won't work from other devices)
- Later: Deploy backend to Railway for remote access

---

## Summary

**Do this now:**
1. ✅ Fix storage policy (make photos public for testing)
2. ✅ Check if embeddings exist in Supabase
3. ✅ Keep developing on localhost
4. ✅ Deploy to Vercel later when ready

**Recognition issue:**
- Likely missing embeddings or backend not loading them
- Check backend logs and Supabase `face_embeddings` table

