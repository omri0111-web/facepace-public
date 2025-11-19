# Clear Local Storage and Sync from Supabase

## Quick Fix - Run in Browser Console

1. **Open browser console** (F12 or right-click → Inspect → Console)

2. **Copy and paste this command:**

```javascript
// Clear all FacePace local storage
localStorage.removeItem('facepace_people');
localStorage.removeItem('facepace_groups');
localStorage.removeItem('facepace_last_sync');
localStorage.removeItem('facepace_user_id');
localStorage.removeItem('facepace_pending_changes');
console.log('✅ Cleared all local storage');
// Reload the page
location.reload();
```

3. **Press Enter**

4. **Page will reload** and fetch fresh data from Supabase

## What This Does

- Deletes all cached local data
- Forces app to fetch from Supabase
- You should see "test 1, test 2, test 3" groups

## If It Still Shows Wrong Data

Then the issue is:
1. **Not connected to internet** - The logs show "📵 Offline - Using cached data only"
2. **Or Supabase has wrong data** - Need to check Supabase dashboard

## Check Supabase Data

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to "Table Editor" → "groups"
4. Look for `user_id = eb2d384f-a002-4b52-901f-7792d04fde4f`
5. See what groups are there

## Alternative: Use DevTools

1. F12 → Application tab → Local Storage → http://localhost:3000
2. Delete all keys starting with `facepace_`
3. Refresh page


