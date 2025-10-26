import React, { useEffect, useRef, useState, useMemo, startTransition } from 'react';
import { backendRecognitionService, RecognizedFace } from '../services/BackendRecognitionService';
import { CameraPermissionHelper } from './CameraPermissionHelper';
import { CameraStatusNotification } from './CameraStatusNotification';
import { logger } from "../utils/logger";

interface RealFaceCameraViewProps {
  onFaceCountChange: (detectedCount: number, totalCapacity: number) => void;
  selectedGroup?: any;
  people?: any[];
  isRecording?: boolean;
  onRecognizedIdsChange?: (personIds: string[]) => void;
}

export function RealFaceCameraView({ 
  onFaceCountChange, 
  selectedGroup, 
  people = [],
  isRecording = false,
  onRecognizedIdsChange,
}: RealFaceCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastRecognizedIdsRef = useRef<string>('');
  const rafRef = useRef<number>();
  const lastBoxesRef = useRef<{x:number;y:number;width:number;height:number}[]>([]);
  const lastFacesRef = useRef<(RecognizedFace & { box: { x:number;y:number;width:number;height:number }})[]>([]);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isInitializing, setIsInitializing] = useState(true);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });

  // Initialize backend face recognition service
  useEffect(() => {
    const initService = async () => {
      try {
        setNotification({
          message: 'Loading face recognition models...',
          type: 'info',
          visible: true,
        });

        await backendRecognitionService.initialize();
        
        setNotification({
          message: 'Face recognition ready!',
          type: 'success',
          visible: true,
        });
        
        setIsInitializing(false);
      } catch (err) {
        logger.error('Failed to initialize face recognition', err);
        setError('Failed to load face recognition models');
        setNotification({
          message: 'Failed to load face recognition models. Please refresh the page.',
          type: 'error',
          visible: true,
        });
        setIsInitializing(false);
      }
    };

    initService();
  }, []);

  const checkCameraPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(permission.state);
      return permission.state;
    } catch (err) {
      logger.warning('Permission API not supported');
      return 'prompt';
    }
  };

  useEffect(() => {
    if (isInitializing) return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported by this browser');
        return;
      }

      // Check permission state if available (best-effort)
      try {
        const permissionStatus = await checkCameraPermission();
        if (permissionStatus === 'denied') {
          setPermissionState('denied');
          setShowPermissionHelper(true);
          return;
        }
      } catch {}

      // Prefer detailed constraints; fall back to minimal if needed
      const primaryConstraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: { ideal: facingMode },
          frameRate: { ideal: 30 }
        },
        audio: false
      };
      const fallbackConstraints: MediaStreamConstraints = { video: true, audio: false };

      const tryOpen = async (constraints: MediaStreamConstraints) => {
        try {
          const s = await navigator.mediaDevices.getUserMedia(constraints);
          return s;
        } catch (e) {
          throw e;
        }
      };

      try {
        // If an existing stream is active, stop before opening a new one
        if (currentStreamRef.current) {
          currentStreamRef.current.getTracks().forEach(t => t.stop());
          currentStreamRef.current = null;
        }
        stream = await tryOpen(primaryConstraints);
      } catch (e1: any) {
        logger.warning('Primary camera constraints failed, retrying with fallback', e1?.name || e1);
        try {
          stream = await tryOpen(fallbackConstraints);
        } catch (e2: any) {
          logger.error('Camera access failed (fallback also failed)', e2);
          if (e2?.name === 'NotAllowedError') {
            setPermissionState('denied');
            setShowPermissionHelper(true);
          } else if (e2?.name === 'NotFoundError') {
            setError('No camera device found');
          } else if (e2?.name === 'OverconstrainedError') {
            setError('Camera constraints not supported');
          } else {
            setError(`Camera error: ${e2?.message || e2}`);
          }
          return;
        }
      }

      if (videoRef.current && stream) {
        const v = videoRef.current;
        v.srcObject = stream;
        currentStreamRef.current = stream;
        setError(null);
        setPermissionState('granted');
        const onCanPlay = () => {
          setIsStreaming(true);
          setNotification({
            message: 'Camera active! Only enrolled faces will be recognized.',
            type: 'success',
            visible: true
          });
          v.removeEventListener('canplay', onCanPlay);
        };
        v.addEventListener('canplay', onCanPlay);
        try { await v.play(); } catch {}
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, isInitializing]);

  // Render overlays via DOM to avoid video flicker
  const renderOverlays = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const container = overlayRef.current;
      const video = videoRef.current;
      if (!container || !video || !video.videoWidth || !video.videoHeight) return;

      // Clear
      container.innerHTML = '';

      // Draw detection boxes (green frames)
      for (const box of lastBoxesRef.current) {
        const boxDiv = document.createElement('div');
        boxDiv.className = 'absolute border-3 border-green-400 rounded-lg pointer-events-none';
        const topP = (box.y / video.videoHeight) * 100;
        const leftP = (box.x / video.videoWidth) * 100;
        const widthP = (box.width / video.videoWidth) * 100;
        const heightP = (box.height / video.videoHeight) * 100;
        boxDiv.style.top = topP + '%';
        boxDiv.style.left = leftP + '%';
        boxDiv.style.width = widthP + '%';
        boxDiv.style.height = heightP + '%';
        boxDiv.style.transform = 'translateZ(0)';

        const pingDiv = document.createElement('div');
        pingDiv.className = 'absolute inset-0 border-2 border-green-300 animate-ping opacity-40 rounded-lg';
        boxDiv.appendChild(pingDiv);

        container.appendChild(boxDiv);
      }

      // Draw recognized faces (with names)
      for (const face of lastFacesRef.current) {
        const faceDiv = document.createElement('div');
        faceDiv.className = 'absolute border-3 border-green-400 rounded-lg pointer-events-none';
        faceDiv.style.top = face.box.y + '%';
        faceDiv.style.left = face.box.x + '%';
        faceDiv.style.width = face.box.width + '%';
        faceDiv.style.height = face.box.height + '%';
        faceDiv.style.transform = 'translateZ(0)';

        const labelDiv = document.createElement('div');
        const labelRight = face.box.x > 50;
        labelDiv.className = `absolute -top-8 ${labelRight ? 'right-0' : 'left-0'} bg-green-500 text-white text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap`;
        labelDiv.innerHTML = `${face.personName}<div class="text-[10px] opacity-80">${Math.round((face.confidence || 0) * 100)}%</div>`;
        faceDiv.appendChild(labelDiv);

        const pingDiv = document.createElement('div');
        pingDiv.className = 'absolute inset-0 border-2 border-green-300 animate-ping opacity-40 rounded-lg';
        faceDiv.appendChild(pingDiv);

        container.appendChild(faceDiv);
      }
    });
  };

  // Real face detection + recognition loop (backend) - only when recording
  useEffect(() => {
    if (!isRecording || !isStreaming || !videoRef.current || !backendRecognitionService.isReady()) return;

    let recognitionActive = true;
    let timer: number | undefined;

    const loop = async () => {
      if (!recognitionActive || !videoRef.current) return;

      try {
        // Get group member IDs to filter recognition
        const groupMembers = selectedGroup?.members || [];
        
        logger.system(`Group '${selectedGroup?.name || 'Unknown'}' has ${groupMembers.length} members`);
        
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
          // Video not ready yet, try again on next tick
          if (recognitionActive) {
            timer = window.setTimeout(loop, 100);
          }
          return;
        }

        // Capture one frame and reuse for both detect and recognize to reduce overhead
        const frame = await backendRecognitionService.captureFrame(video);

        // 1) Fast detect for green boxes
        const boxes = await backendRecognitionService.detectFromDataURL(frame);
        lastBoxesRef.current = boxes;
        renderOverlays();
        
        // 2) Fire recognition in background (don't await - let it complete async)
        backendRecognitionService.recognizeFromDataURL(
          frame,
          {
            filterByPersonIds: groupMembers.length > 0 ? groupMembers : undefined,
            groupId: selectedGroup?.id || undefined,
          }
        ).then(faces => {
          const v = videoRef.current;
          if (!v) return;

          logger.recognition(`Recognized ${faces.length} face(s)`, faces.length);

          // Convert face boxes to percent for overlay
          lastFacesRef.current = faces.map(face => ({
            ...face,
            box: {
              x: (face.box.x / v.videoWidth) * 100,
              y: (face.box.y / v.videoHeight) * 100,
              width: (face.box.width / v.videoWidth) * 100,
              height: (face.box.height / v.videoHeight) * 100,
            }
          }));

          renderOverlays();

          // Notify parent with the set of recognized IDs (only if changed)
          if (onRecognizedIdsChange) {
            const ids = Array.from(new Set(
              faces
                .map((f: any) => f.personId || f.person_id || f.personID || f.id)
                .filter(Boolean)
            ));
            const idsStr = ids.join(',');
            if (idsStr !== lastRecognizedIdsRef.current) {
              lastRecognizedIdsRef.current = idsStr;
              logger.recognition(`Matched IDs in group: ${ids.length}`, ids);
              startTransition(() => onRecognizedIdsChange(ids as string[]));
            }
          }
        }).catch(() => {});

        logger.detection(`Detected faces in frame`, boxes.length);
        
      } catch (error) {
        logger.error('Face recognition error', error);
      }
      
      if (recognitionActive) {
        timer = window.setTimeout(loop, 100); // Take a snapshot every ~100ms (10 FPS)
      }
    };

    loop();

    return () => {
      recognitionActive = false;
      if (timer) window.clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (overlayRef.current) overlayRef.current.innerHTML = '';
      // Stop camera on unmount
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(t => t.stop());
        currentStreamRef.current = null;
      }
    };
  }, [isRecording, isStreaming, selectedGroup, people, onFaceCountChange, onRecognizedIdsChange]);

  const handleRetryCamera = () => {
    setError(null);
    setShowPermissionHelper(false);
    setPermissionState('prompt');
    window.location.reload();
  };

  const handleCameraSwitch = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Memoize video element to prevent re-renders
  const videoElement = useMemo(() => (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
      onLoadedMetadata={() => setIsStreaming(true)}
      style={{ 
        transform: 'translateZ(0)', 
        backfaceVisibility: 'hidden', 
        WebkitBackfaceVisibility: 'hidden' as any,
        willChange: 'auto'
      }}
    />
  ), []);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-lg font-medium mb-3">Initializing Face Recognition</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Loading AI models for face detection and recognition...
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium mb-3">Camera Error</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">{error}</p>
          </div>
          
          <button
            onClick={handleRetryCamera}
            className="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {videoElement}

      {/* Overlay container updated via DOM for smooth rendering */}
      <div 
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none"
        style={{ transform: 'translateZ(0)' }}
      />
      
      {/* Camera Controls */}
      {isStreaming && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-2">
          <button
            onClick={handleCameraSwitch}
            className="w-12 h-12 bg-black/60 backdrop-blur-md border border-white/30 text-white hover:bg-black/80 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            title={facingMode === 'user' ? 'Switch to rear camera' : 'Switch to front camera'}
          >
            🔄
          </button>
          
          {/* Face Recognition Status */}
          <div className="bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 border border-white/30 shadow-lg">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-white text-xs font-medium">AI</span>
            </div>
          </div>
        </div>
      )}
      
      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📷</span>
            </div>
            <div className="animate-pulse">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            </div>
            <h3 className="text-lg font-medium mb-2">Initializing Camera</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {permissionState === 'prompt' ? 
                'Requesting camera access...' : 
                'Starting face recognition...'
              }
            </p>
          </div>
        </div>
      )}

      {/* Camera Status Notifications */}
      <CameraStatusNotification
        message={notification.message}
        type={notification.type}
        isVisible={notification.visible}
        onClose={() => setNotification(prev => ({ ...prev, visible: false }))}
      />
      
      {/* Camera Permission Helper */}
      <CameraPermissionHelper
        isOpen={showPermissionHelper}
        onClose={() => setShowPermissionHelper(false)}
        onRetry={handleRetryCamera}
      />
    </div>
  );
}
