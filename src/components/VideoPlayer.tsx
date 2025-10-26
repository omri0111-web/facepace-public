import { useRef, useEffect, useState } from 'react';
import { Button } from './ui/button';

interface VideoPlayerProps {
  videoUrl: string;
  onFaceCountChange: (detectedCount: number, totalCapacity: number) => void;
  onClose: () => void;
}

export function VideoPlayer({ videoUrl, onFaceCountChange, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Simulate face detection based on video time
      const progress = video.currentTime / video.duration;
      const baseCount = Math.floor(Math.random() * 8) + 3; // 3-10 base faces
      const variation = Math.sin(progress * Math.PI * 4) * 3; // Sine wave variation
      const detectedFaces = Math.max(1, Math.floor(baseCount + variation));
      
      onFaceCountChange(detectedFaces, 51);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onFaceCountChange]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        playsInline
      />
      
      {/* Video Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="flex items-center space-x-2 text-white text-sm">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleSeek}
              className="flex-1 h-1 bg-white/30 rounded-lg appearance-none slider"
            />
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                onClick={togglePlayPause}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? '⏸️' : '▶️'}
              </Button>
              
              <div className="text-white text-sm">
                Video Analysis Mode
              </div>
            </div>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 text-xs md:text-sm px-2 md:px-3"
            >
              <span className="hidden md:inline">Back to Camera</span>
              <span className="md:hidden">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Analysis Indicator */}
      <div className="absolute top-4 right-4 bg-purple-500/90 text-white px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-medium">
        <span className="hidden md:inline">VIDEO ANALYSIS</span>
        <span className="md:hidden">ANALYSIS</span>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}