'use client';

import { useState, useCallback, useMemo } from 'react';
import { DropZone } from '@/components/layout/DropZones';

// 预定义的放置区域配置（已清空所有区域）
const DEFAULT_DROP_ZONES: Omit<DropZone, 'occupied'>[] = [];

interface UseDropZonesReturn {
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
}

export const useDropZones = (): UseDropZonesReturn => {
  const [occupiedZones, setOccupiedZones] = useState<Record<string, string>>({});
  const [showZones, setShowZones] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  // 生成完整的区域列表（包含占用状态）
  const zones = useMemo((): DropZone[] => {
    return DEFAULT_DROP_ZONES.map(zone => ({
      ...zone,
      occupied: !!occupiedZones[zone.id]
    }));
  }, [occupiedZones]);

  // 占用区域
  const occupyZone = useCallback((zoneId: string, componentId: string): boolean => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || zone.occupied) return false;
    
    // 检查组件是否兼容
    if (zone.allowedComponents && !zone.allowedComponents.includes(componentId)) {
      return false;
    }
    
    setOccupiedZones(prev => ({ ...prev, [zoneId]: componentId }));
    return true;
  }, [zones]);

  // 释放区域
  const releaseZone = useCallback((zoneId: string) => {
    setOccupiedZones(prev => {
      const newOccupied = { ...prev };
      delete newOccupied[zoneId];
      return newOccupied;
    });
  }, []);

  // 获取可用区域
  const getAvailableZones = useCallback((componentId?: string): DropZone[] => {
    return zones.filter(zone => {
      if (zone.occupied) return false;
      if (componentId && zone.allowedComponents) {
        return zone.allowedComponents.includes(componentId);
      }
      return true;
    });
  }, [zones]);

  // 获取组件所在的区域
  const getZoneForComponent = useCallback((componentId: string): DropZone | null => {
    const zoneId = Object.keys(occupiedZones).find(id => occupiedZones[id] === componentId);
    return zoneId ? zones.find(z => z.id === zoneId) || null : null;
  }, [zones, occupiedZones]);

  // 检查区域是否被占用
  const isZoneOccupied = useCallback((zoneId: string): boolean => {
    return !!occupiedZones[zoneId];
  }, [occupiedZones]);

  // 检查是否可以放置组件
  const canPlaceComponent = useCallback((zoneId: string, componentId: string): boolean => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || zone.occupied) return false;
    
    if (zone.allowedComponents && !zone.allowedComponents.includes(componentId)) {
      return false;
    }
    
    return true;
  }, [zones]);

  // 重置所有区域
  const resetZones = useCallback(() => {
    setOccupiedZones({});
  }, []);

  return {
    zones,
    showZones,
    draggedComponent,
    hoveredZone,
    setShowZones,
    setDraggedComponent,
    setHoveredZone,
    occupyZone,
    releaseZone,
    getAvailableZones,
    getZoneForComponent,
    isZoneOccupied,
    canPlaceComponent,
    resetZones
  };
};