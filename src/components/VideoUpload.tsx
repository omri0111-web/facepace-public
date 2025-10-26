import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface VideoUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoSelect: (videoUrl: string) => void;
}

export function VideoUpload({ isOpen, onClose, onVideoSelect }: VideoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    // Check file size (limit to 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Create object URL for the video
          const videoUrl = URL.createObjectURL(file);
          onVideoSelect(videoUrl);
          
          setUploading(false);
          onClose();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-white">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-medium">Upload Video</h3>
            <Button onClick={onClose} variant="ghost" size="sm">
              ✕
            </Button>
          </div>

          {uploading ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📹</span>
                </div>
                <h4 className="font-medium mb-2">Processing Video</h4>
                <p className="text-sm text-gray-600">Please wait while we process your video...</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Upload Progress</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">📹</span>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Upload Video for Analysis</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload a video file to test face detection and attendance tracking
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={openFileDialog} className="w-full">
                      Choose Video File
                    </Button>
                    <p className="text-xs text-gray-500">
                      or drag and drop a video file here
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Supported formats: MP4, MOV, AVI, WebM</p>
                <p>Maximum file size: 100MB</p>
                <p>Recommended: 1080p resolution or lower</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}