import { useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface GridSnapOptions {
  gridSize?: number;
  snapThreshold?: number;
  enabled?: boolean;
}

interface GridSnapResult {
  position: Position;
  snappedToGrid: boolean;
}

export const useGridSnap = ({
  gridSize = 20,
  snapThreshold = 10,
  enabled = true
}: GridSnapOptions = {}) => {
  
  // 计算最近的网格点
  const snapToGrid = useCallback((position: Position): GridSnapResult => {
    if (!enabled) {
      return {
        position,
        snappedToGrid: false
      };
    }

    // 计算最近的网格点
    const snappedX = Math.round(position.x / gridSize) * gridSize;
    const snappedY = Math.round(position.y / gridSize) * gridSize;

    // 检查是否在吸附阈值内
    const deltaX = Math.abs(position.x - snappedX);
    const deltaY = Math.abs(position.y - snappedY);

    const shouldSnapX = deltaX <= snapThreshold;
    const shouldSnapY = deltaY <= snapThreshold;

    const finalPosition = {
      x: shouldSnapX ? snappedX : position.x,
      y: shouldSnapY ? snappedY : position.y
    };

    return {
      position: finalPosition,
      snappedToGrid: shouldSnapX || shouldSnapY
    };
  }, [gridSize, snapThreshold, enabled]);

  // 计算网格对齐的尺寸
  const snapSizeToGrid = useCallback((size: Size): Size => {
    if (!enabled) {
      return size;
    }

    return {
      width: Math.round(size.width / gridSize) * gridSize,
      height: Math.round(size.height / gridSize) * gridSize
    };
  }, [gridSize, enabled]);

  // 获取网格线位置（用于显示辅助线）
  const getGridLines = useCallback((containerWidth: number, containerHeight: number) => {
    const verticalLines: number[] = [];
    const horizontalLines: number[] = [];

    // 生成垂直线
    for (let x = 0; x <= containerWidth; x += gridSize) {
      verticalLines.push(x);
    }

    // 生成水平线
    for (let y = 0; y <= containerHeight; y += gridSize) {
      horizontalLines.push(y);
    }

    return {
      vertical: verticalLines,
      horizontal: horizontalLines
    };
  }, [gridSize]);

  return {
    snapToGrid,
    snapSizeToGrid,
    getGridLines,
    gridSize
  };
};

export type { Position, Size, GridSnapOptions, GridSnapResult };