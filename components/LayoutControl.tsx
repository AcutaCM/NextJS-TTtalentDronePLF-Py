'use client';

import React from 'react';
import { Button } from '@heroui/button';
import { useLayout } from '@/contexts/LayoutContext';

const LayoutControl: React.FC = () => {
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
    <div className="fixed top-4 left-1/3 transform -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 bg-black/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2">
        {/* 编辑模式切换按钮 */}
        <Button
          size="sm"
          variant={isEditMode ? "solid" : "bordered"}
          color={isEditMode ? "success" : "default"}
          onPress={handleToggleEditMode}
          className={`
            min-w-[100px] font-medium transition-all duration-200
            ${isEditMode 
              ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/25' 
              : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
            }
          `}
        >
          {isEditMode ? '✓ 编辑中' : '✏️ 编辑布局'}
        </Button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-white/20" />

        {/* 保存布局按钮 */}
        <Button
          size="sm"
          variant="bordered"
          onPress={handleSaveLayout}
          className="
            min-w-[80px] font-medium transition-all duration-200
            bg-blue-500/10 text-blue-300 border-blue-400/30
            hover:bg-blue-500/20 hover:border-blue-400/50
          "
        >
          💾 保存
        </Button>

        {/* 重置布局按钮 */}
        <Button
          size="sm"
          variant="bordered"
          onPress={handleResetLayout}
          className="
            min-w-[80px] font-medium transition-all duration-200
            bg-red-500/10 text-red-300 border-red-400/30
            hover:bg-red-500/20 hover:border-red-400/50
          "
        >
          🔄 重置
        </Button>
      </div>

      {/* 编辑模式提示 */}
      {isEditMode && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-lg px-3 py-1 text-sm text-green-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>拖拽和调整组件大小，完成后点击保存</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayoutControl;