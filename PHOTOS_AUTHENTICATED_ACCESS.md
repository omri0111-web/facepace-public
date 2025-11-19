# Photos: Authenticated Access Fixed

## Problem
Photos stored in Supabase Storage were returning **400 (Bad Request)** errors because they're stored in private user folders requiring authentication.

**Error:**
```
GET https://ytoqfqqnpivalkjxfvvn.supabase.co/storage/v1/object/public/face-photos/
  eb2d384f-a002-4b52-901f-7792d04fde4f/283e74cb-fade-4297-8568-cdc1a7341248/photo_1.jpg
  400 (Bad Request)
```

## Solution: Signed URLs

Photos now use **signed URLs** (temporary authenticated links) that expire in 1 hour.

### What Changed

#### 1. **SupabaseDataService** - New Methods

Added methods to generate signed URLs:

```typescript
// Get signed URL for a single photo
async getPersonPhotoSignedUrl(photoUrl: string): Promise<string>

// Get signed URLs for all photos
async getPersonPhotosSignedUrls(photoPaths: string[]): Promise<string[]>
```

**How it works:**
```typescript
// Extract path from public URL
const path = photoUrl.split('/face-photos/')[1]
// => "userId/personId/photo_1.jpg"

// Create signed URL (expires in 3600 seconds = 1 hour)
const { data } = await supabase.storage
  .from('face-photos')
  .createSignedUrl(path, 3600)

return data?.signedUrl
// => "https://xxx.supabase.co/storage/v1/object/sign/face-photos/...?token=abc123"
```

#### 2. **PeoplePanel** - Load Signed URLs

When you open "Manage Photos" for a person:

1. **Load signed URLs** for all photos
2. Store them in `signedPhotoUrls` state
3. Use signed URLs for display and quality checks

```typescript
// Load signed URLs when opening photo management
useEffect(() => {
  if (!editingPhotos) return;
  
  const loadPhotosAndMetrics = async () => {
    // Get signed URLs for all photos
    const signedUrls = await supabaseDataService
      .getPersonPhotosSignedUrls(editingPhotos.photoPaths!);
    
    // Map public URL -> signed URL
    const urlMap: {[key: string]: string} = {};
    editingPhotos.photoPaths!.forEach((publicUrl, index) => {
      urlMap[publicUrl] = signedUrls[index];
    });
    setSignedPhotoUrls(urlMap);
    
    // Then load quality metrics using signed URLs...
  };
  
  loadPhotosAndMetrics();
}, [editingPhotos?.id, editingPhotos?.photoPaths]);
```

#### 3. **Photo Display** - Use Signed URLs

```tsx
<img
  src={signedPhotoUrls[photoPath] || photoPath}
  alt={`Photo ${index + 1}`}
  className="w-full h-full object-cover rounded-lg"
/>
```

**Fallback:** If signed URL isn't loaded yet, it tries the public URL.

## Storage Architecture

```
Supabase Storage: face-photos
├── {userId}/                    (Private - user can only access their own)
│   ├── {personId}/
│   │   ├── photo_1.jpg         (400 without auth)
│   │   ├── photo_2.jpg         (400 without auth)
│   │   └── ...
│   └── ...
└── pending/                     (Restricted - for enrollment)
    └── {pendingId}/
        └── ...
```

### Access Methods

| Method | URL Type | When to Use |
|--------|----------|-------------|
| **Public URL** | `getPublicUrl()` | ❌ Won't work for private folders |
| **Signed URL** | `createSignedUrl()` | ✅ Temporary authenticated access |

## Photos Flow

### Upload (Direct Add)
```
1. User adds person
   └─> Frontend takes 4 photos
       └─> Base64 encode photos
           └─> Send to Backend /enroll_person_direct
               └─> Backend uploads to Supabase Storage:
                   userId/personId/photo_1.jpg (private)
               └─> Returns public URLs
                   └─> Frontend stores URLs in person.photoPaths
```

### Display (Authenticated)
```
1. User clicks "Manage Photos"
   └─> Frontend fetches signed URLs
       (supabaseDataService.getPersonPhotosSignedUrls)
       └─> Supabase generates temporary tokens
           └─> Returns signed URLs (valid 1 hour)
               └─> Frontend displays photos
                   └─> Frontend runs quality checks
```

## Photo Quality Metrics

Now work correctly with signed URLs:

```typescript
// Load signed URL
const signedUrl = urlMap[publicUrl];

// Load image from signed URL
const img = new Image();
img.src = signedUrl;

// Convert to base64
const canvas = document.createElement('canvas');
ctx.drawImage(img, 0, 0);
const dataURL = canvas.toDataURL('image/jpeg', 0.9);

// Send to backend for quality analysis
const quality = await backendRecognitionService.scorePhotoQuality(dataURL);
```

## Security Benefits

✅ **Private by default** - Photos not publicly accessible  
✅ **User isolation** - Users can only see their own photos  
✅ **Temporary access** - Signed URLs expire after 1 hour  
✅ **No token in URL** - Public URLs fail, signed URLs required  

## What You'll See

### ✅ Working Now
- Photos display in "Manage Photos" modal
- Photo quality metrics show correctly
- No more 400 errors in console

### ⚠️ Avatars in List
- Currently use **dicebear** generated avatars
- Not loading actual photos (to avoid bulk signed URL requests)
- This is intentional for performance

**Why?**
- Loading signed URLs for 1000 people = 1000 API calls
- Avatars are small, don't need high-res photos
- Main photo viewing happens in "Manage Photos"

## Future Improvements (Optional)

1. **Cache signed URLs** in IndexedDB (persist across page loads)
2. **Lazy load signed URLs** for avatars (only visible ones)
3. **Longer expiry** (e.g., 24 hours instead of 1 hour)

## Testing

1. **Open People Panel**
   - Avatars show dicebear
   
2. **Click person → "Manage Photos"**
   - Photos load (no 400 errors)
   - Quality metrics appear
   
3. **Check Console**
   - No 400 errors
   - See: "Loading photos and metrics..."

---

**Status:** ✅ FIXED - Photos now use authenticated access with signed URLs!


