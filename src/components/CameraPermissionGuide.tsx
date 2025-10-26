import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface CameraPermissionGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  error?: string;
}

export function CameraPermissionGuide({ isOpen, onClose, onRetry, error }: CameraPermissionGuideProps) {
  const [activeTab, setActiveTab] = useState<'chrome' | 'firefox' | 'safari' | 'mobile'>('chrome');

  if (!isOpen) return null;

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome') || userAgent.includes('edge')) {
      return {
        browser: 'Chrome/Edge',
        steps: [
          'Look for the camera icon 📷 in the address bar (left side)',
          'Click on the camera icon',
          'Select "Always allow on this site"',
          'Click "Done" and refresh the page'
        ],
        alternative: 'Go to Settings > Privacy and Security > Site Settings > Camera > Add this site to "Allowed" list'
      };
    } else if (userAgent.includes('firefox')) {
      return {
        browser: 'Firefox',
        steps: [
          'Look for the shield icon 🛡️ in the address bar',
          'Click on the shield icon',
          'Click "Turn off Blocking for This Site"',
          'Refresh the page and allow camera access'
        ],
        alternative: 'Go to Settings > Privacy & Security > Permissions > Camera > Settings > Add this site'
      };
    } else if (userAgent.includes('safari')) {
      return {
        browser: 'Safari',
        steps: [
          'Go to Safari menu > Settings (or Preferences)',
          'Click on "Websites" tab',
          'Find "Camera" in the left sidebar',
          'Find this website and change setting to "Allow"'
        ],
        alternative: 'You can also check the address bar for a camera icon to click'
      };
    } else {
      return {
        browser: 'Your Browser',
        steps: [
          'Look for a camera icon 📷 in the address bar',
          'Click the icon and select "Allow"',
          'If no icon, check browser settings for camera permissions',
          'Add this website to allowed camera sites'
        ],
        alternative: 'Check your browser\'s privacy/security settings for camera permissions'
      };
    }
  };

  const instructions = getBrowserInstructions();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">📷 Camera Access Guide</h2>
              <p className="text-gray-600 text-sm">
                This app needs camera access for face detection. Follow the steps below to enable it.
              </p>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="h-8 w-8 p-0">
              ✕
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <div>
                  <div className="font-medium text-red-800 mb-1">Current Issue:</div>
                  <div className="text-red-700 text-sm">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Browser-specific instructions */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-800">
                Step-by-step for {instructions.browser}:
              </h3>
              <div className="space-y-3">
                {instructions.steps.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">Alternative method:</div>
                <div className="text-xs text-gray-600">{instructions.alternative}</div>
              </div>
            </div>

            {/* Mobile specific note */}
            {/Mobi|Android/i.test(navigator.userAgent) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">📱</span>
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Mobile Device Note:</div>
                    <div className="text-blue-700 text-sm">
                      Make sure you're using a secure connection (https://) and your camera isn't being used by another app.
                      Some mobile browsers may require refreshing the page after granting permission.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Common issues */}
            <div>
              <h3 className="font-semibold mb-3 text-gray-800">Common Issues & Solutions:</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start">
                  <span className="text-yellow-500 mr-2 mt-0.5">🔒</span>
                  <div>
                    <span className="font-medium">Permission blocked:</span>
                    <span className="text-gray-600 ml-1">Clear browser data for this site and try again</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-500 mr-2 mt-0.5">📷</span>
                  <div>
                    <span className="font-medium">Camera in use:</span>
                    <span className="text-gray-600 ml-1">Close other apps/tabs using your camera</span>
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-yellow-500 mr-2 mt-0.5">🔌</span>
                  <div>
                    <span className="font-medium">No camera found:</span>
                    <span className="text-gray-600 ml-1">Check camera connection and drivers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
            <Button onClick={onRetry} className="flex-1">
              🔄 Try Camera Again
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Continue Demo Mode
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}