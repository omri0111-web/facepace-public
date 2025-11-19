# ✅ React Hooks Order Fixed

## Error

```
Warning: React has detected a change in the order of Hooks called by App.
This will lead to bugs and errors if not fixed.

ReferenceError: Cannot access 'selectedGroup' before initialization
```

## Problem

When I added the new state variables for photo viewing, I accidentally placed them **in the middle of the component** instead of at the **top with all other useState declarations**.

**Bad (caused error):**
```typescript
function App() {
  // ... some state at top
  const [showPersonDetails, setShowPersonDetails] = useState(false);
  
  // ❌ Some functions here...
  const handleUpdatePerson = () => { ... }
  
  // ❌ WRONG PLACE - State added in middle!
  const [people, setPeople] = useState<Person[]>([]);
  const [peoplePhotoUrls, setPeoplePhotoUrls] = useState({});
  
  // ❌ useEffect that uses selectedGroup before it's defined
  useEffect(() => {
    if (!selectedGroup) return; // ERROR: selectedGroup not defined yet!
  }, []);
}
```

## Solution

**React Rules of Hooks:**
1. ✅ All hooks must be at the **TOP** of the component
2. ✅ All hooks must be called in the **SAME ORDER** every render
3. ✅ Never add hooks after conditional code or functions

**Fixed:**
```typescript
function App() {
  // ✅ ALL state declarations at the top
  const [showPersonDetails, setShowPersonDetails] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [peoplePhotoUrls, setPeoplePhotoUrls] = useState({});
  const [viewingPhotosForPerson, setViewingPhotosForPerson] = useState(null);
  const [viewingPersonAllPhotos, setViewingPersonAllPhotos] = useState([]);
  
  // ✅ Then functions
  const handleUpdatePerson = () => { ... }
  
  // ✅ Then useEffects
  useEffect(() => {
    if (!selectedGroup) return; // ✅ selectedGroup is now defined!
  }, []);
}
```

## What I Changed

### 1. Moved State Declarations to Top
**Before:**
- Line 1925: `showCameraGuide` state
- Line 1973-1978: NEW states (❌ wrong place!)

**After:**
- Line 1925: `showCameraGuide` state
- Line 1928-1933: NEW states (✅ right after!)
- Removed duplicate declarations from middle

### 2. Moved useEffect Hooks After Variable Definitions
**Problem:**
- useEffect hooks at line 2085 and 2123 used `selectedGroup`
- But `selectedGroup` wasn't defined until line 2173!

**Fixed:**
- Moved both useEffect hooks to **AFTER** `selectedGroup` is defined
- Now at lines 2118 and 2157 (after line 2116 where `selectedGroup` is defined)

### 3. Files Modified
- `src/App.tsx` - Moved 6 state declarations to top of component
- `src/App.tsx` - Moved 2 useEffect hooks to after `selectedGroup` definition

## Why This Matters

**React's Hook System:**
- React tracks hooks by their **call order**, not their names
- If the order changes between renders, React gets confused
- This causes the "order of Hooks" warning

**Example:**
```typescript
// Render 1:
useState() // Hook #1
useState() // Hook #2
useEffect() // Hook #3

// Render 2 (if order changes):
useState() // Hook #1
useEffect() // ❌ Hook #2 (React expects useState!)
useState() // ❌ Hook #3 (React expects useEffect!)
```

## Testing

1. **Refresh the page** - No more warnings!
2. **Check console** - No errors about hooks order
3. **Open attendance screen** - Photos load correctly
4. **Click 📷** - Photo viewer works

---

**Status:** ✅ FIXED - All hooks are now in the correct order!

**Reference:** https://reactjs.org/link/rules-of-hooks

