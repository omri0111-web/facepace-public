# Enrollment Quality Plan - Fresh Start

## Backend Capabilities (What We Have)

### `/photo/quality` Endpoint
- **Input**: Base64 image
- **Output**: 
  ```json
  {
    "metrics": {
      "face_width_px": number,
      "sharpness": number,
      "brightness": number,
      "contrast": number,
      "roll_abs": number | null
    },
    "passed": boolean,
    "reasons": string[]
  }
  ```

### Quality Criteria (Backend Enforces)
- ✅ Face width ≥ 120 px (hard fail if < 120)
- ✅ Sharpness ≥ 100 (hard fail if < 100)
- ✅ Brightness: 60-200 (hard fail if outside)
- ✅ Contrast ≥ 30 (hard fail if < 30)
- ⚠️ Roll ≤ 10° (warning only, not blocking)

### `/enroll` Endpoint
- **Enforces quality**: Returns 400 if photo doesn't pass
- **Error format**: `{ message, metrics, reasons }`

## Requirements

1. **Check quality BEFORE enrollment** - Never try to enroll bad photos
2. **Visual feedback per photo** - Show pass/fail badge with reasons
3. **Require ≥3 passing photos** - Block enrollment until met
4. **Clear error messages** - Show backend reasons directly
5. **Simple flow** - No complex multi-step logic

## Implementation Plan

### 1. AddPersonModal.tsx Changes

#### State Management
```typescript
// For each photo (captured or uploaded)
interface PhotoWithQuality {
  dataURL: string;
  qualityCheck: {
    passed: boolean;
    reasons: string[];
    metrics: {
      face_width_px: number;
      sharpness: number;
      brightness: number;
      contrast: number;
      roll_abs: number | null;
    };
  } | null; // null = not checked yet
  imageElement?: HTMLImageElement;
}

const [photos, setPhotos] = useState<PhotoWithQuality[]>([]);
```

#### Photo Capture/Upload Flow
1. User captures/uploads photo → Add to `photos` array with `qualityCheck: null`
2. Immediately call `/photo/quality` → Update `qualityCheck` with result
3. Show badge next to photo: ✅ "Good" or ❌ "Needs improvement" + reasons

#### Enrollment Button Logic
- Disabled until: `photos.filter(p => p.qualityCheck?.passed).length >= 3`
- When clicked: Only enroll photos where `qualityCheck.passed === true`

#### Visual Feedback
- Green badge ✅ for passed photos
- Red badge ❌ for failed photos with reason list
- Show metrics in tooltip/hover

### 2. PeoplePanel.tsx Changes

#### Photo Management
- Same quality check flow when adding photos
- Show quality status for existing photos (if stored)
- Photo Quality Summary panel showing:
  - Total photos
  - Passing photos count
  - Average metrics (width, sharpness, etc.)

### 3. BackendRecognitionService.ts
- Already has `scorePhotoQuality()` ✅
- Already handles 400 errors from `/enroll` ✅
- No changes needed

## UI Components Needed

### Photo Quality Badge Component
```tsx
function PhotoQualityBadge({ qualityCheck }: { qualityCheck: PhotoWithQuality['qualityCheck'] }) {
  if (!qualityCheck) return <Badge>Checking...</Badge>;
  if (qualityCheck.passed) return <Badge variant="success">✅ Good</Badge>;
  return (
    <Badge variant="error">
      ❌ Needs improvement
      <ul>
        {qualityCheck.reasons.map(r => <li key={r}>{r}</li>)}
      </ul>
    </Badge>
  );
}
```

### Photo Gallery with Quality Status
- Thumbnail + Badge for each photo
- Remove button for bad photos
- Highlight passing photos

## Files to Modify

1. `src/components/AddPersonModal.tsx`
   - Replace current validation logic with backend quality checks
   - Add photo gallery with quality badges
   - Only enroll passing photos

2. `src/components/PeoplePanel.tsx`
   - Same quality check flow
   - Photo Quality Summary panel

3. `src/services/BackendRecognitionService.ts`
   - Already correct ✅

## Testing Checklist

- [ ] Capture photo → Shows quality check immediately
- [ ] Upload photo → Shows quality check immediately
- [ ] Bad photo → Shows red badge with reasons
- [ ] Good photo → Shows green badge
- [ ] <3 passing photos → Enroll button disabled
- [ ] ≥3 passing photos → Enroll button enabled
- [ ] Enrollment only uses passing photos
- [ ] Error messages match backend reasons

