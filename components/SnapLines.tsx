'use client';

import React from 'react';
import { SnapLine } from '../hooks/useSnapAlignment';

interface SnapLinesProps {
  snapLines: SnapLine[];
  containerRef?: React.RefObject<HTMLElement>;
}

export const SnapLines: React.FC<SnapLinesProps> = ({ snapLines }) => {
  if (snapLines.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <svg 
        width="100%" 
        height="100%" 
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        {snapLines.map((line, index) => (
          <line
            key={index}
            x1={line.type === 'vertical' ? line.position : line.start}
            y1={line.type === 'vertical' ? line.start : line.position}
            x2={line.type === 'vertical' ? line.position : line.end}
            y2={line.type === 'vertical' ? line.end : line.position}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeOpacity="0.8"
            strokeDasharray="4 4"
          />
        ))}
      </svg>
    </div>
  );
};

export default SnapLines;