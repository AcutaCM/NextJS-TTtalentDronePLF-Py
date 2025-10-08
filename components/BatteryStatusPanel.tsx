'use client';

import React, { useRef, useState } from 'react';
import { useDraggable } from '../hooks/useDraggable';
import { useLayout, useComponentLayout } from '@/contexts/LayoutContext';
import { useSnapAlignment, SnapLine } from '../hooks/useSnapAlignment';
import { useGridSnap } from '../hooks/useGridSnap';

interface BatteryStatusPanelProps {
  batteryLevel: number;
  isCharging?: boolean;
}

export default function BatteryStatusPanel({ batteryLevel, isCharging = false }: BatteryStatusPanelProps) {
  const componentId = 'battery-status';
  const cardRef = useRef<HTMLDivElement>(null);
  const { isEditMode, layouts } = useLayout();
  const { layout, updateLayout } = useComponentLayout(componentId);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  
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
    console.log(`组件 ${componentId} 使用默认位置:`, { x: 1220, y: 440 });
    return { x: 1220, y: 440 };
  };
  
  const getInitialSize = () => {
    if (layout?.size) {
      console.log(`组件 ${componentId} 使用保存的尺寸:`, layout.size);
      return layout.size;
    }
    console.log(`组件 ${componentId} 使用默认尺寸:`, { width: 356, height: 332 });
    return { width: 356, height: 332 };
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
  } = useDraggable({
    initialPosition: getInitialPosition(),
    initialSize: getInitialSize(),
    onDrag: (newPosition) => {
      if (isEditMode) {
        // 首先尝试网格吸附
        const gridSnapResult = snapToGrid(newPosition);
        // 然后尝试组件对齐
        const snapResult = calculateSnapPosition(gridSnapResult.position, size);
        setSnapLines(snapResult.snapLines);
      }
    },
    onDragEnd: (newPosition) => {
      if (isEditMode) {
        // 保存新位置
        updateLayout({ position: newPosition, size });
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

  const getBatteryColor = (level: number) => {
    if (level > 60) return '#4F9CF9'; // 蓝色
    if (level > 30) return '#FF9500'; // 橙色
    return '#FF3B30'; // 红色
  };

  const getBatteryMessage = (level: number) => {
    if (level > 80) return '元气满满呀，快开始飞行';
    if (level > 50) return '电量充足，可以正常飞行';
    if (level > 20) return '电量偏低，建议充电';
    return '电量不足，请立即充电';
  };

  const batteryColor = getBatteryColor(batteryLevel);
  const batteryMessage = getBatteryMessage(batteryLevel);
  const circumference = 2 * Math.PI * 120; // 半径120的圆周长
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (batteryLevel / 100) * circumference;

  return (
    <div
      ref={cardRef}
      className={`absolute ${isEditMode ? 'cursor-move' : ''} ${isDragging ? 'z-50' : 'z-10'}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      onMouseDown={isEditMode ? handleDragStart : undefined}
    >
      {/* 拖拽和调整大小的控制点 */}
      {isEditMode && (
        <>
          {/* 调整大小控制点 */}
          <div
             className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize z-10 opacity-80 hover:opacity-100"
             onMouseDown={(e) => {
               e.stopPropagation();
               handleResizeStart(e, 'bottom-right');
             }}
           />
          {/* 组件标识 */}
          <div className="absolute -top-6 left-0 text-xs text-blue-400 bg-black/50 px-2 py-1 rounded">
            电池状况
          </div>
        </>
      )}
      
      {/* 智能对齐线 */}
      {isEditMode && snapLines.map((line, index) => (
        <div
          key={index}
          className="fixed bg-blue-500 z-50"
          style={{
            left: line.type === 'vertical' ? line.position : 0,
            top: line.type === 'horizontal' ? line.position : 0,
            width: line.type === 'vertical' ? '1px' : '100vw',
            height: line.type === 'horizontal' ? '1px' : '100vh',
            pointerEvents: 'none',
          }}
        />
      ))}
      
      <div className="battery-card w-full h-full rounded-2xl bg-gradient-to-br from-[rgba(26,31,58,0.7)] via-[rgba(42,47,74,0.75)] to-[rgba(30,35,64,0.7)] backdrop-blur-xl border border-[rgba(58,64,99,0.35)] shadow-[0_10px_30px_rgba(2,8,23,0.45)]">
      <div className="p-0 relative overflow-hidden">
        {/* 标题区域 */}
        <div className="absolute top-[6%] left-[6%] z-10">
          <h3 className="text-white font-bold text-[1.125rem] leading-tight mb-1">
            电池状况
          </h3>
          <p className="text-[#8B92B0] font-medium text-[0.875rem] leading-tight">
            Battery Status
          </p>
        </div>

        {/* 圆形进度条容器 */}
        <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 flex items-center justify-center" style={{width: 'min(60%, 240px)', height: 'min(60%, 240px)'}}>
          {/* SVG 圆形进度条 */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 240 240">
            {/* 背景圆环 */}
            <circle
              cx="120"
              cy="120"
              r="110"
              stroke="#2a2f4a"
              strokeWidth="20"
              fill="none"
              className="opacity-50"
            />
            {/* 进度圆环 */}
            <circle
              cx="120"
              cy="120"
              r="110"
              stroke={batteryColor}
              strokeWidth="20"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(79, 156, 249, 0.6))'
              }}
            />
          </svg>
          
          {/* 中心闪电图标 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-[#34C759] rounded-full flex items-center justify-center shadow-lg" style={{width: 'min(23%, 56px)', height: 'min(23%, 56px)'}}>
              <svg className="w-[43%] h-[43%]" viewBox="0 0 24 24" fill="none">
                <path 
                  d="M13 2L3 14h6l-1 8 10-12h-6l1-8z" 
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 底部信息卡片 */}
        <div className="absolute bottom-[6%] left-[6%] right-[6%]" style={{height: 'min(20%, 80px)'}}>
          <div className="w-full h-full bg-gradient-to-r from-[rgba(30,35,64,0.2)] to-[rgba(37,42,69,0.25)] backdrop-blur-lg rounded-[16px] border border-[rgba(58,64,99,0.3)] relative overflow-hidden">
            {/* 背景光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[rgba(79,156,249,0.12)] to-transparent"></div>
            
            {/* 内容 */}
            <div className="relative z-10 h-full flex flex-col justify-center px-[4%]">
              {/* 顶部电量百分比和范围 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8B92B0] text-[0.75rem] font-medium">0%</span>
                <span className="text-white font-bold leading-none" style={{fontSize: 'min(2rem, 8vw)'}}>{batteryLevel}%</span>
                <span className="text-[#8B92B0] text-[0.75rem] font-medium">100%</span>
              </div>
              
              {/* 底部状态文字 */}
              <div className="text-center">
                <span className="text-[#8B92B0] text-[0.75rem] font-medium">
                  {batteryMessage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}