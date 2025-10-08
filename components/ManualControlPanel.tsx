'use client';

import React, { useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';

interface ManualControlPanelProps {
  onTakeoff?: () => void;
  onLanding?: () => void;
  onDirectionControl?: (direction: 'up' | 'down' | 'left' | 'right' | 'center') => void;
  onForward?: () => void;
  onBackward?: () => void;
  onRotate?: (dir: 'cw' | 'ccw') => void;
}

const ManualControlPanel: React.FC<ManualControlPanelProps> = ({
  onTakeoff,
  onLanding,
  onDirectionControl,
  onForward,
  onBackward,
  onRotate,
}) => {
  const controlIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isControllingRef = useRef<boolean>(false);

  // 开始控制
  const startControl = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'center') => {
    if (isControllingRef.current) return;
    
    isControllingRef.current = true;
    onDirectionControl?.(direction);
    
    // 每100ms发送一次控制指令，确保连续控制
    controlIntervalRef.current = setInterval(() => {
      if (isControllingRef.current) {
        onDirectionControl?.(direction);
      }
    }, 100);
  }, [onDirectionControl]);

  // 停止控制
  const stopControl = useCallback(() => {
    if (!isControllingRef.current) return;
    
    isControllingRef.current = false;
    
    if (controlIntervalRef.current) {
      clearInterval(controlIntervalRef.current);
      controlIntervalRef.current = null;
    }
    
    // 发送停止指令 (center表示悬停)
    onDirectionControl?.('center');
  }, [onDirectionControl]);

  // 防止默认行为和事件冒泡
  const preventDefaults = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 通用的按压事件处理器
  const createPressHandlers = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'center') => ({
    onMouseDown: (e: React.MouseEvent) => {
      preventDefaults(e);
      startControl(direction);
    },
    onMouseUp: (e: React.MouseEvent) => {
      preventDefaults(e);
      stopControl();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      preventDefaults(e);
      stopControl();
    },
    onTouchStart: (e: React.TouchEvent) => {
      preventDefaults(e);
      startControl(direction);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      preventDefaults(e);
      stopControl();
    },
    onTouchCancel: (e: React.TouchEvent) => {
      preventDefaults(e);
      stopControl();
    }
  }), [startControl, stopControl, preventDefaults]);

  return (
    <div className="w-full h-full relative">
      {/* 背景 */}
      <div className="absolute inset-0 rounded-[20px] backdrop-blur-[120px] shadow-lg bg-background/60 border border-divider">
      </div>
      
      {/* 标题 */}
      <div className="absolute left-[6%] top-[10%] w-[54%] h-[22%]">
        <h4 className="text-foreground font-bold text-[1.5rem] leading-none">
          手动控制<br />
          <span className="text-[0.875rem] font-normal">CONTROL PANEL</span>
        </h4>
      </div>
      
      {/* 控制区域 */}
      <div className="absolute left-[41%] top-[15%] w-[52%] h-[76%]">
        {/* 外圆 */}
        <div className="absolute inset-0 w-full h-full rounded-full border border-divider shadow-lg bg-content2/20">
        </div>
        
        {/* 内圆 */}
        <div className="absolute left-[17%] top-[18%] w-[66%] h-[66%] rounded-full border border-divider shadow-lg bg-content2/20">
        </div>
        
        {/* 上箭头 */}
        <div 
          className="absolute left-[43%] top-[4%] w-[13%] h-[13%] flex items-center justify-center text-foreground hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer select-none"
          {...createPressHandlers('up')}
        >
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
            <path d="M1 7L8 1L15 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* 下箭头 */}
        <div 
          className="absolute left-[43%] top-[85%] w-[13%] h-[13%] flex items-center justify-center text-foreground hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer select-none"
          {...createPressHandlers('down')}
        >
          <svg width="16" height="8" viewBox="0 0 16 8" fill="none">
            <path d="M15 1L8 7L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* 左箭头 */}
        <div 
          className="absolute left-[1%] top-[46%] w-[13%] h-[13%] flex items-center justify-center text-foreground hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer select-none"
          {...createPressHandlers('left')}
        >
          <svg width="8" height="16" viewBox="0 0 8 16" fill="none">
            <path d="M7 1L1 8L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* 右箭头 */}
        <div 
          className="absolute left-[84%] top-[43%] w-[13%] h-[13%] flex items-center justify-center text-foreground hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer select-none"
          {...createPressHandlers('right')}
        >
          <svg width="8" height="16" viewBox="0 0 8 16" fill="none">
            <path d="M1 15L7 8L1 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* 中心按钮 */}
        <div 
          className="absolute left-[40%] top-[42%] w-[21%] h-[19%] flex items-center justify-center rounded-full opacity-40 hover:opacity-60 active:opacity-80 transition-opacity cursor-pointer select-none bg-content2/55"
          {...createPressHandlers('center')}
        >
          <div className="w-2 h-2 rounded-full bg-foreground"></div>
        </div>
      </div>
      
      {/* 起飞按钮 */}
      <div
        className="absolute left-[6%] top-[46%] w-[24%] h-[17%] bg-content2 text-foreground rounded-[14px] font-normal flex items-center justify-center cursor-pointer hover:bg-content3 active:bg-content4 transition-colors select-none"
        onClick={onTakeoff}
      >
        起飞
      </div>
      
      {/* 降落按钮 */}
      <div
        className="absolute left-[6%] top-[68%] w-[24%] h-[17%] bg-content2 text-foreground rounded-[14px] font-normal flex items-center justify-center cursor-pointer hover:bg-content3 active:bg-content4 transition-colors select-none"
        onClick={onLanding}
      >
        降落
      </div>
    </div>
  );
};

export default ManualControlPanel;
