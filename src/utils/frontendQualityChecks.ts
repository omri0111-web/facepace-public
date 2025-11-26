/**
 * Frontend Photo Quality Checks
 *
 * NOTE: This file is intentionally kept in sync with
 * `FacePace Public/src/utils/frontendQualityChecks.ts` so that
 * local and online public enrollment behave the same.
 * 
 * Performs client-side validation of photos before sending to backend.
 * This allows for immediate user feedback without server round-trips.
 */

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  /**
   * Primary list of issues explaining why a photo did not pass.
   * We keep `reasons` as a backwards-compatible alias used in some components.
   */
  issues: string[];
  reasons?: string[];
  metrics: {
    brightness?: number;
    contrast?: number;
    sharpness?: number;
    faceDetected?: boolean;
    /**
     * Approximate fraction of the image covered by face/skin pixels (0–1)
     */
    faceSize?: number;
  };
}

export interface QualityOptions {
  minBrightness?: number;
  maxBrightness?: number;
  minContrast?: number;
  minSharpness?: number;
  requireFace?: boolean;
  minFaceSize?: number;
}

/**
 * Calculate image brightness (0-255)
 */
function calculateBrightness(imageData: ImageData): number {
  const data = imageData.data;
  let sum = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    // Use perceived brightness formula
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += (0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  return sum / (data.length / 4);
}

/**
 * Calculate image contrast (standard deviation of brightness)
 */
function calculateContrast(imageData: ImageData): number {
  const data = imageData.data;
  const brightness: number[] = [];
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    brightness.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  const mean = brightness.reduce((a, b) => a + b, 0) / brightness.length;
  const variance =
    brightness.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    brightness.length;
  
  return Math.sqrt(variance);
}

/**
 * Estimate image sharpness using Laplacian variance
 */
function calculateSharpness(imageData: ImageData): number {
  const { width, height, data } = imageData;
  
  let sum = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      const gray =
        0.299 * data[idx] +
        0.587 * data[idx + 1] +
        0.114 * data[idx + 2];
      
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;

      const top =
        0.299 * data[topIdx] +
        0.587 * data[topIdx + 1] +
        0.114 * data[topIdx + 2];
      const bottom =
        0.299 * data[bottomIdx] +
        0.587 * data[bottomIdx + 1] +
        0.114 * data[bottomIdx + 2];
      const left =
        0.299 * data[leftIdx] +
        0.587 * data[leftIdx + 1] +
        0.114 * data[leftIdx + 2];
      const right =
        0.299 * data[rightIdx] +
        0.587 * data[rightIdx + 1] +
        0.114 * data[rightIdx + 2];
      
      const laplacian = Math.abs(4 * gray - top - bottom - left - right);
      sum += laplacian * laplacian;
      count++;
    }
  }
  
  return sum / count;
}

/**
 * Simple face detection using skin tone detection
 * This is a basic heuristic - for better results, use MediaPipe Face Detection
 */
function detectFace(
  imageData: ImageData
): { detected: boolean; confidence: number; size: number } {
  const { width, height, data } = imageData;

  // Focus only on the central region where we expect the face to be
  const startX = Math.floor(width * 0.2);
  const endX = Math.ceil(width * 0.8);
  const startY = Math.floor(height * 0.2);
  const endY = Math.ceil(height * 0.8);

  let skinPixels = 0;
  const totalPixels = (endX - startX) * (endY - startY);
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
    
      // Simple skin tone detection heuristic
      if (
        r > 95 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 15 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15
      ) {
        skinPixels++;
      }
    }
  }
  
  const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
  
  return {
    // Require a stronger skin presence in the center to count as a face
    detected: skinRatio > 0.18,
    confidence: Math.min(skinRatio * 10, 1),
    size: skinRatio,
  };
}

/**
 * Main unified photo quality check used everywhere in the app.
 * These defaults are chosen to be strict-but-achievable for kids.
 */
export async function checkPhotoQuality(
  imageBlob: Blob,
  options: QualityOptions = {}
): Promise<QualityCheckResult> {
  // Default thresholds – tweak here to tune strictness globally
  const {
    minBrightness = 50,
    maxBrightness = 200,
    minContrast = 30,
    minSharpness = 100,
    requireFace = true,
    // With the tighter central-region face detection, require a larger face area
    minFaceSize = 0.14,
  } = options;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve({
          passed: false,
          score: 0,
          issues: ['Failed to create canvas context'],
          reasons: ['Failed to create canvas context'],
          metrics: {},
        });
        return;
      }
      
      // Resize to manageable size for performance
      const maxDimension = 640;
      const scale =
        Math.min(1, maxDimension / Math.max(img.width, img.height)) || 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Calculate metrics
      const brightness = calculateBrightness(imageData);
      const contrast = calculateContrast(imageData);
      const sharpness = calculateSharpness(imageData);
      const faceResult = detectFace(imageData);
      
      const issues: string[] = [];
      let score = 100;
      
      if (brightness < minBrightness) {
        issues.push('Image is too dark');
        score -= 20;
      } else if (brightness > maxBrightness) {
        issues.push('Image is too bright');
        score -= 20;
      }
      
      if (contrast < minContrast) {
        issues.push('Image has low contrast');
        score -= 15;
      }
      
      if (sharpness < minSharpness) {
        issues.push('Image is blurry');
        score -= 25;
      }
      
      if (requireFace && !faceResult.detected) {
        issues.push('No face detected in image');
        score -= 30;
      }
      
      if (requireFace && faceResult.size < minFaceSize) {
        issues.push('Face is too small - move closer');
        score -= 15;
      }
      
      URL.revokeObjectURL(url);

      const passed = issues.length === 0 && score >= 60;
      
      resolve({
        passed,
        score: Math.max(0, score),
        issues,
        reasons: issues.length ? issues : undefined,
        metrics: {
          brightness,
          contrast,
          sharpness,
          faceDetected: faceResult.detected,
          faceSize: faceResult.size,
        },
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        passed: false,
        score: 0,
        issues: ['Failed to load image'],
        reasons: ['Failed to load image'],
        metrics: {},
      });
    };
    
    img.src = url;
  });
}

/**
 * Quick boolean-only check (used when we don't care about metrics)
 */
export async function quickPhotoCheck(imageBlob: Blob): Promise<boolean> {
  const result = await checkPhotoQuality(imageBlob, {
    minBrightness: 40,
    maxBrightness: 220,
    minContrast: 20,
    minSharpness: 50,
    requireFace: true,
    minFaceSize: 0.12,
  });
  
  return result.passed;
}

/**
 * Get user-friendly feedback message based on quality check
 */
export function getQualityFeedback(result: QualityCheckResult): string {
  const issues =
    (result.issues && result.issues.length > 0
      ? result.issues
      : result.reasons) || [];

  if (result.passed) {
    return `✅ Photo quality is good! (${Math.round(result.score)}/100)`;
  }
  
  if (issues.length === 0) {
    return '⚠️ Photo quality could be better';
  }
  
  // Return the most important issue
  return `⚠️ ${issues[0]}`;
}

/**
 * Check multiple photos and return summary (for Pending Inbox, etc.)
 */
export async function checkMultiplePhotos(
  photos: Blob[]
): Promise<{
  allPassed: boolean;
  results: QualityCheckResult[];
  averageScore: number;
  feedback: string;
}> {
  const results = await Promise.all(photos.map((photo) => checkPhotoQuality(photo)));
  
  const allPassed = results.every((r) => r.passed);
  const averageScore =
    results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  const passedCount = results.filter((r) => r.passed).length;
  const feedback = allPassed
    ? `✅ All ${photos.length} photos passed quality checks!`
    : `⚠️ ${passedCount}/${photos.length} photos passed. Please retake the failed photos.`;
  
  return {
    allPassed,
    results,
    averageScore,
    feedback,
  };
}



