'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  onItemSelect?: (item: any, index: number) => void;
  showGradients?: boolean;
  enableArrowNavigation?: boolean;
  className?: string;
  itemClassName?: string;
  displayScrollbar?: boolean;
  initialSelectedIndex?: number;
  maxHeight?: string;
  itemHeight?: number;
  emptyState?: React.ReactNode;
}

const AnimatedList: React.FC<AnimatedListProps> = ({
  items = [],
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxHeight = '300px',
  itemHeight = 60,
  emptyState
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 处理滚动状态
  const handleScroll = () => {
    setIsScrolling(true);
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  };

  // 处理键盘导航
  useEffect(() => {
    if (!enableArrowNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < items.length - 1 ? prev + 1 : 0;
          if (onItemSelect) {
            onItemSelect(items[newIndex], newIndex);
          }
          return newIndex;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : items.length - 1;
          if (onItemSelect) {
            onItemSelect(items[newIndex], newIndex);
          }
          return newIndex;
        });
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        if (onItemSelect) {
          onItemSelect(items[selectedIndex], selectedIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableArrowNavigation, items, selectedIndex, onItemSelect]);

  // 处理项目点击
  const handleItemClick = (item: any, index: number) => {
    setSelectedIndex(index);
    if (onItemSelect) {
      onItemSelect(item, index);
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 顶部渐变 */}
      {showGradients && (
        <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10" />
      )}
      
      {/* 滚动容器 */}
      <div
        ref={containerRef}
        className={`
          overflow-y-auto overflow-x-hidden
          ${displayScrollbar ? '' : 'scrollbar-hide'}
          ${isScrolling ? 'scroll-smooth' : ''}
        `}
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1,
                transition: {
                  duration: 0.3,
                  delay: index * 0.05,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }
              }}
              exit={{ 
                opacity: 0, 
                y: -20, 
                scale: 0.95,
                transition: {
                  duration: 0.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }
              }}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.98 }}
              className={`
                cursor-pointer transition-all duration-200
                ${selectedIndex === index ? 'ring-2 ring-blue-400/50' : ''}
                ${itemClassName}
              `}
              onClick={() => handleItemClick(item, index)}
              style={{ minHeight: itemHeight }}
            >
              {renderItem(item, index)}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* 空状态 */}
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center py-8 text-white/60"
          >
            {emptyState || (
              <div className="text-center">
                <i className="fas fa-inbox text-2xl mb-2 block"></i>
                <p className="text-sm">暂无数据</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
      
      {/* 底部渐变 */}
      {showGradients && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
      )}
      
      {/* 自定义滚动条样式 */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default AnimatedList;