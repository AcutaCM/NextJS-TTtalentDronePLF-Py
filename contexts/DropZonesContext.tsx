'use client';

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useDropZones } from '@/hooks/useDropZones';
import { DropZone } from '@/components/layout/DropZones';
import { useLayout } from '@/contexts/LayoutContext';

interface DropZonesContextType {
  zones: DropZone[];
  showZones: boolean;
  draggedComponent: string | null;
  hoveredZone: string | null;
  setShowZones: (show: boolean) => void;
  setDraggedComponent: (componentId: string | null) => void;
  setHoveredZone: (zoneId: string | null) => void;
  occupyZone: (zoneId: string, componentId: string) => boolean;
  releaseZone: (zoneId: string) => void;
  getAvailableZones: (componentId?: string) => DropZone[];
  getZoneForComponent: (componentId: string) => DropZone | null;
  isZoneOccupied: (zoneId: string) => boolean;
  canPlaceComponent: (zoneId: string, componentId: string) => boolean;
  resetZones: () => void;
  findNearestZone: (position: { x: number; y: number }, componentId: string) => DropZone | null;
  snapToZone: (position: { x: number; y: number }, componentId: string) => { x: number; y: number } | null;
  snapToZoneWithSize: (position: { x: number; y: number }, componentId: string) => { zone: DropZone } | null;
}

export const DropZonesContext = createContext<DropZonesContextType | null>(null);

interface DropZonesProviderProps {
  children: ReactNode;
}

export const DropZonesProvider: React.FC<DropZonesProviderProps> = ({ children }) => {
  const dropZonesHook = useDropZones();
  const { isEditMode } = useLayout();

  // 查找最近的可用区域
  const findNearestZone = (position: { x: number; y: number }, componentId: string): DropZone | null => {
    const availableZones = dropZonesHook.getAvailableZones(componentId);
    if (availableZones.length === 0) return null;

    let nearestZone: DropZone | null = null;
    let minDistance = Infinity;

    availableZones.forEach(zone => {
      const zoneCenterX = zone.x + zone.width / 2;
      const zoneCenterY = zone.y + zone.height / 2;
      const distance = Math.sqrt(
        Math.pow(position.x - zoneCenterX, 2) + Math.pow(position.y - zoneCenterY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = zone;
      }
    });

    return nearestZone;
  };

  // 吸附到最近的区域
  const snapToZone = (position: { x: number; y: number }, componentId: string): { x: number; y: number } | null => {
    const nearestZone = findNearestZone(position, componentId);
    if (!nearestZone) return null;

    // 检查组件位置是否在区域范围内或接近区域
    const threshold = 40; // 从100收紧到40，减少“乱飘”
    const isInZone = position.x >= nearestZone.x - threshold && 
                     position.x <= nearestZone.x + nearestZone.width + threshold &&
                     position.y >= nearestZone.y - threshold && 
                     position.y <= nearestZone.y + nearestZone.height + threshold;

    if (isInZone) {
      return {
        x: nearestZone.x,
        y: nearestZone.y
      };
    }

    return null;
  };

  // 吸附到最近的区域并返回区域尺寸
  const snapToZoneWithSize = (position: { x: number; y: number }, componentId: string): { zone: DropZone } | null => {
    const nearestZone = findNearestZone(position, componentId);
    if (!nearestZone) return null;

    const threshold = 40; // 与 snapToZone 保持一致
    const isInZone = position.x >= nearestZone.x - threshold && 
                     position.x <= nearestZone.x + nearestZone.width + threshold &&
                     position.y >= nearestZone.y - threshold && 
                     position.y <= nearestZone.y + nearestZone.height + threshold;

    if (isInZone) {
      return {
        zone: nearestZone
      };
    }

    return null;
  };

  // 退出编辑模式时统一清理覆盖层与拖拽状态
  useEffect(() => {
    if (!isEditMode) {
      dropZonesHook.setShowZones(false);
      dropZonesHook.setDraggedComponent(null);
      dropZonesHook.setHoveredZone(null);
    }
  }, [isEditMode, dropZonesHook]);

  const contextValue: DropZonesContextType = {
    ...dropZonesHook,
    findNearestZone,
    snapToZone,
    snapToZoneWithSize
  };

  return (
    <DropZonesContext.Provider value={contextValue}>
      {children}
    </DropZonesContext.Provider>
  );
};

export const useDropZonesContext = (): DropZonesContextType => {
  const context = useContext(DropZonesContext);
  if (!context) {
    throw new Error('useDropZonesContext must be used within a DropZonesProvider');
  }
  return context;
};