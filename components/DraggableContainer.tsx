'use client';

import React, { useRef, useState, ReactNode } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { useLayout, useComponentLayout } from '@/contexts/LayoutContext';
import { useSnapAlignment, SnapLine } from '../hooks/useSnapAlignment';
import { useGridSnap } from '../hooks/useGridSnap';
import { useDropZonesContext } from '@/contexts/DropZonesContext';
import InternalDraggable from './InternalDraggable';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface DraggableContainerProps {
  componentId: string;
  children: ReactNode;
  initialPosition?: Position;
  initialSize?: Size;
  enableContentScaling?: boolean;
  enableInternalDragging?: boolean;
  enableDrag?: boolean;
  enableResize?: boolean;
  showResizeHandles?: boolean;
  enableDropZones?: boolean;
  strictDropZones?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function DraggableContainer({
  componentId,
  children,
  initialPosition = { x: 0, y: 0 },
  initialSize = { width: 300, height: 200 },
  enableContentScaling = false,
  enableInternalDragging = false,
  enableDrag = true,
  enableResize = true,
  showResizeHandles = true,
  enableDropZones = false,
  strictDropZones = false,
  className = '',
  style = {},
}: DraggableContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isEditMode, layouts } = useLayout();
  const { layout, updateLayout } = useComponentLayout(componentId);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const dropZonesContext = useDropZonesContext();
  
  // 智能对齐hook
  const { calculateSnapPosition } = useSnapAlignment({
    layouts,
    currentId: componentId,
    snapThreshold: 10
  });
  
  // 网格吸附hook
  const { snapToGrid } = useGridSnap({
    gridSize: 20,
    snapThreshold: 10,
    enabled: isEditMode
  });
  
  // 获取初始位置和尺寸
  const getInitialPosition = () => {
    if (layout?.position) {
      console.log(`组件 ${componentId} 使用保存的位置:`, layout.position);
      return layout.position;
    }
    console.log(`组件 ${componentId} 使用默认位置:`, initialPosition);
    return initialPosition;
  };
  
  const getInitialSize = () => {
    if (layout?.size) {
      console.log(`组件 ${componentId} 使用保存的尺寸:`, layout.size);
      return layout.size;
    }
    console.log(`组件 ${componentId} 使用默认尺寸:`, initialSize);
    return initialSize;
  };
  
  const {
    position,
    size,
    isDragging,
    isResizing,
    handleDragStart,
    handleResizeStart,
    setPosition,
    setSize,
    setSizeForced,
  } = useDraggable({
    initialPosition: getInitialPosition(),
    initialSize: getInitialSize(),
    onDragStart: () => {
      if (enableDropZones && dropZonesContext) {
        dropZonesContext.setDraggedComponent(componentId);
        dropZonesContext.setShowZones(true);
      }
    },
    onDrag: (newPosition) => {
      if (isEditMode) {
        // 首先尝试网格吸附
        const gridSnapResult = snapToGrid(newPosition);
        // 然后尝试组件对齐（仅用于显示辅助线）
        const snapResult = calculateSnapPosition(gridSnapResult.position, size);
        setSnapLines(snapResult.snapLines);
    
        // DropZones 高亮最近且可放置的插槽（非严格模式下只要接近就高亮）
        if (enableDropZones && dropZonesContext) {
          const zoneResult = dropZonesContext.snapToZoneWithSize(newPosition, componentId);
          if (
            zoneResult && (
              strictDropZones ? dropZonesContext.canPlaceComponent(zoneResult.zone.id, componentId) : true
            )
          ) {
            dropZonesContext.setHoveredZone(zoneResult.zone.id);
          } else {
            dropZonesContext.setHoveredZone(null);
          }
        }
      }
    },
    onDragEnd: (newPosition) => {
      let finalPosition = newPosition;
      let finalSize = size;
  
      if (enableDropZones && dropZonesContext) {
        const zoneResult = dropZonesContext.snapToZoneWithSize(newPosition, componentId);
        const prevZone = dropZonesContext.getZoneForComponent(componentId);
  
        const canSnap = zoneResult && (strictDropZones ? dropZonesContext.canPlaceComponent(zoneResult.zone.id, componentId) : true);
  
        if (canSnap && zoneResult) {
          const zone = zoneResult.zone;
          // 切换占用：释放之前占用的插槽
          if (prevZone && prevZone.id !== zone.id) {
            dropZonesContext.releaseZone(prevZone.id);
          }
  
          // 占用新插槽（严格模式必须成功；非严格模式尝试，不成功也继续吸附）
          let occupied = false;
          if (strictDropZones) {
            occupied = dropZonesContext.occupyZone(zone.id, componentId);
            if (!occupied) {
              // 严格模式下占用失败则不吸附
              dropZonesContext.setHoveredZone(null);
              dropZonesContext.setDraggedComponent(null);
              dropZonesContext.setShowZones(false);
              if (isEditMode) {
                updateLayout({ position: finalPosition, size: finalSize });
                setSnapLines([]);
              }
              return;
            }
          } else {
            occupied = dropZonesContext.occupyZone(zone.id, componentId);
            // 非严格模式：占用失败也允许吸附与调整尺寸
          }
  
          // 吸附到插槽位置
          finalPosition = { x: zone.x, y: zone.y };
          setPosition(finalPosition);
  
          // 若插槽具有明确尺寸，则强制调整为插槽尺寸
          if (zone.width > 0 && zone.height > 0) {
            setSizeForced({ width: zone.width, height: zone.height });
            finalSize = { width: zone.width, height: zone.height };
          }
        } else {
          // 未放入任何插槽则释放之前的占用
          if (prevZone) {
            dropZonesContext.releaseZone(prevZone.id);
          }
        }
  
        // 清理拖拽态与高亮
        dropZonesContext.setHoveredZone(null);
        dropZonesContext.setDraggedComponent(null);
        dropZonesContext.setShowZones(false);
      }
  
      if (isEditMode) {
        // 保存最终位置与尺寸
        updateLayout({ position: finalPosition, size: finalSize });
        setSnapLines([]);
      }
    },
    onResizeEnd: (newSize) => {
      if (isEditMode) {
        // 保存新尺寸
        updateLayout({ position, size: newSize });
      }
    }
  });

  // 渲染调整大小手柄
  const renderResizeHandles = () => {
    if (!isEditMode || !enableResize || !showResizeHandles) return null;

    const handleStyle = {
      position: 'absolute' as const,
      backgroundColor: '#3b82f6',
      border: '1px solid #1e40af',
      borderRadius: '2px',
      zIndex: 1000,
    };

    return (
      <>
        {/* 角落手柄 */}
        <div
          style={{
            ...handleStyle,
            width: '8px',
            height: '8px',
            top: '-4px',
            left: '-4px',
            cursor: 'nw-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'top-left')}
        />
        <div
          style={{
            ...handleStyle,
            width: '8px',
            height: '8px',
            top: '-4px',
            right: '-4px',
            cursor: 'ne-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'top-right')}
        />
        <div
          style={{
            ...handleStyle,
            width: '8px',
            height: '8px',
            bottom: '-4px',
            left: '-4px',
            cursor: 'sw-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
        />
        <div
          style={{
            ...handleStyle,
            width: '8px',
            height: '8px',
            bottom: '-4px',
            right: '-4px',
            cursor: 'se-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
        />
        
        {/* 边缘手柄 */}
        <div
          style={{
            ...handleStyle,
            width: '100%',
            height: '4px',
            top: '-2px',
            left: '0',
            cursor: 'n-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        />
        <div
          style={{
            ...handleStyle,
            width: '100%',
            height: '4px',
            bottom: '-2px',
            left: '0',
            cursor: 's-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        />
        <div
          style={{
            ...handleStyle,
            width: '4px',
            height: '100%',
            top: '0',
            left: '-2px',
            cursor: 'w-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'left')}
        />
        <div
          style={{
            ...handleStyle,
            width: '4px',
            height: '100%',
            top: '0',
            right: '-2px',
            cursor: 'e-resize',
          }}
          onMouseDown={(e) => handleResizeStart(e, 'right')}
        />
      </>
    );
  };

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: size.width,
    height: size.height,
    zIndex: isDragging || isResizing ? 50 : 10,
    cursor: isEditMode && enableDrag ? 'move' : 'default',
    ...style,
  };

  const contentStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    transform: enableContentScaling ? `scale(${Math.min(size.width / initialSize.width, size.height / initialSize.height)})` : 'none',
    transformOrigin: 'top left',
  };

  return (
    <div
      ref={containerRef}
      className={`${className} ${isEditMode ? 'border border-dashed border-blue-400/50' : ''}`}
      style={containerStyle}
      onMouseDown={isEditMode && enableDrag ? handleDragStart : undefined}
    >
      {/* 调整大小手柄 */}
      {renderResizeHandles()}
      
      {/* 内容区域 */}
      <div style={contentStyle}>
        {enableInternalDragging ? (
          <InternalDraggable>{children}</InternalDraggable>
        ) : (
          children
        )}
      </div>
      
      {/* 吸附线 */}
      {snapLines.map((line, index) => (
        <div
          key={index}
          style={{
            position: 'fixed',
            backgroundColor: '#3b82f6',
            zIndex: 1000,
            pointerEvents: 'none',
            ...(line.type === 'vertical'
              ? {
                  left: line.position,
                  top: 0,
                  width: '1px',
                  height: '100vh',
                }
              : {
                  left: 0,
                  top: line.position,
                  width: '100vw',
                  height: '1px',
                }),
          }}
        />
      ))}
    </div>
  );
}

export type { Position, Size, DraggableContainerProps };