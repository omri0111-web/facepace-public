import { useEffect, useRef, useState } from 'react';
import { CameraPermissionHelper } from './CameraPermissionHelper';
import { FaceDetectionFrame } from './FaceDetectionFrame';
import { CameraStatusNotification } from './CameraStatusNotification';

interface CameraViewProps {
  onFaceCountChange: (detectedCount: number, totalCapacity: number) => void;
  selectedGroup?: any;
  people?: any[];
}

interface FaceDetection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  name?: string;
}

export function CameraView({ onFaceCountChange, selectedGroup, people = [] }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [demoMode, setDemoMode] = useState(false);
  const [showPermissionHelper, setShowPermissionHelper] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<FaceDetection[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [faceDetectionMode, setFaceDetectionMode] = useState<'real' | 'simulated'>('real');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    visible: boolean;
  }>({ message: '', type: 'info', visible: false });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkCameraPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(permission.state);
      return permission.state;
    } catch (err) {
      console.log('Permission API not supported');
      return 'prompt';
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    const startCamera = async () => {
      try {
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.log('Camera API not supported, starting demo mode');
          setDemoMode(true);
          return;
        }

        // First check permissions without requesting camera
        const permissionStatus = await checkCameraPermission();
        
        // If permission was previously denied, show permission helper
        if (permissionStatus === 'denied') {
          console.log('Camera permission previously denied');
          setPermissionState('denied');
          setShowPermissionHelper(true);
          return;
        }
        
        // Try to get camera stream with more conservative settings
        const constraints = {
          video: { 
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            facingMode: facingMode,
            frameRate: { ideal: 15, max: 30 }
          },
          audio: false
        };

        console.log('Requesting camera access...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
          setError(null);
          setPermissionState('granted');
          setNotification({
            message: 'Camera access granted! Real-time face detection is now active.',
            type: 'success',
            visible: true
          });
          console.log('Camera access granted successfully');
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        
        // Handle specific error types
        if (err.name === 'NotAllowedError') {
          console.log('Camera permission denied by user');
          setPermissionState('denied');
          setNotification({
            message: 'Camera access was denied. Please allow camera permissions for face detection.',
            type: 'warning',
            visible: true
          });
          setShowPermissionHelper(true);
          return;
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported by browser');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is being used by another application');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera settings not supported');
          // Retry with basic settings
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying with basic settings (attempt ${retryCount})`);
            setTimeout(() => {
              startCamera();
            }, 1000);
            return;
          }
        } else {
          setError(`Camera error: ${err.message}`);
        }
        
        // Auto-fallback to demo mode after showing error
        setTimeout(() => {
          console.log('Falling back to demo mode');
          setDemoMode(true);
          setError(null);
          setNotification({
            message: 'Switched to demo mode with simulated face detection.',
            type: 'info',
            visible: true
          });
        }, 3000);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => {
          track.stop();
          console.log('Camera stream stopped');
        });
      }
    };
  }, [facingMode]);

  // Face detection system - starts with basic detection, can upgrade to AI
  useEffect(() => {
    if (!isStreaming && !demoMode) return;

    let detectionActive = true;
    let detectionInterval: NodeJS.Timeout;
    let lastFaceCount = 0;
    
    const simulateDetection = () => {
      if (!detectionActive) return;
      
      const groupMembers = selectedGroup?.members || [];
      const groupPeople = people.filter(person => groupMembers.includes(person.id));
      
      // More stable detection - less randomness
      const maxFaces = Math.min(4, groupPeople.length || 4);
      // Keep face count more stable - only change occasionally
      const shouldChange = Math.random() < 0.3; // 30% chance to change
      const faceCount = shouldChange ? Math.floor(Math.random() * maxFaces) + 1 : lastFaceCount || Math.floor(maxFaces / 2) + 1;
      lastFaceCount = faceCount;
      
      // Create simulated face positions with STABLE positions (less random)
      const faces: FaceDetection[] = Array.from({ length: faceCount }, (_, index) => ({
        id: `sim-face-${index}`,
        x: 20 + (index % 2) * 40 + Math.random() * 5, // Less random movement
        y: 30 + Math.floor(index / 2) * 30 + Math.random() * 3, // Less random movement
        width: 20 + Math.random() * 3, // More stable size
        height: 24 + Math.random() * 3,
        confidence: 92 + Math.floor(Math.random() * 6), // 92-98% confidence
        name: index < groupPeople.length ? groupPeople[index]?.name : `Scout ${index + 1}`
      }));
      
      setDetectedFaces(faces);
      
      const totalCapacity = selectedGroup?.members.length || 25;
      onFaceCountChange(faceCount, totalCapacity);
    };

    const tryAdvancedDetection = async () => {
      // Only try advanced detection if camera is streaming
      if (!isStreaming || !videoRef.current) {
        console.log('Using simulated detection (no camera stream)');
        setFaceDetectionMode('simulated');
        detectionInterval = setInterval(simulateDetection, 3000); // Slower updates for stability
        return;
      }

      try {
        console.log('Attempting to initialize face detection...');
        // Try to use browser's built-in face detection if available
        if ('FaceDetector' in window) {
          console.log('Using browser face detection API');
          // @ts-ignore - FaceDetector is experimental
          const faceDetector = new window.FaceDetector({
            maxDetectedFaces: 10,
            fastMode: true
          });
          
          setFaceDetectionMode('real');
          
          const detectFaces = async () => {
            if (!detectionActive || !videoRef.current) return;
            
            try {
              // @ts-ignore
              const faces = await faceDetector.detect(videoRef.current);
              const faceCount = faces.length;
              
              const detectedFaces: FaceDetection[] = faces.map((face: any, index: number) => {
                const bbox = face.boundingBox;
                const video = videoRef.current!;
                const groupMembers = selectedGroup?.members || [];
                const groupPeople = people.filter(person => groupMembers.includes(person.id));
                
                return {
                  id: `face-${index}`,
                  x: Math.max(0, Math.min(90, (bbox.x / video.videoWidth) * 100)),
                  y: Math.max(0, Math.min(90, (bbox.y / video.videoHeight) * 100)),
                  width: Math.max(8, Math.min(20, (bbox.width / video.videoWidth) * 100)),
                  height: Math.max(8, Math.min(20, (bbox.height / video.videoHeight) * 100)),
                  confidence: 95,
                  name: index < groupPeople.length ? groupPeople[index]?.name : `Scout ${index + 1}`
                };
              });
              
              setDetectedFaces(detectedFaces);
              const totalCapacity = selectedGroup?.members.length || 25;
              onFaceCountChange(faceCount, totalCapacity);
              
            } catch (error) {
              console.log('Face detection API error, falling back to simulation');
              setFaceDetectionMode('simulated');
              simulateDetection();
            }
            
            if (detectionActive) {
              setTimeout(detectFaces, 1000); // Slower updates = smoother experience
            }
          };
          
          detectFaces();
        } else {
          throw new Error('Face Detection API not available');
        }
      } catch (error) {
        console.log('Advanced face detection not available, using simulation:', error);
        setFaceDetectionMode('simulated');
        detectionInterval = setInterval(simulateDetection, 3000); // Slower updates for stability
      }
    };

    // Start detection
    if (demoMode) {
      setFaceDetectionMode('simulated');
      detectionInterval = setInterval(simulateDetection, 3000); // Slower updates for stability
    } else {
      tryAdvancedDetection();
    }

    return () => {
      detectionActive = false;
      if (detectionInterval) {
        clearInterval(detectionInterval);
      }
    };
  }, [isStreaming, demoMode, selectedGroup, people, onFaceCountChange]);

  const handleDemoMode = () => {
    setDemoMode(true);
    setError(null);
    setIsStreaming(false);
  };

  const handleRetryCamera = async () => {
    setError(null);
    setDemoMode(false);
    setShowPermissionHelper(false);
    setPermissionState('prompt');
    // Force a reload to restart the camera initialization
    window.location.reload();
  };

  const handleCameraSwitch = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handlePermissionHelperClose = () => {
    setShowPermissionHelper(false);
    // If user closes helper without trying, fall back to demo mode
    setDemoMode(true);
  };

  if (error && !demoMode) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-900 text-white p-8">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📷</span>
            </div>
            <h3 className="text-lg font-medium mb-3">Setting up camera...</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">{error}</p>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (demoMode) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900">
        {/* Demo mode background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,255,255,0.05) 10px,
              rgba(255,255,255,0.05) 20px
            )`
          }}></div>
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white max-w-sm mx-auto px-6">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">👥</span>
            </div>
            <h3 className="text-xl font-medium mb-3">Demo Mode Active</h3>
            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              {permissionState === 'denied' 
                ? 'Camera access was blocked. The app is now running in demo mode with simulated face detection.'
                : 'Simulating face detection with mock data. Enable camera access for real-time detection.'
              }
            </p>
            <div className="space-y-3">
              <button 
                onClick={handleRetryCamera}
                className="w-full px-6 py-3 bg-blue-600/80 hover:bg-blue-600 rounded-lg transition-colors text-sm font-medium shadow-lg"
              >
                {permissionState === 'denied' ? 'Allow Camera Access' : 'Enable Camera'}
              </button>
              
              {permissionState === 'denied' && (
                <button 
                  onClick={() => setShowPermissionHelper(true)}
                  className="w-full px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium border border-white/20"
                >
                  Need Help? →
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Demo mode indicator */}
        <div className="absolute top-4 right-4 bg-yellow-500/90 text-black px-3 py-1 rounded-full text-sm font-medium">
          DEMO
        </div>
        
        <CameraPermissionHelper
          isOpen={showPermissionHelper}
          onClose={handlePermissionHelperClose}
          onRetry={handleRetryCamera}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        onLoadedMetadata={() => setIsStreaming(true)}
      />
      
      {/* Face Detection Overlays */}
      {isStreaming && detectedFaces.map((face) => (
        <FaceDetectionFrame
          key={face.id}
          top={`${face.y}%`}
          left={`${face.x}%`}
          width={`${face.width}%`}
          height={`${face.height}%`}
          name={face.name || 'Unknown'}
          confidence={face.confidence}
          color="green"
          labelPosition={face.x > 50 ? 'right' : 'left'}
        />
      ))}
      
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
          
          {/* Face Detection Status */}
          <div className="bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 border border-white/30 shadow-lg">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${faceDetectionMode === 'real' ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-white text-xs font-medium">
                {faceDetectionMode === 'real' ? 'AI' : 'SIM'}
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Permission Button for demo mode */}
      {demoMode && permissionState === 'denied' && (
        <div className="absolute bottom-4 right-4 z-20">
          <button
            onClick={() => setShowPermissionHelper(true)}
            className="bg-blue-600/90 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-200 active:scale-95 flex items-center space-x-2"
          >
            <span>📷</span>
            <span>Enable Camera</span>
          </button>
        </div>
      )}
      
      {!isStreaming && !demoMode && (
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
                'Setting up face detection...'
              }
            </p>
            {permissionState === 'prompt' && (
              <div className="mt-4 text-xs text-blue-400">
                Please allow camera access when prompted
              </div>
            )}
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
        onClose={handlePermissionHelperClose}
        onRetry={handleRetryCamera}
      />
      
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
        onClose={handlePermissionHelperClose}
        onRetry={handleRetryCamera}
      />
    </div>
  );
}