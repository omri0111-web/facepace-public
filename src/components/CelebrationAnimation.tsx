import React, { useEffect, useState } from 'react';

interface CelebrationAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function CelebrationAnimation({ isVisible, onComplete }: CelebrationAnimationProps) {
  const [show, setShow] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      
      // Create confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 6)],
        size: Math.random() * 8 + 4
      }));
      
      setParticles(newParticles);
      
      // Animate particles
      const animate = () => {
        setParticles(prev => 
          prev.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1 // gravity
          })).filter(particle => particle.y < window.innerHeight + 50)
        );
      };
      
      const interval = setInterval(animate, 16); // 60fps
      
      // Auto-hide after 3 seconds
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onComplete?.(), 500);
      }, 3000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    } else {
      setShow(false);
    }
  }, [isVisible, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Confetti particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.x * 0.1}deg)`,
            boxShadow: '0 0 6px rgba(0,0,0,0.3)'
          }}
        />
      ))}
      
      {/* Success message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-6 rounded-2xl shadow-2xl transform animate-bounce">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold mb-2">Recording Complete!</div>
            <div className="text-lg opacity-90">Great job capturing attendance</div>
          </div>
        </div>
      </div>
      
      {/* Sparkle effects */}
      <div className="absolute inset-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-ping"
            style={{
              left: Math.random() * window.innerWidth,
              top: Math.random() * window.innerHeight,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: '1s'
            }}
          >
            <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
