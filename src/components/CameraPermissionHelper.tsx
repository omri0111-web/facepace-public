import { Button } from './ui/button';

interface CameraPermissionHelperProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function CameraPermissionHelper({ isOpen, onClose, onRetry }: CameraPermissionHelperProps) {
  if (!isOpen) return null;

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'your browser';
  };

  const browser = getBrowserName();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/30 shadow-xl rounded-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600">📷</span>
              </div>
              <h3 className="text-lg font-medium">Camera Access Needed</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-amber-600">⚠️</span>
                <h4 className="font-medium text-amber-800">Camera Permission Required</h4>
              </div>
              <p className="text-sm text-amber-700">
                Real-time face detection needs camera access to count scouts automatically.
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">How to enable camera access:</h4>
              
              <div className="space-y-2">
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">1</div>
                  <div className="text-sm text-gray-700">
                    <strong>Look for camera icon</strong> in your browser's address bar (URL bar)
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">2</div>
                  <div className="text-sm text-gray-700">
                    <strong>Click the camera icon</strong> and select "Allow" or "Always allow"
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm flex-shrink-0 mt-0.5">3</div>
                  <div className="text-sm text-gray-700">
                    <strong>Refresh the page</strong> or click "Try Again" below
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-green-600">🔒</span>
                <h5 className="text-sm font-medium text-green-800">Privacy Guaranteed</h5>
              </div>
              <p className="text-xs text-green-700">
                Your camera feed never leaves your device. All face detection happens locally - 
                no video is recorded, stored, or transmitted anywhere.
              </p>
            </div>
            
            <div className="flex space-x-2 pt-2">
              <Button 
                onClick={onRetry}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                🎯 Enable Camera
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                className="flex-1"
              >
                Use Demo Mode
              </Button>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => window.open('https://support.google.com/chrome/answer/2693767', '_blank')}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Need help? View browser support guide →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}