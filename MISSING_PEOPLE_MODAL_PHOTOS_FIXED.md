# ✅ Missing People Modal Photos Fixed

## Error After Recording

When finishing a recording session and opening the "Missing People Modal", the app crashed with:

```
Uncaught ReferenceError: peoplePhotoUrls is not defined
  at App.tsx:896
  at MissingPeopleModal (App.tsx:888:28)
```

## Problem

The `MissingPeopleModal` component was trying to display actual photos in avatars using `peoplePhotoUrls[person.id]`, but this variable was **not being passed as a prop** from the parent component.

**In the component:**
```typescript
// Line 896 - Trying to use peoplePhotoUrls
{peoplePhotoUrls[person.id] ? (
  <img src={peoplePhotoUrls[person.id]} ... />
) : ...}
```

**But it wasn't in the props:**
```typescript
function MissingPeopleModal({
  isOpen,
  people,
  selectedGroup,
  // ❌ peoplePhotoUrls missing!
  // ❌ setViewingPhotosForPerson missing!
}) {
```

## Solution

### 1. Added Props to Component Definition

```typescript
function MissingPeopleModal({
  isOpen,
  people,
  selectedGroup,
  // ... other props ...
  peoplePhotoUrls,                    // ✅ Added
  viewingPhotosForPerson,             // ✅ Added
  setViewingPhotosForPerson,          // ✅ Added
}: {
  // ... other types ...
  peoplePhotoUrls: {[key: string]: string};
  viewingPhotosForPerson: Person | null;
  setViewingPhotosForPerson: (person: Person | null) => void;
}) {
```

### 2. Passed Props When Calling Component

```typescript
<MissingPeopleModal
  isOpen={showMissingPeopleModal}
  people={people}
  selectedGroup={selectedGroup}
  // ... other props ...
  peoplePhotoUrls={peoplePhotoUrls}                      // ✅ Added
  viewingPhotosForPerson={viewingPhotosForPerson}        // ✅ Added
  setViewingPhotosForPerson={setViewingPhotosForPerson}  // ✅ Added
/>
```

### 3. Updated Auto-Detected Section

Also updated the auto-detected people section to use actual photos:

```typescript
// Before:
{person.avatar ? (
  <img src={person.avatar} ... />
) : ...}

// After:
{peoplePhotoUrls[person.id] ? (
  <img src={peoplePhotoUrls[person.id]} ... />
) : person.avatar ? (
  <img src={person.avatar} ... />
) : ...}
```

## What's Fixed

✅ **Auto-Detected People** - Show actual photos in avatars  
✅ **Missing People List** - Show actual photos in avatars  
✅ **Photo Button (📷)** - Already present, now works correctly  
✅ **No More Crashes** - Modal opens without errors  

## Testing

1. **Start attendance** for a group
2. **Record faces** (let AI detect some people)
3. **Finish recording**
4. **Missing People Modal opens** - No errors!
5. **See actual photos** in both:
   - Auto-detected section (green background)
   - Missing people section (gray background)
6. **Click 📷** - Opens photo viewer with all 4 photos

## Files Changed

- `src/App.tsx`:
  - Added 3 props to `MissingPeopleModal` function definition
  - Added 3 props when calling `<MissingPeopleModal>`
  - Updated auto-detected avatars to use `peoplePhotoUrls`

---

**Status:** ✅ FIXED - Missing People Modal now displays photos correctly without crashing!


