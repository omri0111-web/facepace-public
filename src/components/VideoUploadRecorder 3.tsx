import React, { useState, useRef, useCallback } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';

interface VideoUploadRecorderProps {
  isRecording: boolean;
  onFaceCountChange: (count: number, recognizedIds: string[]) => void;
  onRecognizedIdsChange: (ids: string[]) => void;
  selectedGroupId: string | null;
  selectedGroupName: string;
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
  isRecording,
  onFaceCountChange,
  onRecognizedIdsChange,
  selectedGroupId,
  selectedGroupName
}) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [recognizedIds, setRecognizedIds] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        setError('');
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
          const recognizeResult = await backendRecognitionService.recognizeFacesFromDataURL(dataUrl, selectedGroupId);
          
          // Update recognized faces
          const facesWithTimestamp = recognizeResult.faces.map(face => ({
            ...face,
            timestamp
          }));
          setRecognizedFaces(facesWithTimestamp);

          // Extract recognized IDs
          const newRecognizedIds = recognizeResult.faces.map(face => face.person_id);
          setRecognizedIds(prev => {
            const uniqueIds = [...new Set([...prev, ...newRecognizedIds])];
            onRecognizedIdsChange(uniqueIds);
            return uniqueIds;
          });

          // Update face count
          onFaceCountChange(uniqueIds.length, uniqueIds);
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
    setProgress(0);
    setDetectedBoxes([]);
    setRecognizedFaces([]);
    setRecognizedIds([]);

    const video = videoRef.current;
    const duration = video.duration;
    let currentTime = 0;
    const interval = 300; // Process every 300ms

    const processInterval = setInterval(() => {
      if (currentTime >= duration || !isRecording) {
        clearInterval(processInterval);
        setIsProcessing(false);
        return;
      }

      video.currentTime = currentTime;
      video.addEventListener('seeked', () => {
        processVideoFrame(currentTime);
        setProgress((currentTime / duration) * 100);
      }, { once: true });

      currentTime += interval / 1000; // Convert to seconds
    }, interval);

    processingIntervalRef.current = processInterval;
  }, [videoFile, isRecording, processVideoFrame]);

  const stopProcessing = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Start/stop processing based on isRecording
  React.useEffect(() => {
    if (isRecording && videoFile && !isProcessing) {
      startProcessing();
    } else if (!isRecording && isProcessing) {
      stopProcessing();
    }
  }, [isRecording, videoFile, isProcessing, startProcessing, stopProcessing]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="w-full max-w-4xl">
        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Video File
          </label>
          <input
            type="file"
            accept="video/mp4,video/mov,video/webm"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        {/* Video Player */}
        {videoUrl && (
          <div className="relative">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full max-h-96 rounded-lg"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
            />
            
            {/* Overlay for detection boxes and names */}
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
                  className="absolute bg-green-500 text-white px-2 py-1 text-xs rounded"
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

        {/* Processing Status */}
        {isProcessing && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Processing video...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Group Info */}
        {selectedGroupName && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Selected Group:</strong> {selectedGroupName}
            </p>
            <p className="text-sm text-blue-600">
              Recognition will only work for members of this group.
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">How to use:</h3>
          <ol className="text-sm text-gray-700 space-y-1">
            <li>1. Upload a video file (MP4, MOV, or WebM)</li>
            <li>2. Select a group to enable face recognition</li>
            <li>3. Click "Start Recording" to begin processing</li>
            <li>4. Watch as faces are detected (green boxes) and recognized</li>
            <li>5. The scout count will update in real-time</li>
          </ol>
        </div>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
