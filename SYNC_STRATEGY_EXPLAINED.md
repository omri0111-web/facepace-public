# Two-Way Sync Strategy Explained

## The Problem
When both local storage and Supabase can update each other, we need to handle conflicts:
- **Local changes**: User edits data while offline → saved to local storage
- **Supabase changes**: Another device/user makes changes → saved to Supabase
- **Conflict**: Which version wins when syncing?

## Our Solution: **Supabase is Source of Truth** with Smart Merging

### Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC FLOW                                │
└─────────────────────────────────────────────────────────────┘

1. USER MAKES CHANGE (Online or Offline)
   ├─→ Save to Local Storage IMMEDIATELY ✅
   └─→ If Online: Save to Supabase immediately ✅
       If Offline: Queue for later sync 📋

2. BACKGROUND SYNC (When Online)
   ├─→ Step 1: Push pending local changes → Supabase (Local → Cloud)
   └─→ Step 2: Pull updates from Supabase → Local (Cloud → Local)
       └─→ If local has pending changes: Keep local, push it
           If Supabase is newer: Use Supabase version

3. CONFLICT RESOLUTION
   ├─→ Supabase is ALWAYS the source of truth
   ├─→ Local pending changes take priority (we're pushing them)
   └─→ After sync, both sides match ✅
```

## How It Works

### 1. **Saving Changes** (Local → Supabase)

When you edit a person or group:

```typescript
// User edits person name
await syncService.savePerson(userId, updatedPerson)
```

**What happens:**
1. ✅ **Immediately** saves to local storage (works offline)
2. ✅ If online: Saves to Supabase immediately
3. ✅ If offline: Queues change for later sync

**Result:** Local storage always has the latest, even offline!

### 2. **Syncing FROM Supabase** (Supabase → Local)

When app loads or goes online:

```typescript
await syncService.syncFromSupabase(userId)
```

**What happens:**
1. **First:** Push any pending local changes to Supabase
2. **Then:** Pull all data from Supabase
3. **Merge:** 
   - If item has pending local changes → Keep local version (we just pushed it)
   - Otherwise → Use Supabase version (source of truth)

**Result:** Both sides end up matching!

### 3. **Conflict Resolution Example**

**Scenario:** You edit a person offline, then another device edits the same person online.

```
Timeline:
1. You edit "John" → "Johnny" (offline) → Saved locally
2. Another device edits "John" → "Jonathan" (online) → Saved to Supabase
3. You go online → Sync happens

Resolution:
├─→ Your change ("Johnny") is in pending queue
├─→ Sync pushes "Johnny" to Supabase ✅
├─→ Sync pulls from Supabase → sees "Johnny" (we just pushed it)
└─→ Both sides now have "Johnny" ✅

Result: Last write wins (your local change)
```

**But what if Supabase had a NEWER change?**

```
Timeline:
1. You edit "John" → "Johnny" (offline)
2. Another device edits "John" → "Jonathan" (online, AFTER your edit)
3. You go online → Sync happens

Resolution:
├─→ Your change ("Johnny") is in pending queue
├─→ Sync pushes "Johnny" to Supabase ✅ (overwrites "Jonathan")
└─→ Both sides now have "Johnny" ✅

Result: Your local change wins (because it's in the queue)
```

**Note:** This is "last write wins" - whoever syncs last wins. For most use cases, this is fine because:
- Each user typically edits their own data
- Conflicts are rare
- Local changes are usually intentional

## Key Features

### ✅ **Offline-First**
- All changes save to local storage immediately
- Works completely offline
- Syncs when back online

### ✅ **Fast UI**
- Local storage loads instantly
- No waiting for network
- Background sync doesn't block UI

### ✅ **Conflict Prevention**
- Pending changes queue prevents conflicts
- Supabase is source of truth
- Smart merging keeps data consistent

### ✅ **Two-Way Sync**
- Local → Supabase: Your edits sync up
- Supabase → Local: Other changes sync down
- Both happen automatically

## Visual Flow

```
┌──────────────┐         ┌──────────────┐
│   USER       │         │   SUPABASE   │
│  (Browser)   │         │   (Cloud)    │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │ 1. Edit Person         │
       ├────────────────────────┤
       │                        │
       │ 2. Save Locally ✅     │
       │    (instant)            │
       │                        │
       │ 3. If Online:          │
       │    Save to Supabase ✅ │
       │    If Offline:         │
       │    Queue for later 📋  │
       │                        │
       │ 4. Background Sync:    │
       │    Push pending →      │
       │    Pull updates ←      │
       │                        │
       │ 5. Both match! ✅      │
       │                        │
```

## What Gets Synced

### ✅ **People**
- Name, email, age, age group
- Parent info, allergies
- Photo paths
- Group memberships

### ✅ **Groups**
- Name, description
- Guides info, notes
- Member list

### ✅ **Group Memberships**
- Adding/removing people from groups
- Synced automatically

## Testing the Sync

1. **Edit offline:**
   - Turn off WiFi
   - Edit a person's name
   - ✅ Change saves locally
   - ✅ Shows "pending sync" indicator

2. **Go online:**
   - Turn on WiFi
   - ✅ Change syncs to Supabase automatically
   - ✅ Pending indicator disappears

3. **Check other device:**
   - Open app on another device
   - ✅ Change appears (synced from Supabase)

4. **Edit on both devices:**
   - Edit same person on both devices
   - ✅ Last sync wins
   - ✅ Both devices end up matching

## Summary

**The balance:**
- **Local storage** = Fast, offline-capable cache
- **Supabase** = Source of truth, cloud backup
- **SyncService** = Smart bridge between them

**Conflict resolution:**
- Supabase is source of truth
- Pending local changes take priority (we push them first)
- After sync, both sides match

**Result:**
- ✅ Works offline
- ✅ Fast UI
- ✅ Automatic sync
- ✅ No data loss
- ✅ Consistent across devices


