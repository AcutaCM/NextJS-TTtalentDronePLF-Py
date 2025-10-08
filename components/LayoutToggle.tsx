'use client';

import React, { useState } from 'react';
import { Button } from '@heroui/button';
import { useLayout } from '@/contexts/LayoutContext';

interface LayoutToggleProps {
  className?: string;
}

const LayoutToggle: React.FC<LayoutToggleProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isEditMode, setEditMode, saveLayouts, resetLayouts } = useLayout();

  const handleToggleEditMode = () => {
    setEditMode(!isEditMode);
  };

  const handleSaveLayout = () => {
    try {
      saveLayouts();
      console.log('手动保存布局触发');
      // 使用更现代的通知方式
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg';
      notification.textContent = '✅ 布局已保存！';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    } catch (error) {
      console.error('保存布局失败:', error);
      const notification = document.createElement('div');
      notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg';
      notification.textContent = '❌ 保存布局失败！';
      document.body.appendChild(notification);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 2000);
    }
  };

  const handleResetLayout = () => {
    if (confirm('确定要重置布局吗？这将恢复到默认设置并清除所有保存的布局数据。')) {
      try {
        resetLayouts();
        console.log('重置布局触发');
        // 强制刷新页面以确保布局完全重置
        setTimeout(() => {
          window.location.reload();
        }, 500);
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg';
        notification.textContent = '🔄 布局已重置，页面即将刷新...';
        document.body.appendChild(notification);
      } catch (error) {
        console.error('重置布局失败:', error);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 布局编辑图标按钮 */}
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className={`w-8 h-8 min-w-8 transition-all duration-200 transform hover:scale-110 active:scale-95 ${
          isEditMode 
            ? 'bg-green-500/20 text-green-400 border border-green-400/30 shadow-lg shadow-green-500/20' 
            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white hover:shadow-lg hover:shadow-white/10'
        } ${isExpanded ? 'scale-110 rotate-3' : ''}`}
        onPress={() => setIsExpanded(!isExpanded)}
        title="布局编辑"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Button>

      {/* 展开的控制面板 */}
      {isExpanded && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-40 animate-in fade-in duration-200" 
            onClick={() => setIsExpanded(false)}
          />
          
          {/* 控制面板 */}
          <div className="absolute top-full right-0 mt-2 z-[60] min-w-[280px] animate-in slide-in-from-top-2 fade-in zoom-in-95 duration-300">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-xl transform transition-all duration-300 ease-out animate-in zoom-in-90 fade-in">
              {/* 编辑模式切换 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-white text-sm font-medium">编辑模式</span>
                <Button
                  size="sm"
                  variant={isEditMode ? "solid" : "bordered"}
                  color={isEditMode ? "success" : "default"}
                  onPress={handleToggleEditMode}
                  className={`
                    min-w-[80px] font-medium transition-all duration-200 transform hover:scale-105 active:scale-95
                    ${isEditMode 
                      ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30' 
                      : 'bg-white/10 text-white border-white/30 hover:bg-white/20 hover:shadow-lg hover:shadow-white/10'
                    }
                  `}
                >
                  {isEditMode ? '关闭' : '开启'}
                </Button>
              </div>

              {/* 分隔线 */}
              <div className="w-full h-px bg-white/10 mb-3" />

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={handleSaveLayout}
                  className="
                    flex-1 font-medium transition-all duration-200 transform hover:scale-105 active:scale-95
                    bg-blue-500/10 text-blue-300 border-blue-400/30
                    hover:bg-blue-500/20 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/20
                  "
                >
                  💾 保存
                </Button>

                <Button
                  size="sm"
                  variant="bordered"
                  onPress={handleResetLayout}
                  className="
                    flex-1 font-medium transition-all duration-200 transform hover:scale-105 active:scale-95
                    bg-red-500/10 text-red-300 border-red-400/30
                    hover:bg-red-500/20 hover:border-red-400/50 hover:shadow-lg hover:shadow-red-500/20
                  "
                >
                  🔄 重置
                </Button>
              </div>

              {/* 编辑模式提示 */}
              {isEditMode && (
                <div className="mt-3 p-2 bg-green-500/10 border border-green-400/20 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-2 text-xs text-green-300">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>拖拽和调整组件大小，完成后点击保存</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LayoutToggle;