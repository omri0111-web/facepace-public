import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

// Custom hook to get window size
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export function CelebrationAnimation({ isVisible, onComplete }: CelebrationAnimationProps) {
  const [show, setShow] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onComplete?.(), 500);
      }, 3000);
      
      return () => {
        clearTimeout(timer);
      };
    } else {
      setShow(false);
    }
  }, [isVisible, onComplete]);

  if (!show) return null;

  const sideWidth = 300; // Width of confetti zone on each side
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Left side confetti */}
      <div className="absolute left-0 top-0" style={{ width: sideWidth, height: height }}>
        <Confetti
          width={sideWidth}
          height={height}
          numberOfPieces={200}
          recycle={false}
          confettiSource={{ x: 0, y: 0, w: 50, h: height }}
          colors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']}
        />
      </div>
      
      {/* Right side confetti */}
      <div className="absolute right-0 top-0" style={{ width: sideWidth, height: height }}>
        <Confetti
          width={sideWidth}
          height={height}
          numberOfPieces={200}
          recycle={false}
          confettiSource={{ x: sideWidth - 50, y: 0, w: 50, h: height }}
          colors={['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3']}
        />
      </div>
    </div>
  );
}
