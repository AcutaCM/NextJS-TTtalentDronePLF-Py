'use client';

import React from 'react';
import { useLayout } from '@/contexts/LayoutContext';

interface GridSystemProps {
  gridSize?: number;
  showGrid?: boolean;
  gridColor?: string;
  gridOpacity?: number;
}

const GridSystem: React.FC<GridSystemProps> = ({
  gridSize = 20,
  showGrid = true,
  gridColor = '#ffffff',
  gridOpacity = 0.1
}) => {
  const { isEditMode } = useLayout();

  if (!isEditMode || !showGrid) {
    return null;
  }

  // 创建网格图案
  const gridPattern = (
    <defs>
      <pattern
        id="grid"
        width={gridSize}
        height={gridSize}
        patternUnits="userSpaceOnUse"
      >
        <path
          d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
          fill="none"
          stroke={gridColor}
          strokeWidth="1"
          opacity={gridOpacity}
        />
      </pattern>
    </defs>
  );

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'transparent',
        overflow: 'hidden'
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      >
        {gridPattern}
        <rect 
          width="100%" 
          height="100%" 
          fill="url(#grid)" 
        />
      </svg>
    </div>
  );
};

export default GridSystem;