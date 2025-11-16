# FacePace Deployment Guide

This guide will walk you through deploying your FacePace application to the internet.

## Prerequisites

Before you start, make sure you have:

- ✅ Completed Supabase setup (see `SUPABASE_SETUP.md`)
- ✅ Tested the app locally and it works
- ✅ A GitHub account
- ✅ Your code pushed to GitHub

## Deployment Architecture

```
User Browser
     ↓
Vercel (Frontend - Free)
     ↓           ↓
Supabase    Railway (Backend - $5/month free credit)
(Free)
```

## Step 1: Prepare Your Code

### 1.1 Make sure everything is committed

```bash
# Check what branch you're on
git branch

# You should be on 'test' branch or create it
git checkout -b test  # If it doesn't exist
# OR
git checkout test  # If it exists

# Commit all changes
git add .
git commit -m "Prepare for deployment"
```

### 1.2 Push to GitHub

```bash
# Push test branch to GitHub
git push origin test

# If this is your first push of this branch:
git push --set-upstream origin test
```

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account

1. Go to https://railway.app
2. Click "Login" → "Login with GitHub"
3. Authorize Railway to access your GitHub
4. You'll get $5 free credit (renews monthly)

### 2.2 Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Select your FacePace repository
4. Railway will ask which branch to deploy from:
   - Select **`test`** branch (not main!)

### 2.3 Configure Build Settings

Railway should auto-detect it's a Python project. If not:

1. Click on your service
2. Go to "Settings" tab
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty, uses requirements.txt automatically)
   - **Start Command**: Should auto-fill with `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2.4 Add Environment Variables

1. Click on your service
2. Go to "Variables" tab
3. Add these variables:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here
ALLOWED_ORIGINS=https://yourapp.vercel.app,http://localhost:3000
```

**Where to get these values:**
- `SUPABASE_URL`: From Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_KEY`: From Supabase Dashboard → Settings → API → service_role key (⚠️ secret!)
- `ALLOWED_ORIGINS`: Use your Vercel URL (we'll get this in Step 3)

⚠️ **Important**: Use `service_role` key for backend, NOT the `anon` key!

### 2.5 Deploy

1. Railway will automatically deploy after you add variables
2. Click on "Deployments" tab to watch progress
3. Should take 3-5 minutes to build
4. Once done, click on "Settings" → "Domains"
5. Click "Generate Domain"
6. You'll get a URL like: `https://facepace-production-xyz.up.railway.app`
7. **Save this URL** - you'll need it for frontend!

### 2.6 Test Backend

Open your Railway URL in browser:
```
https://your-backend-url.up.railway.app/
```

You should see: `{"message": "FacePace Backend API"}`

If you see an error, check:
- Deployment logs in Railway dashboard
- Environment variables are set correctly
- Requirements.txt includes all dependencies

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account

1. Go to https://vercel.com
2. Click "Sign Up" → "Continue with GitHub"
3. Authorize Vercel
4. Completely free for personal projects!

### 3.2 Import Project

1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Vercel will detect it's a Vite project

### 3.3 Configure Build Settings

Vercel should auto-detect everything. Verify:

- **Framework Preset**: Vite
- **Root Directory**: `./` (project root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 3.4 Add Environment Variables

Before clicking Deploy, add these environment variables:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
VITE_RAILWAY_API_URL=https://your-railway-url.up.railway.app
```

**Where to get these values:**
- `VITE_SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API → anon public key
- `VITE_RAILWAY_API_URL`: The Railway URL you got in Step 2.5

⚠️ **Important**: Use `anon` key for frontend, NOT the `service_role` key!

### 3.5 Deploy

1. Click "Deploy"
2. Wait 1-2 minutes for build
3. Once done, you'll get a URL like: `https://yourapp.vercel.app`
4. Click on the URL to open your app!

### 3.6 Update Railway CORS

Now that you have your Vercel URL, go back to Railway:

1. Open Railway dashboard
2. Go to your backend service → Variables
3. Update `ALLOWED_ORIGINS`:
   ```
   ALLOWED_ORIGINS=https://yourapp.vercel.app,http://localhost:3000
   ```
4. Save (Railway will redeploy)

### 3.7 Update Supabase Allowed Domains

1. Go to Supabase Dashboard
2. Click "Authentication" → "URL Configuration"
3. Add these URLs to "Site URL":
   ```
   https://yourapp.vercel.app
   ```
4. Add to "Redirect URLs":
   ```
   https://yourapp.vercel.app/**
   ```

## Step 4: Test Your Deployed App

### 4.1 Test Authentication

1. Open your Vercel URL: `https://yourapp.vercel.app`
2. You should see the login page
3. Click "Sign up"
4. Enter email and password
5. Should create account and log you in!

**Troubleshooting:**
- If you see Supabase errors, check environment variables in Vercel
- If signup doesn't work, check Supabase Authentication settings
- Check browser console (F12) for error messages

### 4.2 Test Adding a Person

1. Click "People" from welcome screen
2. Click "Add Person"
3. Enter name and details
4. Take photos with camera
5. Save person

**Troubleshooting:**
- If camera doesn't work, make sure you allowed camera permissions
- If photos don't upload, check Supabase Storage is set up correctly
- If face recognition fails, check Railway backend is running

### 4.3 Test Face Recognition

1. Create a group
2. Add the person you created to the group
3. Start face recognition
4. Point camera at the person
5. Should recognize them!

**Troubleshooting:**
- If recognition doesn't work, check Railway logs
- Make sure `VITE_RAILWAY_API_URL` is correct in Vercel
- Check network tab (F12) for failed requests

## Step 5: Configure Custom Domain (Optional)

### 5.1 Buy a Domain

Buy from:
- Namecheap ($10-15/year)
- Google Domains
- GoDaddy
- Cloudflare

### 5.2 Add to Vercel

1. In Vercel project settings
2. Go to "Domains"
3. Click "Add"
4. Enter your domain: `yourapp.com`
5. Follow DNS instructions
6. Wait 5-30 minutes for DNS propagation
7. Done! Your app is now at `yourapp.com`

### 5.3 Update CORS

Update Railway `ALLOWED_ORIGINS`:
```
ALLOWED_ORIGINS=https://yourapp.com,https://yourapp.vercel.app,http://localhost:3000
```

Update Supabase allowed URLs to include `yourapp.com`

## Step 6: Set Up Auto-Deployment

### 6.1 Vercel Auto-Deploy

Vercel automatically redeploys when you push to GitHub!

```bash
# Make changes to code
git add .
git commit -m "Added new feature"
git push origin test

# Vercel automatically deploys within 1-2 minutes!
```

### 6.2 Railway Auto-Deploy

Railway also auto-deploys on push!

```bash
# Same as above - push to test branch
git push origin test

# Both Vercel AND Railway will deploy automatically!
```

## Step 7: Monitor Your Deployments

### Monitor Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project
3. See:
   - Deployment history
   - Build logs
   - Visitor analytics
   - Performance metrics

### Monitor Railway

1. Go to https://railway.app
2. Click on your project
3. See:
   - Deployment logs
   - Resource usage (CPU, memory)
   - Free credit remaining
   - Request metrics

### Monitor Supabase

1. Go to https://app.supabase.com
2. Click on your project
3. See:
   - Database size
   - Storage usage
   - Active users
   - API requests

## Troubleshooting Common Issues

### "Failed to fetch" errors

**Problem:** Frontend can't reach backend

**Solution:**
1. Check `VITE_RAILWAY_API_URL` in Vercel environment variables
2. Make sure Railway backend is deployed and running
3. Check CORS settings in Railway
4. Check Railway logs for errors

### "Authentication error"

**Problem:** Can't sign up or login

**Solution:**
1. Check Supabase environment variables in Vercel
2. Make sure you're using `anon` key (not `service_role`)
3. Check Supabase Authentication is enabled
4. Check allowed redirect URLs in Supabase

### "Row Level Security policy violation"

**Problem:** Can't create/read data

**Solution:**
1. Make sure you ran the entire `supabase-schema.sql`
2. Check RLS policies are enabled
3. Make sure user is logged in
4. Check user_id is being passed correctly

### Railway "Out of memory"

**Problem:** Backend crashes with memory error

**Solution:**
1. Face recognition uses lots of memory
2. Upgrade Railway plan ($5-10/month for more memory)
3. Or optimize model settings (use smaller detection size)

### Photos not loading

**Problem:** Photos show broken images

**Solution:**
1. Check Supabase Storage bucket exists (`face-photos`)
2. Check storage RLS policies
3. Check photo URLs are being saved correctly
4. Check browser console for 403/404 errors

## Cost Breakdown

### Current Usage (Free Tier)

- **Vercel**: $0/month (free forever for personal projects)
- **Supabase**: $0/month (free tier: 500MB DB + 1GB storage)
- **Railway**: $0/month (first $5 free credit/month)
- **Total**: $0/month

### When You Need to Upgrade

**Railway runs out of free credit (with heavy usage):**
- Upgrade to Hobby plan: $5/month
- Includes more CPU and memory for face recognition

**Supabase exceeds free tier (100+ users, lots of photos):**
- Pro plan: $25/month
- Includes 8GB database + 100GB storage

**Domain (optional):**
- $10-15/year one-time cost

**Total when scaled up:** ~$30-35/month for 100+ users

## Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Use different keys for dev and production
- Store secrets in Vercel/Railway environment variables
- Never commit `.env.local` to git

❌ **DON'T:**
- Put secrets in code
- Share `service_role` key publicly
- Use same keys for testing and production

### 2. Supabase Security

✅ **DO:**
- Keep RLS policies enabled
- Use `anon` key in frontend
- Use `service_role` key ONLY in backend
- Regularly review user access

❌ **DON'T:**
- Disable RLS policies
- Share database password
- Give `service_role` key to frontend

### 3. Backend Security

✅ **DO:**
- Keep CORS restricted to your domains
- Validate all inputs
- Rate limit face recognition endpoints
- Monitor for unusual activity

❌ **DON'T:**
- Allow CORS from `*` (all domains)
- Trust user input without validation
- Expose internal errors to users

## Next Steps

Now that you're deployed:

1. ✅ **Test thoroughly** - Try all features online
2. ✅ **Invite users** - Share your app URL
3. ✅ **Monitor usage** - Check Vercel/Railway/Supabase dashboards
4. ✅ **Add features** - Keep building and pushing to test branch
5. ✅ **Merge to main** - When everything works, merge test → main

```bash
# When ready to make test branch your stable version:
git checkout main
git merge test
git push origin main

# You can then point Vercel/Railway to deploy from main instead
```

## Getting Help

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Supabase Docs**: https://supabase.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **InsightFace Docs**: https://github.com/deepinsight/insightface

Happy deploying! 🚀


