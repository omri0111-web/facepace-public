import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, X, Upload, Check, AlertCircle, RefreshCw, Flashlight } from 'lucide-react';
import { Button } from './ui/button';
import { checkPhotoQuality, QualityCheckResult, getQualityFeedback, preloadFaceModels } from '../utils/frontendQualityChecks';
import { cn } from './ui/utils';

interface SmartCameraProps {
  onPhotoCaptured: (blob: Blob, result: QualityCheckResult) => void;
  onCancel: () => void;
  onComplete?: () => void;
  photoCount: number;
  targetCount?: number;
  isOpen: boolean;
  instruction?: string;
  inline?: boolean;
  photoMetrics?: QualityCheckResult[]; // Track all photo quality results
  personDetails?: { label: string; value: string }[]; // Optional person details to review
}

export function SmartCamera({ 
  onPhotoCaptured, 
  onCancel, 
  onComplete,
  photoCount, 
  targetCount = 4,
  isOpen,
  instruction = "Face should fill this oval",
  inline = false,
  photoMetrics = [],
  personDetails = []
}: SmartCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<QualityCheckResult | null>(null);
  const [flash, setFlash] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  // Detect if user is on mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  // Mobile devices need stricter face size requirements due to wider camera FOV
  // Now using pixel-based thresholds for accurate ML face detection
  // Maximum strictness: face must nearly fill the oval guide
  const minFaceWidthPx = isMobile ? 350 : 300; // Maximum quality for recognition
  const minFaceHeightPx = isMobile ? 350 : 300;

  // Initialize camera when component mounts or isOpen changes
  useEffect(() => {
    if (isOpen) {
      startCamera();
      // Preload face detection models to avoid delay on first photo
      preloadFaceModels();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      
      setStream(mediaStream);
      setCameraPermission(true);
      setError(null);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('Camera access denied. Please allow camera access to take photos.');
      setCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const playShutterSound = () => {
    // Simple beep using Web Audio API
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  };

  /**
   * Capture a single frame from the video, run frontend quality checks,
   * and return both the blob and the QualityCheckResult.
   */
  const captureAndEvaluateFrame = useCallback(async (): Promise<{ blob: Blob; result: QualityCheckResult }> => {
    if (!videoRef.current) {
      throw new Error('Video not ready');
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');

    // Draw video frame to canvas (mirrored)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to capture frame'));
      }, 'image/jpeg', 0.95);
    });

    // Strict capture requirements (frontend gate before backend):
    // - Brighter, but not overexposed (stricter lighting)
    // - Strong contrast & sharpness
    // - Face must have enough pixels for good recognition (ML detection)
    const result = await checkPhotoQuality(blob, {
      minBrightness: 90,
      maxBrightness: 200,
      minContrast: 35,
      minSharpness: 100, // Same as backend threshold
      requireFace: true,
      minFaceWidthPx,  // ML face detection: min 150px desktop, 180px mobile
      minFaceHeightPx,
    });

    return { blob, result };
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || isChecking || photoCount >= targetCount) return;

    // Optional countdown
    // setCountdown(3);
    // ... implementation for countdown logic ...
    
    setIsChecking(true);
    setLastResult(null);
    
    // Flash effect
    setFlash(true);
    playShutterSound();
    setTimeout(() => setFlash(false), 200);

    try {
      // Capture multiple frames in a short window and keep the sharpest one.
      const attempts = 3;
      let best: { blob: Blob; result: QualityCheckResult } | null = null;

      for (let i = 0; i < attempts; i++) {
        const current = await captureAndEvaluateFrame();

        if (!best || current.result.score > best.result.score) {
          best = current;
        }

        // Small delay between frames to avoid capturing the exact same moment
        if (i < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 70));
        }
      }

      if (!best) {
        setIsChecking(false);
        return;
      }

      setLastResult(best.result);
      setIsChecking(false);

      if (best.result.passed) {
        // Small delay to show success message before callback
        setTimeout(() => {
          onPhotoCaptured(best!.blob, best!.result);
          setLastResult(null); // Reset for next photo
        }, 1500);
      } else {
        // Reset after error display
        setTimeout(() => {
          setLastResult(null);
        }, 2500);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setIsChecking(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsChecking(true);
    setLastResult(null);

    // Process uploaded file with the same strict capture requirements
    checkPhotoQuality(file, {
      minBrightness: 90,
      maxBrightness: 200,
      minContrast: 35,
      minSharpness: 100, // Same as backend threshold
      requireFace: true,
      minFaceWidthPx,  // ML face detection: min 150px desktop, 180px mobile
      minFaceHeightPx,
    }).then(result => {
      setLastResult(result);
      setIsChecking(false);
      
      if (result.passed) {
        setTimeout(() => {
          onPhotoCaptured(file, result);
          setLastResult(null);
        }, 1500);
      }
    }).catch(err => {
      console.error('Error checking file:', err);
      setIsChecking(false);
      setError('Could not check photo quality. Please try another.');
    });
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "flex flex-col bg-black h-[100dvh]", // Use dvh for better mobile support
      inline ? "relative w-full rounded-xl overflow-hidden border border-gray-800" : "fixed inset-0 z-[9999] md:flex-row"
    )} style={inline ? { height: '800px' } : {}}>
      {/* Flash Overlay */}
      <div 
        className={cn(
          "absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 z-[60]",
          flash ? "opacity-80" : "opacity-0"
        )} 
      />

      {/* Main Camera Area - Takes almost full screen */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-6 max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Camera Error</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button variant="outline" onClick={onCancel} className="bg-white/10 text-white hover:bg-white/20 border-white/20">
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <style>{`
              .mirror-video-smart {
                transform: scaleX(-1) !important;
                -webkit-transform: scaleX(-1) !important;
              }
            `}</style>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="mirror-video-smart absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Darken outer area */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <mask id="face-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <ellipse cx="50%" cy="45%" rx="32%" ry="42%" fill="black" />
                </mask>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#face-mask)" />
                
                {/* Guide Oval Border */}
                <ellipse 
                  cx="50%" 
                  cy="45%" 
                  rx="32%" 
                  ry="42%" 
                  fill="none" 
                  stroke={lastResult?.passed ? "#4ade80" : lastResult ? "#ef4444" : "rgba(255,255,255,0.5)"} 
                  strokeWidth="3"
                  strokeDasharray={lastResult ? "none" : "10 10"}
                  className={cn("transition-all duration-300", isChecking && "animate-pulse")}
                />
              </svg>
              
              {/* Result Feedback Overlay */}
              {lastResult && (
                <div className="absolute top-[45%] left-0 right-0 text-center transform -translate-y-1/2 z-20">
                  <div className={cn(
                    "inline-flex flex-col items-center p-6 rounded-xl backdrop-blur-md shadow-2xl transform transition-all duration-300",
                    lastResult.passed ? "bg-green-500/20 border border-green-500/50" : "bg-red-500/20 border border-red-500/50"
                  )}>
                    {lastResult.passed ? (
                      <>
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <Check className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">Perfect!</h3>
                        <p className="text-green-200">Saving photo...</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3 shadow-lg">
                          <X className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-1">Try Again</h3>
                        <div className="text-red-200 font-medium max-w-[250px] text-center">
                          {lastResult.issues.length > 0 ? (
                            <ul className="text-sm space-y-1">
                              {lastResult.issues.map((issue, i) => (
                                <li key={i}>• {issue}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>{getQualityFeedback(lastResult).replace('⚠️ ', '')}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Floating Capture Counter - Enhanced Animation */}
            <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none z-30">
              <div className="relative">
                <div
                  className={cn(
                    "bg-blue-600/90 text-white px-5 py-2 rounded-full text-2xl font-extrabold tracking-wide shadow-2xl transition-all duration-300",
                    photoCount < targetCount && "scale-110 animate-pulse"
                  )}
                >
                  {Math.min(photoCount, targetCount)} / {targetCount}
                </div>
                {/* Pulse ring effect */}
                {photoCount < targetCount && (
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-75"></div>
                )}
              </div>
            </div>

          {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onCancel}
                className="text-white hover:bg-white/20 rounded-full h-12 w-12"
              >
                <X className="w-6 h-6" />
              </Button>
              
              {/* Spacer for center alignment */}
              <div className="w-12"></div>

            {/* Right Side Controls (upload only - finish is handled by big round button on the right panel) */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    style={{ display: 'none' }}
                    id="file-upload"
                    onChange={handleFileUpload}
                    disabled={isChecking}
                  />
                  <label
                    htmlFor="file-upload"
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full text-white hover:bg-white/20 cursor-pointer transition-colors",
                      isChecking && "opacity-50 cursor-not-allowed"
                    )}
                    title="Upload photo"
                  >
                    <Upload className="w-6 h-6" />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Instructions Sidebar / Control Cockpit */}
      <div className={cn(
        "bg-white z-20 order-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]",
        inline 
          ? "h-auto max-h-[200px] border-t flex flex-col" 
          : "w-full md:w-80 h-auto md:h-full shrink-0 flex flex-col border-t md:border-t-0 md:border-l"
      )}>
        <div className="p-2 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {/* Instruction */}
          <div className="flex flex-col items-center mb-3">
            <p className="mt-2 text-base font-bold text-gray-900 text-center animate-pulse tracking-tight">
              {instruction || `Look straight at the camera`}
            </p>
          </div>

          {/* Capture / Finish Button - matches public UI, with stronger boundary and 3D effect */}
          <div className="mb-2 flex justify-center -mt-4 relative z-30">
            <div className="p-1.5 rounded-full bg-gradient-to-br from-blue-50 via-white to-blue-100 shadow-[0_10px_40px_rgba(59,130,246,0.4)] border border-blue-200">
              {photoCount >= targetCount && onComplete ? (
                <button
                  onClick={onComplete}
                  disabled={false}
                  className={cn(
                    "w-20 h-20 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 focus:outline-none active:scale-95 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.1)] active:shadow-inner transform hover:-translate-y-0.5",
                    "border-green-500 bg-gradient-to-b from-white to-green-50 hover:border-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]" 
                  )}
                >
                  <span className="text-green-600 font-bold text-sm">Finish</span>
                </button>
              ) : (
                <button
                  onClick={handleCapture}
                  disabled={isChecking || !!lastResult}
                  className={cn(
                    "w-20 h-20 rounded-full border-[6px] flex items-center justify-center transition-all duration-300 focus:outline-none active:scale-95 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.1)] active:shadow-inner transform hover:-translate-y-0.5",
                    (isChecking || lastResult) 
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-80" 
                      : "border-blue-500 bg-gradient-to-b from-white to-blue-50 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                  )}
                >
                  <span className="text-blue-600 font-bold text-sm drop-shadow-sm">
                    {isChecking || lastResult ? 'Checking…' : 'Take photo'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2 mb-2 border border-blue-100">
            <div className="text-[10px] font-semibold text-blue-900 mb-1">✨ Quick Tips:</div>
            <div className="space-y-1 text-[10px] text-blue-800">
              <div className="flex items-start gap-1.5">
                <span className="text-xs">😐</span>
                <span><strong>Neutral face</strong> - No smile</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-xs">🧐</span>
                <span><strong>Get very close</strong> - Fill oval</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-xs">💡</span>
                <span><strong>Good lighting</strong> - Face window</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-xs">✋</span>
                <span><strong>Hold steady</strong> - Avoid blur</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-200 text-[9px] text-amber-800 font-medium">
            ⚠️ Rejected photos don't count - retry instantly!
          </div>
        </div>
      </div>
    </div>
  );
}

