import React, { useEffect, useState } from 'react';
import { backendRecognitionService } from '../services/BackendRecognitionService';

export function FaceRecognitionInitializer() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await backendRecognitionService.initialize();
        setIsInitializing(false);
      } catch (err) {
        console.error('Failed to initialize face recognition:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  if (!isInitializing && !error) {
    return null; // Successfully initialized, don't show anything
  }

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 max-w-sm shadow-lg">
        <div className="flex items-start space-x-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <div className="font-medium text-red-900 text-sm mb-1">
              Face Recognition Error
            </div>
            <div className="text-xs text-red-700">
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Refresh page to retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm mb-1">
            Loading Face Recognition
          </div>
          <div className="text-xs text-blue-700">
            Please wait while AI models load...
          </div>
        </div>
      </div>
    </div>
  );
}

