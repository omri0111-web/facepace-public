import { useState } from 'react';
import { Button } from './ui/button';

interface CameraFeatureGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CameraFeatureGuide({ isOpen, onClose }: CameraFeatureGuideProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 text-blue-600">🎯</div>
              <h3 className="text-lg font-medium">Real-Time Face Detection</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">✨ New Features Active!</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Live camera with face detection</li>
                <li>• Visual detection frames</li>
                <li>• Front/rear camera switching</li>
                <li>• AI-powered scout counting</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">📱 How it works:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Green frames show detected faces</li>
                <li>• Names appear when scouts are recognized</li>
                <li>• Use 🔄 button to switch cameras</li>
                <li>• Works offline - no data sent anywhere</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2">⚡ Performance:</h4>
              <p className="text-sm text-amber-700">
                The app automatically falls back to simulation mode if face detection is too intensive for your device.
              </p>
            </div>
            
            <Button onClick={onClose} className="w-full">
              Got it! Start Detecting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}