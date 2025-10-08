'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface DropZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  occupied: boolean;
  allowedComponents?: string[];
  category: 'control' | 'display' | 'analysis' | 'utility';
}

interface DropZonesProps {
  zones: DropZone[];
  showZones: boolean;
  onZoneHover?: (zoneId: string | null) => void;
  draggedComponent?: string | null;
  // 新增：容器偏移（相对于视口），用于让插槽与主内容容器坐标系对齐
  containerOffset?: { left: number; top: number; width?: number; height?: number };
}

const DropZones: React.FC<DropZonesProps> = ({
  zones,
  showZones,
  onZoneHover,
  draggedComponent,
  containerOffset = { left: 0, top: 64 }
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'control': return 'rgba(59, 130, 246, 0.2)'; // 蓝色 - 控制面板
      case 'display': return 'rgba(16, 185, 129, 0.2)'; // 绿色 - 显示面板
      case 'analysis': return 'rgba(245, 158, 11, 0.2)'; // 黄色 - 分析面板
      case 'utility': return 'rgba(139, 92, 246, 0.2)'; // 紫色 - 工具面板
      default: return 'rgba(156, 163, 175, 0.2)'; // 灰色 - 默认
    }
  };

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case 'control': return 'rgba(59, 130, 246, 0.5)';
      case 'display': return 'rgba(16, 185, 129, 0.5)';
      case 'analysis': return 'rgba(245, 158, 11, 0.5)';
      case 'utility': return 'rgba(139, 92, 246, 0.5)';
      default: return 'rgba(156, 163, 175, 0.5)';
    }
  };

  const isZoneCompatible = (zone: DropZone, componentId?: string | null) => {
    if (!componentId || !zone.allowedComponents) return true;
    return zone.allowedComponents.includes(componentId);
  };

  if (!showZones) return null;

  return (
    <div
      className="fixed pointer-events-none z-[5]"
      style={{
        top: containerOffset.top,
        left: containerOffset.left,
        width: containerOffset.width ?? 'auto',
        height: containerOffset.height ?? 'auto',
      }}
    >
      {zones.map((zone) => {
        const isCompatible = isZoneCompatible(zone, draggedComponent);
        const isHighlighted = draggedComponent && isCompatible && !zone.occupied;
        
        return (
          <motion.div
            key={zone.id}
            className="absolute border-2 border-dashed rounded-lg pointer-events-auto"
            style={{
              left: zone.x,
              top: zone.y,
              width: zone.width,
              height: zone.height,
              backgroundColor: isHighlighted 
                ? getCategoryColor(zone.category)
                : zone.occupied 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'rgba(156, 163, 175, 0.1)',
              borderColor: isHighlighted
                ? getCategoryBorderColor(zone.category)
                : zone.occupied
                  ? 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(156, 163, 175, 0.3)',
              opacity: draggedComponent ? 1 : 0.3,
            }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ 
              scale: isHighlighted ? 1.02 : 1, 
              opacity: draggedComponent ? 1 : 0.3 
            }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => onZoneHover?.(zone.id)}
            onMouseLeave={() => onZoneHover?.(null)}
          >
            {/* 区域标签 */}
            <div className="absolute -top-6 left-0 px-2 py-1 bg-black/60 text-white text-xs rounded backdrop-blur-sm">
              {zone.name}
              {zone.occupied && (
                <span className="ml-1 text-red-400">已占用</span>
              )}
            </div>
            
            {/* 区域类型指示器 */}
            <div 
              className="absolute top-2 right-2 w-3 h-3 rounded-full"
              style={{ backgroundColor: getCategoryBorderColor(zone.category) }}
            />
            
            {/* 兼容性指示 */}
            {draggedComponent && !isCompatible && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-red-500/80 text-white px-2 py-1 rounded text-xs">
                  不兼容
                </div>
              </div>
            )}
            
            {/* 高亮效果 */}
            {isHighlighted && (
              <motion.div
                className="absolute inset-0 border-2 border-white/30 rounded-lg"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default DropZones;