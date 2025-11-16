# Environment Variables Setup

To connect your app to Supabase, you need to create a `.env.local` file in the project root with your Supabase credentials.

## Step 1: Create `.env.local` file

In the project root directory (same level as `package.json`), create a new file called `.env.local`:

```bash
# From your terminal in the project root:
touch .env.local
```

## Step 2: Add your Supabase credentials

Open `.env.local` in your text editor and add these lines:

```env
# Supabase Configuration
# Get these from your Supabase Dashboard -> Settings -> API
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here

# Backend API URL
# For local development, use localhost
# After deploying to Railway, update this to your Railway URL
VITE_RAILWAY_API_URL=http://localhost:8000
```

## Step 3: Get your Supabase values

1. Go to your Supabase project dashboard (https://app.supabase.com)
2. Click on your project
3. Go to **Settings** (gear icon) → **API**
4. Copy the following values:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **anon public** key → this is your `VITE_SUPABASE_ANON_KEY`

## Step 4: Restart your dev server

After creating/updating `.env.local`, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Start it again:
npm run dev
```

## Example `.env.local` file

Here's what it looks like with example values (yours will be different):

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjg3ODk5OCwiZXhwIjoxOTMyNDU0OTk4fQ.example_key_string_here
VITE_RAILWAY_API_URL=http://localhost:8000
```

## Important Notes

⚠️ **Security:**
- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `anon` key is safe for frontend use - it's public
- Never put the `service_role` key in frontend code!

🔧 **Troubleshooting:**
- If you get "Missing Supabase configuration" error, check:
  - File is named exactly `.env.local` (starts with a dot)
  - File is in project root (not in `src/` folder)
  - Dev server was restarted after creating the file
  - Values are correct (no extra spaces, quotes, or line breaks)

💡 **For Production (Vercel):**
When you deploy to Vercel, you'll add these same variables in the Vercel dashboard under:
**Project Settings** → **Environment Variables**

You don't commit `.env.local` to git, so Vercel needs them separately!


