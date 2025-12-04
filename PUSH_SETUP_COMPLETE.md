# Dual-Repo Push Setup - COMPLETE ✅

## What We Did

1. ✅ Added `facepace-public` as a second remote called `public`
2. ✅ Created `push-both.sh` script to push to both repos at once
3. ✅ Updated `.gitignore` to exclude large files (Banuba, demos, Unity, etc.)
4. ✅ Deleted old problematic branches (`test-online-local`, `test-online-temp`)
5. ✅ Committed the setup files

## Your Current Branch

You're on: **`test-online-clean`**  
This branch is CLEAN (no Banuba files) and has all your new code.

## How to Push to Both Repos

From your own terminal (not Cursor's), run:

```bash
cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"

# Push to both repos
./push-both.sh
```

This will:
1. Push `test-online-clean` to FacePace repo (as `test-online-clean` branch)
2. Push `test-online-clean` to facepace-public repo (as `main` branch)
3. Trigger Vercel to deploy from facepace-public/main

## Verify It Worked

After running `./push-both.sh`, check:

### 1. FacePace repo on GitHub
https://github.com/omri0111-web/FacePace/tree/test-online-clean

Should show:
- Commit: "Add dual-repo push script and update gitignore"
- Files: push-both.sh, updated .gitignore

### 2. facepace-public repo on GitHub  
https://github.com/omri0111-web/facepace-public

Should show:
- Same commit as above
- All your new SmartCamera, PublicEnrollmentPage, grading files

### 3. Vercel deployment
Check your Vercel dashboard → FacePace Public → Deployments

Should see:
- New deployment from `main` branch
- Building or Ready status

### 4. Test live site
https://facepace-public.vercel.app/enroll/[user-id]/[group-id]

Should see:
- New camera UI with floating `0 / 4` counter
- 3D "Take photo" button
- Stricter quality checks (face must be 32% of frame)
- Review screen with person details after 4 photos

## Your New Workflow (Simple!)

```bash
# 1. Make changes to your code
# (edit SmartCamera.tsx, PublicEnrollmentPage.tsx, etc.)

# 2. Commit locally
git add .
git commit -m "Description of your changes"

# 3. Push to both repos
./push-both.sh

# 4. Verify on GitHub and Vercel (links above)
```

## What's Different Now

**Before**: 
- Manual syncing between repos
- Large file errors blocking pushes
- Cherry-picking commits
- Confusing branch management

**Now**:
- One command (`./push-both.sh`) updates everything
- Clean branch (no Banuba files)
- Automatic Vercel deployment
- Simple workflow

## Branches Cleaned Up

Deleted:
- ❌ `test-online-local` (had Banuba files)
- ❌ `test-online-temp` (not needed)

Keeping:
- ✅ `test-online-clean` (your main working branch)

## Files Added/Modified

- `push-both.sh` - Script to push to both repos
- `.gitignore` - Excludes large files (faces/, demos/, Banuba, Unity, etc.)

## Next Steps

1. Open your own terminal (not Cursor)
2. Run: `cd "/Users/omrishamai/Desktop/Attendance App Design (admin)new"`
3. Run: `./push-both.sh`
4. Check the verification links above
5. Test the live enrollment page

That's it! From now on, just use `./push-both.sh` whenever you want to deploy changes.



