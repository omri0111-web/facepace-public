# Supabase Setup Guide

Follow these steps to set up your Supabase backend for FacePace.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if required

## Step 2: Create New Project

1. Click "New Project"
2. Fill in:
   - **Project name**: `facepace` (or your preferred name)
   - **Database password**: Generate a strong password (save it securely!)
   - **Region**: Choose closest to you (e.g., `us-west-1` for California)
   - **Pricing plan**: Free
3. Click "Create new project"
4. Wait 2-3 minutes for project to initialize

## Step 3: Run Database Schema

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste into the SQL editor
5. Click "Run" button (or press Cmd+Enter / Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates all the necessary tables, indexes, and security policies.

## Step 4: Set Up Storage Bucket

1. Click "Storage" in the left sidebar
2. Click "Create a new bucket"
3. Name it: `face-photos`
4. Set to **Private** (important for security)
5. Click "Create bucket"

### Configure Storage Policies

1. Click on the `face-photos` bucket
2. Click "Policies" tab
3. Click "New policy" → "For full customization"
4. Add these three policies:

**Policy 1: Upload to own folder**
```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: View own photos**
```sql
CREATE POLICY "Users can view own photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 3: Delete own photos**
```sql
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'face-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Step 5: Configure Authentication

1. Click "Authentication" in the left sidebar
2. Click "Providers"
3. Ensure "Email" is enabled (it should be by default)
4. Optional: Configure email templates under "Email Templates"
5. Under "URL Configuration":
   - Add `http://localhost:3000` for local development
   - Add `http://127.0.0.1:3000` for local development (alternative)
   - Later add your Vercel URL: `https://yourapp.vercel.app`

## Step 6: Get Your API Keys

1. Click "Settings" (gear icon) in the left sidebar
2. Click "API" under Project Settings
3. You'll see:
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)
   - **service_role key**: `eyJhbG...` (long string - keep secret!)

### Save these values:

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Backend API (will be Railway URL after deployment)
VITE_RAILWAY_API_URL=http://localhost:8000
```

**IMPORTANT**: 
- Never commit the `service_role` key to git!
- Only use `service_role` key in your backend (Railway)
- Use `anon` key in your frontend (Vercel)

## Step 7: Test Database Connection

Once you've set up the frontend (next steps), you can test the connection:

1. Run `npm install` to install dependencies (includes @supabase/supabase-js)
2. Run `npm run dev` to start the frontend
3. Open http://localhost:3000
4. Try to sign up with an email and password
5. Check Supabase Dashboard → Authentication → Users
6. You should see your new user!

## Local Development with Supabase

### Option A: Use Online Supabase (Recommended for now)
- Your local app connects to online Supabase
- Data persists even if you restart
- Works for testing

### Option B: Run Supabase Locally (Advanced)
If you want fully offline development:

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase (includes database + storage + auth)
supabase start

# This runs on http://localhost:54321
```

Then update `.env.local`:
```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<local_anon_key_shown_in_terminal>
```

## Troubleshooting

### "Failed to connect to Supabase"
- Check your `.env.local` file exists and has correct values
- Restart your dev server: `npm run dev`
- Check Supabase project is not paused (free projects pause after 1 week inactivity)

### "Row Level Security policy violation"
- Make sure you ran the entire `supabase-schema.sql` file
- Check the SQL Editor for any errors
- RLS policies must be created for users to access data

### "Storage bucket not found"
- Make sure you created the `face-photos` bucket
- Check bucket name is exactly `face-photos` (case sensitive)
- Verify bucket policies are set up

### "Authentication not working"
- Check URL Configuration includes your localhost URL
- Make sure email provider is enabled
- Check browser console for specific errors

## What's Next?

After Supabase is set up:
1. The frontend will automatically connect using the `.env.local` configuration
2. User authentication will work (sign up, login, logout)
3. Data will be stored in your Supabase database
4. Photos will be uploaded to Supabase Storage
5. Face recognition will still use your local backend (Python)

Later, we'll deploy:
- Frontend → Vercel (will use same Supabase)
- Backend → Railway (will also use same Supabase)


