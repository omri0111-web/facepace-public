import { useState } from 'react';
import { Button } from './ui/button';

interface RecordButtonProps {
  onRecord: (detectedCount: number, totalCapacity: number) => void;
  detectedCount: number;
  totalCapacity: number;
}

export function RecordButton({ onRecord, detectedCount, totalCapacity }: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  const handleRecord = async () => {
    setIsRecording(true);
    
    // Simulate recording process
    setTimeout(() => {
      onRecord(detectedCount, totalCapacity);
      setIsRecording(false);
    }, 1500);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 p-4 md:p-6">
      <div className="flex justify-center">
        <Button
          onClick={handleRecord}
          disabled={isRecording}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white px-6 py-3 md:px-8 md:py-4 rounded-full shadow-xl border-2 border-white/30 backdrop-blur-md transition-all duration-200 active:scale-95"
          size="lg"
        >
          {isRecording ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm md:text-base">Recording...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-white rounded-full"></div>
              <span className="text-sm md:text-base">Record</span>
            </div>
          )}
        </Button>
      </div>
      
      {/* Safe area padding for iPhone */}
      <div className="h-4 md:h-0"></div>
    </div>
  );
}