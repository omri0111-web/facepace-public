import React from 'react';

interface FaceDetectionFrameProps {
  // Position (percentage-based for responsiveness)
  top: string;
  left?: string;
  right?: string;
  
  // Size (percentage-based for responsiveness)
  width: string;
  height: string;
  
  // Person info
  name: string;
  confidence: number;
  
  // Label positioning
  labelPosition?: 'left' | 'right';
  
  // Color coding
  color?: 'green' | 'orange';
  
  // Styling options (deprecated but kept for backwards compatibility)
  borderColor?: string;
  bgColor?: string;
  labelBgColor?: string;
}

export function FaceDetectionFrame({
  top,
  left,
  right,
  width,
  height,
  name,
  confidence,
  labelPosition = 'left',
  color = 'green',
  borderColor,
  bgColor,
  labelBgColor
}: FaceDetectionFrameProps) {
  // Color mapping based on attendance status
  const colorMap = {
    green: {
      border: 'border-green-400',
      label: 'bg-green-500',
      ping: 'border-green-300'
    },
    orange: {
      border: 'border-orange-400',
      label: 'bg-orange-500', 
      ping: 'border-orange-300'
    }
  };
  
  // Use color prop or fallback to legacy props
  const currentColors = colorMap[color];
  const finalBorderColor = borderColor || currentColors.border;
  const finalLabelColor = labelBgColor || currentColors.label;
  const finalPingColor = currentColors.ping;
  // Position classes
  const positionClasses = [
    `top-[${top}]`,
    left ? `left-[${left}]` : '',
    right ? `right-[${right}]` : '',
    `w-[${width}]`,
    `h-[${height}]`
  ].filter(Boolean).join(' ');

  // Label alignment
  const labelClasses = labelPosition === 'right' 
    ? 'absolute -top-8 right-0' 
    : 'absolute -top-8 left-0';

  return (
    <div className={`absolute border-3 ${finalBorderColor} rounded-lg ${positionClasses}`}>
      {/* Name and Confidence Label */}
      <div className={`${labelClasses} ${finalLabelColor} text-white text-xs px-2 py-1 rounded-md font-medium whitespace-nowrap`}>
        {name}
        <div className="text-[10px] opacity-80">{confidence}%</div>
      </div>
      
      {/* Animated ping effect */}
      <div className={`absolute inset-0 border-2 ${finalPingColor} animate-ping opacity-40 rounded-lg`}></div>
    </div>
  );
}