/**
 * Frontend Photo Quality Checks
 * 
 * Performs client-side validation of photos before sending to backend.
 * This allows for immediate user feedback without server round-trips.
 */

export interface QualityCheckResult {
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  metrics: {
    brightness?: number;
    contrast?: number;
    sharpness?: number;
    faceDetected?: boolean;
    faceSize?: number;
  };
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
 * Calculate image contrast
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
  
  // Calculate standard deviation
  const mean = brightness.reduce((a, b) => a + b, 0) / brightness.length;
  const variance = brightness.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / brightness.length;
  
  return Math.sqrt(variance);
}

/**
 * Estimate image sharpness using Laplacian variance
 */
function calculateSharpness(imageData: ImageData): number {
  const { width, height, data } = imageData;
  
  // Convert to grayscale and compute Laplacian variance
  let sum = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      
      // Get grayscale value
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      
      // Get surrounding pixels
      const top = 0.299 * data[((y-1) * width + x) * 4] + 0.587 * data[((y-1) * width + x) * 4 + 1] + 0.114 * data[((y-1) * width + x) * 4 + 2];
      const bottom = 0.299 * data[((y+1) * width + x) * 4] + 0.587 * data[((y+1) * width + x) * 4 + 1] + 0.114 * data[((y+1) * width + x) * 4 + 2];
      const left = 0.299 * data[(y * width + (x-1)) * 4] + 0.587 * data[(y * width + (x-1)) * 4 + 1] + 0.114 * data[(y * width + (x-1)) * 4 + 2];
      const right = 0.299 * data[(y * width + (x+1)) * 4] + 0.587 * data[(y * width + (x+1)) * 4 + 1] + 0.114 * data[(y * width + (x+1)) * 4 + 2];
      
      // Compute Laplacian
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
function detectFace(imageData: ImageData): { detected: boolean; confidence: number; size: number } {
  const data = imageData.data;
  let skinPixels = 0;
  const totalPixels = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Skin tone detection heuristic
    if (r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        Math.max(r, g, b) - Math.min(r, g, b) > 15) {
      skinPixels++;
    }
  }
  
  const skinRatio = skinPixels / totalPixels;
  
  return {
    detected: skinRatio > 0.1, // At least 10% skin tone
    confidence: Math.min(skinRatio * 10, 1), // Scale to 0-1
    size: skinRatio
  };
}

/**
 * Check photo quality on the frontend
 */
export async function checkPhotoQuality(
  imageBlob: Blob,
  options: {
    minBrightness?: number;
    maxBrightness?: number;
    minContrast?: number;
    minSharpness?: number;
    requireFace?: boolean;
    minFaceSize?: number;
  } = {}
): Promise<QualityCheckResult> {
  // Default thresholds
  const {
    minBrightness = 50,
    maxBrightness = 200,
    minContrast = 30,
    minSharpness = 100,
    requireFace = true,
    minFaceSize = 0.05
  } = options;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      // Create canvas to analyze image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({
          passed: false,
          score: 0,
          issues: ['Failed to create canvas context'],
          metrics: {}
        });
        return;
      }
      
      // Resize to manageable size for performance
      const maxDimension = 640;
      const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Calculate metrics
      const brightness = calculateBrightness(imageData);
      const contrast = calculateContrast(imageData);
      const sharpness = calculateSharpness(imageData);
      const faceResult = detectFace(imageData);
      
      // Check against thresholds
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
      
      // Clean up
      URL.revokeObjectURL(url);
      
      resolve({
        passed: issues.length === 0 && score >= 60,
        score: Math.max(0, score),
        issues,
        metrics: {
          brightness,
          contrast,
          sharpness,
          faceDetected: faceResult.detected,
          faceSize: faceResult.size
        }
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        passed: false,
        score: 0,
        issues: ['Failed to load image'],
        metrics: {}
      });
    };
    
    img.src = url;
  });
}

/**
 * Quick check if an image is acceptable (faster, less thorough)
 */
export async function quickPhotoCheck(imageBlob: Blob): Promise<boolean> {
  const result = await checkPhotoQuality(imageBlob, {
    minBrightness: 40,
    maxBrightness: 220,
    minContrast: 20,
    minSharpness: 50,
    requireFace: true,
    minFaceSize: 0.03
  });
  
  return result.passed;
}

/**
 * Get user-friendly feedback message based on quality check
 */
export function getQualityFeedback(result: QualityCheckResult): string {
  if (result.passed) {
    return '✅ Photo quality is good!';
  }
  
  if (result.issues.length === 0) {
    return '⚠️ Photo quality could be better';
  }
  
  // Return the most important issue
  return `⚠️ ${result.issues[0]}`;
}

/**
 * Check multiple photos and return summary
 */
export async function checkMultiplePhotos(
  photos: Blob[]
): Promise<{
  allPassed: boolean;
  results: QualityCheckResult[];
  averageScore: number;
  feedback: string;
}> {
  const results = await Promise.all(
    photos.map(photo => checkPhotoQuality(photo))
  );
  
  const allPassed = results.every(r => r.passed);
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  
  const passedCount = results.filter(r => r.passed).length;
  const feedback = allPassed
    ? `✅ All ${photos.length} photos passed quality checks!`
    : `⚠️ ${passedCount}/${photos.length} photos passed. Please retake the failed photos.`;
  
  return {
    allPassed,
    results,
    averageScore,
    feedback
  };
}

