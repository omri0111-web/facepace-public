/**
 * Frontend Photo Quality Checks
 *
 * NOTE: This file is intentionally kept in sync with
 * `FacePace Public/src/utils/frontendQualityChecks.ts` so that
 * local and online public enrollment behave the same.
 * 
 * Performs client-side validation of photos before sending to backend.
 * This allows for immediate user feedback without server round-trips.
 * 
 * Uses face-api.js (MIT license) for accurate ML-based face detection.
 */

import * as faceapi from 'face-api.js';

// Track if models are loaded
let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

/**
 * Load face-api.js models (TinyFaceDetector)
 * Models are loaded once and cached.
 */
async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  
  // If already loading, wait for that to complete
  if (modelsLoading) {
    await modelsLoading;
    return;
  }
  
  modelsLoading = (async () => {
    try {
      // Load TinyFaceDetector model from public/models/
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      modelsLoaded = true;
      console.log('✅ Face detection models loaded');
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error);
      throw error;
    }
  })();
  
  await modelsLoading;
}

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
     * Face width in pixels (from ML detection)
     */
    faceWidthPx?: number;
    /**
     * Face height in pixels (from ML detection)
     */
    faceHeightPx?: number;
    /**
     * Face detection confidence (0-1)
     */
    faceConfidence?: number;
    /**
     * @deprecated Use faceWidthPx instead. Kept for backwards compatibility.
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
  /**
   * Minimum face width in pixels (default: 150)
   * This ensures the face crop has enough detail for recognition.
   */
  minFaceWidthPx?: number;
  /**
   * Minimum face height in pixels (default: 150)
   */
  minFaceHeightPx?: number;
  /**
   * @deprecated Use minFaceWidthPx instead. Kept for backwards compatibility.
   */
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
 * ML-based face detection using face-api.js TinyFaceDetector
 * Returns face bounding box in pixels for accurate size measurement.
 */
async function detectFaceML(
  img: HTMLImageElement
): Promise<{ 
  detected: boolean; 
  confidence: number; 
  widthPx: number; 
  heightPx: number;
  // Bounding box for face crop
  box?: { x: number; y: number; width: number; height: number };
  // For backwards compatibility
  size: number;
}> {
  try {
    // Ensure models are loaded
    await loadFaceModels();
    
    // Run face detection
    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320,      // Smaller = faster, 320 is good balance
        scoreThreshold: 0.5  // Confidence threshold
      })
    );
    
    if (!detection) {
      return { 
        detected: false, 
        confidence: 0, 
        widthPx: 0, 
        heightPx: 0,
        size: 0 
      };
    }
    
    const { x, y, width, height } = detection.box;
    
    // Calculate size as fraction of image area (for backwards compatibility)
    const faceArea = width * height;
    const imageArea = img.width * img.height;
    const size = imageArea > 0 ? faceArea / imageArea : 0;
    
    return {
      detected: true,
      confidence: detection.score,
      widthPx: width,
      heightPx: height,
      box: { x, y, width, height },
      size,
    };
  } catch (error) {
    console.error('Face detection error:', error);
    // Return no face detected on error
    return { 
      detected: false, 
      confidence: 0, 
      widthPx: 0, 
      heightPx: 0,
      size: 0 
    };
  }
}

/**
 * Main unified photo quality check used everywhere in the app.
 * Uses ML-based face detection for accurate face size measurement.
 */
export async function checkPhotoQuality(
  imageBlob: Blob,
  options: QualityOptions = {}
): Promise<QualityCheckResult> {
  // Default thresholds
  const {
    minBrightness = 90,
    maxBrightness = 200,
    minContrast = 35,
    minSharpness = 100, // Lowered from 170 - was too strict for typical phone cameras
    requireFace = true,
    // Minimum face size in pixels for good recognition
    // 300px ensures maximum detail for best recognition accuracy
    minFaceWidthPx = 300,
    minFaceHeightPx = 300,
  } = options;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    img.onload = async () => {
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
      
      // Use full resolution for face detection (better accuracy)
      // but limit to 1280 for performance
      const maxDimension = 1280;
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height)) || 1;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // ML face detection FIRST (to get face bounding box)
      const faceImg = new Image();
      faceImg.src = canvas.toDataURL('image/jpeg', 0.9);
      
      await new Promise<void>((resolveImg) => {
        faceImg.onload = () => resolveImg();
        faceImg.onerror = () => resolveImg();
      });
      
      const faceResult = await detectFaceML(faceImg);
      
      // Scale face dimensions back to original image size
      const faceWidthPx = faceResult.widthPx / scale;
      const faceHeightPx = faceResult.heightPx / scale;
      
      // Calculate ALL metrics on FACE CROP only (like backend does)
      // This ensures brightness, contrast, and sharpness are measured on the face, not background
      let brightness = 0;
      let contrast = 0;
      let sharpness = 0;
      
      if (faceResult.detected && faceResult.box) {
        // Create canvas for face crop analysis
        const box = faceResult.box;
        // Add padding around face (20% each side) for better analysis
        const padding = 0.2;
        const padX = box.width * padding;
        const padY = box.height * padding;
        const cropX = Math.max(0, Math.floor((box.x - padX) * scale));
        const cropY = Math.max(0, Math.floor((box.y - padY) * scale));
        const cropW = Math.min(canvas.width - cropX, Math.ceil((box.width + padX * 2) * scale));
        const cropH = Math.min(canvas.height - cropY, Math.ceil((box.height + padY * 2) * scale));
        
        if (cropW > 20 && cropH > 20) {
          const faceImageData = ctx.getImageData(cropX, cropY, cropW, cropH);
          brightness = calculateBrightness(faceImageData);
          contrast = calculateContrast(faceImageData);
          sharpness = calculateSharpness(faceImageData);
        }
      } else {
        // No face detected - calculate on center region as fallback
        const centerX = Math.floor(canvas.width * 0.25);
        const centerY = Math.floor(canvas.height * 0.15);
        const centerW = Math.floor(canvas.width * 0.5);
        const centerH = Math.floor(canvas.height * 0.7);
        const centerImageData = ctx.getImageData(centerX, centerY, centerW, centerH);
        brightness = calculateBrightness(centerImageData);
        contrast = calculateContrast(centerImageData);
        sharpness = calculateSharpness(centerImageData);
      }
      
      const issues: string[] = [];
      let score = 100;
      
      // Brightness check
      if (brightness < minBrightness) {
        issues.push('Too dark - face a window or turn on lights');
        score -= 20;
      } else if (brightness > maxBrightness) {
        issues.push('Too bright - avoid direct sunlight or flash');
        score -= 20;
      }
      
      // Contrast check
      if (contrast < minContrast) {
        issues.push('Low contrast - need better lighting on face');
        score -= 15;
      }
      
      // Sharpness check
      if (sharpness < minSharpness) {
        issues.push('Image is blurry - improve lighting and hold steady');
        score -= 25;
      }
      
      // Face detection check
      if (requireFace && !faceResult.detected) {
        issues.push('No face detected - look directly at camera');
        score -= 30;
      }
      
      // Face size check (in pixels)
      if (requireFace && faceResult.detected) {
        if (faceWidthPx < minFaceWidthPx || faceHeightPx < minFaceHeightPx) {
          issues.push(`Face too small (${Math.round(faceWidthPx)}px) - get much closer!`);
          score -= 15;
        }
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
          faceWidthPx,
          faceHeightPx,
          faceConfidence: faceResult.confidence,
          // For backwards compatibility
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
    minBrightness: 70,
    maxBrightness: 220,
    minContrast: 25,
    minSharpness: 100,
    requireFace: true,
    minFaceWidthPx: 120, // Slightly more lenient for quick check
    minFaceHeightPx: 120,
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

/**
 * Preload face detection models (call early to avoid delay on first photo)
 */
export async function preloadFaceModels(): Promise<void> {
  try {
    await loadFaceModels();
  } catch (error) {
    console.warn('Failed to preload face models:', error);
  }
}
