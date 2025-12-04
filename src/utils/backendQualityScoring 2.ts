export interface BackendPhotoMetrics {
  faceWidthPx: number;
  sharpness: number;
  brightness: number;
  contrast: number;
  passed: boolean;
}

export interface BackendQualitySummary {
  overallScore: number;
  /**
   * Best single-photo score (0–100) among the considered photos.
   * This answers "what is my strongest example for recognition?"
   */
  bestPhotoScore: number;
  /**
   * Average score (0–100) of the considered photos.
   * Typically computed over "good" photos (e.g. >= 70), falling back to all
   * photos if none are good. This answers "how good is the set overall?"
   */
  avgPhotoScore: number;
  passedCount: number;
  totalPhotos: number;
  avgWidthPx: number;
  minWidthPx: number;
  avgSharpness: number;
  bestSharpness: number;
  avgBrightness: number;
  avgContrast: number;
}

function scorePhotoInternal(photo: BackendPhotoMetrics): number {
  const width = photo.faceWidthPx || 0;
  const sharp = photo.sharpness || 0;
  const bright = photo.brightness || 0;
  const contrast = photo.contrast || 0;

  /**
   * We want this score to reflect how useful the photo is for face recognition.
   * The most important factors are:
   * - Face size / resolution
   * - Sharpness / focus
   * with brightness and contrast acting mainly as gates with moderate weight.
   *
   * We normalise each metric into a partial score and sum to ~100:
   * - sizeScore:      0–35   (160px face width or more ≈ full credit)
   * - sharpnessScore: 0–35   (200+ sharpness ≈ full credit)
   * - brightnessScore:0–15   (good if within [60, 200] and near 130)
   * - contrastScore:  0–15   (good if contrast >= 50)
   *
   * Photos that backend already flagged as failed (`passed === false`)
   * receive a small additional penalty so they sit lower in rankings.
   */

  // Face size score (0–35): width of the face in pixels
  const sizeScore = Math.min(35, (width / 160) * 35); // 160px ≈ full size credit

  // Sharpness score (0–35): threshold ~100, good is 200+
  const sharpnessScore = Math.min(35, (sharp / 200) * 35);

  // Brightness score (0–15): ideal is ~130 (middle of 60–200)
  let brightnessScore = 0;
  if (bright >= 60 && bright <= 200) {
    brightnessScore = Math.min(
      15,
      15 - (Math.abs(bright - 130) / 130) * 15
    );
  }

  // Contrast score (0–15): threshold is 30, good is 50+
  const contrastScore = Math.min(15, (contrast / 50) * 15);

  let total =
    sizeScore +
    sharpnessScore +
    brightnessScore +
    contrastScore;

  // Small penalty if backend already marked this photo as failed.
  // This keeps obviously bad photos lower even if some metrics look okay.
  if (!photo.passed) {
    total -= 10;
  }

  return Math.round(Math.max(0, Math.min(100, total)));
}

/**
 * Compute an overall quality summary from backend photo metrics.
 * This is shared between PendingInbox and PeoplePanel so they stay in sync.
 */
export function computeBackendQualitySummary(
  photos: BackendPhotoMetrics[]
): BackendQualitySummary {
  const totalPhotos = photos.length;

  if (totalPhotos === 0) {
    return {
      overallScore: 0,
      bestPhotoScore: 0,
      avgPhotoScore: 0,
      passedCount: 0,
      totalPhotos: 0,
      avgWidthPx: 0,
      minWidthPx: 0,
      avgSharpness: 0,
      bestSharpness: 0,
      avgBrightness: 0,
      avgContrast: 0,
    };
  }

  const widths = photos.map((p) => p.faceWidthPx || 0);
  const sharpness = photos.map((p) => p.sharpness || 0);
  const brightness = photos.map((p) => p.brightness || 0);
  const contrast = photos.map((p) => p.contrast || 0);

  const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length;
  const minWidth = Math.min(...widths);
  const avgSharpness = sharpness.reduce((a, b) => a + b, 0) / sharpness.length;
  const avgBrightness = brightness.reduce((a, b) => a + b, 0) / brightness.length;
  const avgContrast = contrast.reduce((a, b) => a + b, 0) / contrast.length;

  // Compute per-photo scores using the same logic used for single photos.
  const scores = photos.map((p) => scorePhotoInternal(p));

  // Photos with score < 60 are considered too weak to count as \"good\".
  // We still include them in metrics, but we focus best/avg on the stronger set.
  const GOOD_THRESHOLD = 60;
  const goodScores = scores.filter((s) => s >= GOOD_THRESHOLD);
  const usedScores = goodScores.length > 0 ? goodScores : scores;

  // Count how many photos meet the GOOD_THRESHOLD by score.
  const passedCount = scores.filter((s) => s >= GOOD_THRESHOLD).length;

  const bestPhotoScore =
    usedScores.length > 0 ? Math.max(...usedScores) : 0;
  const avgPhotoScore =
    usedScores.length > 0
      ? usedScores.reduce((a, b) => a + b, 0) / usedScores.length
      : 0;

  // Define overallScore as the rounded average score of the considered photos.
  const overallScore = Math.round(avgPhotoScore);

  return {
    overallScore,
    bestPhotoScore,
    avgPhotoScore,
    passedCount,
    totalPhotos,
    avgWidthPx: avgWidth,
    minWidthPx: minWidth,
    avgSharpness,
    bestSharpness: Math.max(...sharpness),
    avgBrightness,
    avgContrast,
  };
}

/**
 * Convenience helper: compute a 0-100 score for a single photo
 * using the same logic as the multi-photo summary.
 */
export function scoreSinglePhoto(photo: BackendPhotoMetrics): number {
  return scorePhotoInternal(photo);
}

