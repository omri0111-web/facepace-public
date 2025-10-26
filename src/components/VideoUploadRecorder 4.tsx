import React, { useState, useRef, useCallback } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';

interface VideoUploadRecorderProps {
  onFaceCountChange: (count: number, recognizedIds: string[]) => void;
  onRecognizedIdsChange: (ids: string[]) => void;
  selectedGroupId: string | null;
  selectedGroupName: string;
  isRecording: boolean;
}

interface DetectedBox {
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
}

interface RecognizedFace {
  person_id: string;
  person_name: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: number;
}

export const VideoUploadRecorder: React.FC<VideoUploadRecorderProps> = ({
  onFaceCountChange,
  onRecognizedIdsChange,
  selectedGroupId,
  selectedGroupName,
  isRecording,
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [recognizedIds, setRecognizedIds] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [showPreview] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastProcessedMsRef = useRef<number>(0);
  
  // Driven by global isRecording

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setError('');
        // Preview is no longer used; keep video always visible full-size
      } else {
        setError('Please select a video file (MP4, MOV, WebM)');
      }
    }
  }, []);

  const captureFrame = useCallback((video: HTMLVideoElement, canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const processVideoFrame = useCallback(async (timestamp: number) => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      const dataUrl = captureFrame(videoRef.current, canvasRef.current);
      
      // Get detection results
      const detectResult = await backendRecognitionService.processVideoFrame(dataUrl, timestamp);
      
      // Update detected boxes
      setDetectedBoxes(detectResult.faces);

      // If we have a group selected, also do recognition
      if (selectedGroupId && detectResult.faces.length > 0) {
        try {
          const recognizeResult = await backendRecognitionService.recognizeFromDataURL(dataUrl, selectedGroupId);
          
          // Update recognized faces
          const facesWithTimestamp = recognizeResult.map(face => ({
            ...face,
            timestamp
          }));
          setRecognizedFaces(facesWithTimestamp);

          // Extract recognized IDs
          const newRecognizedIds = recognizeResult.map(face => face.personId);
          setRecognizedIds(prev => {
            const uniqueIds = [...new Set([...prev, ...newRecognizedIds])];
            // Defer parent updates to next tick to avoid setState during render warning
            setTimeout(() => {
              try {
                onRecognizedIdsChange(uniqueIds);
                onFaceCountChange(uniqueIds.length, uniqueIds);
              } catch {}
            }, 0);
            return uniqueIds;
          });
        } catch (recognitionError) {
          console.error('Recognition error:', recognitionError);
        }
      }
    } catch (error) {
      console.error('Frame processing error:', error);
    }
  }, [selectedGroupId, captureFrame, onFaceCountChange, onRecognizedIdsChange]);

  const startProcessing = useCallback(() => {
    if (!videoRef.current || !videoFile) return;

    setIsProcessing(true);
    setDetectedBoxes([]);
    setRecognizedFaces([]);
    setRecognizedIds([]);

    const v = videoRef.current;
    // Ensure playback so currentTime advances
    try { v.muted = true; v.play().catch(() => {}); } catch {}

    lastProcessedMsRef.current = 0;

    const tick = () => {
      if (!isRecording) {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        setIsProcessing(false);
        return;
      }
      if (!v.paused && v.readyState >= 2) {
        const nowMs = (v.currentTime || 0) * 1000;
        // throttle ~300ms
        if (nowMs - lastProcessedMsRef.current >= 300) {
          processVideoFrame(nowMs / 1000);
          lastProcessedMsRef.current = nowMs;
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, [videoFile, isRecording, processVideoFrame]);

  const stopProcessing = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Start/stop processing based on global isRecording
  React.useEffect(() => {
    if (isRecording && videoFile && !isProcessing) {
      startProcessing();
    } else if (!isRecording && isProcessing) {
      stopProcessing();
    }
  }, [isRecording, videoFile, isProcessing, startProcessing, stopProcessing]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex flex-col">
        {/* File Upload (only when no video chosen) */}
        {!videoUrl && (
          <div className="p-4">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('video-upload')?.click()}
            >
              <input
                type="file"
                accept="video/mp4,video/mov,video/webm"
                onChange={handleFileSelect}
                className="hidden"
                id="video-upload"
              />
              <div className="flex flex-col items-center space-y-2">
                <div className="text-4xl">📹</div>
                <div className="text-sm font-medium text-gray-700">Click to select video file</div>
                <div className="text-xs text-gray-500">MP4, MOV, or WebM format</div>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>
        )}

        {/* Video Player full-size like live view (shown after upload) */}
        {videoUrl && (
          <div className="relative flex-1">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
            />
            {/* Overlays */}
            <div className="absolute inset-0 pointer-events-none">
              {detectedBoxes.map((box, index) => (
                <div
                  key={index}
                  className="absolute border-2 border-green-500"
                  style={{
                    left: `${(box.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                    top: `${(box.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                    width: `${(box.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                    height: `${(box.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
                  }}
                />
              ))}
              {recognizedFaces.map((face, index) => (
                <div
                  key={index}
                  className="absolute bg-green-600 text-white px-2 py-0.5 text-xs rounded"
                  style={{
                    left: `${(face.box.x / (videoRef.current?.videoWidth || 1)) * 100}%`,
                    top: `${(face.box.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                    transform: 'translateY(-100%)',
                  }}
                >
                  {face.person_name} ({Math.round(face.confidence * 100)}%)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Status (removed per request) */}

        {/* No local controls; global Record button drives processing */}

        {/* Group Info */}
        {selectedGroupName && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Group:</strong> {selectedGroupName}
            </p>
          </div>
        )}

        {/* No Group Selected Warning */}
        {!selectedGroupId && videoUrl && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              <strong>⚠️ No Group Selected:</strong> Select a group to enable recognition.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-700">
            <div>📹 Upload → 👥 Select Group → 🎬 Start Recording</div>
          </div>
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
