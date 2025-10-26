interface FaceDetectionOverlayProps {
  detectedCount: number;
  totalCapacity: number;
}

export function FaceDetectionOverlay({ detectedCount, totalCapacity }: FaceDetectionOverlayProps) {
  return (
    <div className="absolute top-16 left-0 right-0 z-10 p-4 md:top-20 md:p-6">
      <div className="flex justify-center">
        <div className="bg-black/60 backdrop-blur-md rounded-2xl px-4 py-3 md:px-6 md:py-4 border border-white/30 shadow-xl">
          <div className="text-center">
            <div className="text-white/80 text-xs md:text-sm mb-1">People Detected</div>
            <div className="text-white text-2xl md:text-3xl font-medium tracking-wider">
              {detectedCount}/{totalCapacity}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}