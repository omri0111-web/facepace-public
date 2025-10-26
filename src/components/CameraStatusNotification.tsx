import { useEffect, useState } from 'react';

interface CameraStatusNotificationProps {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function CameraStatusNotification({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  autoClose = true, 
  duration = 4000 
}: CameraStatusNotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          setShow(false);
          setTimeout(() => onClose?.(), 300);
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      setShow(false);
    }
  }, [isVisible, autoClose, duration, onClose]);

  if (!isVisible && !show) return null;

  const typeStyles = {
    info: 'bg-blue-600/95 border-blue-400/50 text-white',
    success: 'bg-green-600/95 border-green-400/50 text-white',
    error: 'bg-red-600/95 border-red-400/50 text-white',
    warning: 'bg-amber-600/95 border-amber-400/50 text-white'
  };

  const typeIcons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  };

  return (
    <div 
      className={`fixed bottom-24 right-6 z-50 max-w-sm mx-4 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'
      }`}
    >
      <div className={`${typeStyles[type]} backdrop-blur-md rounded-xl shadow-2xl border p-4`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 text-lg">
            {typeIcons[type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>
          {onClose && (
            <button
              onClick={() => {
                setShow(false);
                setTimeout(() => onClose(), 300);
              }}
              className="flex-shrink-0 ml-2 text-white/80 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}