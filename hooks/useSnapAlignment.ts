import { useCallback, useMemo } from 'react';
import { ComponentLayout } from '../contexts/LayoutContext';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface SnapResult {
  position: Position;
  snapLines: SnapLine[];
}

interface SnapLine {
  type: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
}

interface UseSnapAlignmentOptions {
  snapThreshold?: number;
  layouts: Record<string, ComponentLayout>;
  currentId: string;
}

export const useSnapAlignment = ({
  snapThreshold = 10,
  layouts,
  currentId
}: UseSnapAlignmentOptions) => {
  // 页面偏移量：TopNavbar高度64px + 容器padding 12px
  const PAGE_OFFSET_TOP = 64 + 12;
  const PAGE_OFFSET_LEFT = 12;
  
  // 获取其他组件的布局信息
  const otherLayouts = useMemo(() => {
    return Object.values(layouts).filter(layout => layout.id !== currentId);
  }, [layouts, currentId]);

  // 计算对齐位置
  const calculateSnapPosition = useCallback((position: Position, size: Size): SnapResult => {
    const snapLines: SnapLine[] = [];
    let snappedPosition = { ...position };
    
    // 安全检查输入参数
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return { position: snappedPosition, snapLines };
    }
    if (!size || typeof size.width !== 'number' || typeof size.height !== 'number') {
      return { position: snappedPosition, snapLines };
    }
    
    const currentLeft = position.x;
    const currentRight = position.x + size.width;
    const currentTop = position.y;
    const currentBottom = position.y + size.height;
    const currentCenterX = position.x + size.width / 2;
    const currentCenterY = position.y + size.height / 2;

    // 检查与其他组件的对齐
    for (const otherLayout of otherLayouts) {
      // 安全检查其他布局对象
      if (!otherLayout || !otherLayout.position || !otherLayout.size) {
        continue;
      }
      if (typeof otherLayout.position.x !== 'number' || typeof otherLayout.position.y !== 'number') {
        continue;
      }
      if (typeof otherLayout.size.width !== 'number' || typeof otherLayout.size.height !== 'number') {
        continue;
      }
      
      const otherLeft = otherLayout.position.x;
      const otherRight = otherLayout.position.x + otherLayout.size.width;
      const otherTop = otherLayout.position.y;
      const otherBottom = otherLayout.position.y + otherLayout.size.height;
      const otherCenterX = otherLayout.position.x + otherLayout.size.width / 2;
      const otherCenterY = otherLayout.position.y + otherLayout.size.height / 2;

      // 垂直对齐检查
      // 左边对齐
      if (Math.abs(currentLeft - otherLeft) <= snapThreshold) {
        snappedPosition.x = otherLeft;
        snapLines.push({
          type: 'vertical',
          position: otherLeft + PAGE_OFFSET_LEFT,
          start: Math.min(currentTop, otherTop) + PAGE_OFFSET_TOP,
          end: Math.max(currentBottom, otherBottom) + PAGE_OFFSET_TOP
        });
      }
      // 右边对齐
      else if (Math.abs(currentRight - otherRight) <= snapThreshold) {
        snappedPosition.x = otherRight - size.width;
        snapLines.push({
          type: 'vertical',
          position: otherRight + PAGE_OFFSET_LEFT,
          start: Math.min(currentTop, otherTop) + PAGE_OFFSET_TOP,
          end: Math.max(currentBottom, otherBottom) + PAGE_OFFSET_TOP
        });
      }
      // 左边对齐到右边
      else if (Math.abs(currentLeft - otherRight) <= snapThreshold) {
        snappedPosition.x = otherRight;
        snapLines.push({
          type: 'vertical',
          position: otherRight,
          start: Math.min(currentTop, otherTop),
          end: Math.max(currentBottom, otherBottom)
        });
      }
      // 右边对齐到左边
      else if (Math.abs(currentRight - otherLeft) <= snapThreshold) {
        snappedPosition.x = otherLeft - size.width;
        snapLines.push({
          type: 'vertical',
          position: otherLeft + PAGE_OFFSET_LEFT,
          start: Math.min(currentTop, otherTop) + PAGE_OFFSET_TOP,
          end: Math.max(currentBottom, otherBottom) + PAGE_OFFSET_TOP
        });
      }
      // 中心对齐
      else if (Math.abs(currentCenterX - otherCenterX) <= snapThreshold) {
        snappedPosition.x = otherCenterX - size.width / 2;
        snapLines.push({
          type: 'vertical',
          position: otherCenterX + PAGE_OFFSET_LEFT,
          start: Math.min(currentTop, otherTop) + PAGE_OFFSET_TOP,
          end: Math.max(currentBottom, otherBottom) + PAGE_OFFSET_TOP
        });
      }

      // 水平对齐检查
      // 顶部对齐
      if (Math.abs(currentTop - otherTop) <= snapThreshold) {
        snappedPosition.y = otherTop;
        snapLines.push({
          type: 'horizontal',
          position: otherTop + PAGE_OFFSET_TOP,
          start: Math.min(currentLeft, otherLeft) + PAGE_OFFSET_LEFT,
          end: Math.max(currentRight, otherRight) + PAGE_OFFSET_LEFT
        });
      }
      // 底部对齐
      else if (Math.abs(currentBottom - otherBottom) <= snapThreshold) {
        snappedPosition.y = otherBottom - size.height;
        snapLines.push({
          type: 'horizontal',
          position: otherBottom + PAGE_OFFSET_TOP,
          start: Math.min(currentLeft, otherLeft) + PAGE_OFFSET_LEFT,
          end: Math.max(currentRight, otherRight) + PAGE_OFFSET_LEFT
        });
      }
      // 顶部对齐到底部
      else if (Math.abs(currentTop - otherBottom) <= snapThreshold) {
        snappedPosition.y = otherBottom;
        snapLines.push({
          type: 'horizontal',
          position: otherBottom + PAGE_OFFSET_TOP,
          start: Math.min(currentLeft, otherLeft) + PAGE_OFFSET_LEFT,
          end: Math.max(currentRight, otherRight) + PAGE_OFFSET_LEFT
        });
      }
      // 底部对齐到顶部
      else if (Math.abs(currentBottom - otherTop) <= snapThreshold) {
        snappedPosition.y = otherTop - size.height;
        snapLines.push({
          type: 'horizontal',
          position: otherTop + PAGE_OFFSET_TOP,
          start: Math.min(currentLeft, otherLeft) + PAGE_OFFSET_LEFT,
          end: Math.max(currentRight, otherRight) + PAGE_OFFSET_LEFT
        });
      }
      // 中心对齐
      else if (Math.abs(currentCenterY - otherCenterY) <= snapThreshold) {
        snappedPosition.y = otherCenterY - size.height / 2;
        snapLines.push({
          type: 'horizontal',
          position: otherCenterY + PAGE_OFFSET_TOP,
          start: Math.min(currentLeft, otherLeft) + PAGE_OFFSET_LEFT,
          end: Math.max(currentRight, otherRight) + PAGE_OFFSET_LEFT
        });
      }
    }

    return {
      position: snappedPosition,
      snapLines
    };
  }, [otherLayouts, snapThreshold]);

  return {
    calculateSnapPosition
  };
};

export type { SnapResult, SnapLine };