import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface DraggableState {
  position: Position;
  size: Size;
  isDragging: boolean;
  isResizing: boolean;
}

interface UseDraggableOptions {
  initialPosition?: Position;
  initialSize?: Size;
  minSize?: Size;
  maxSize?: Size;
  bounds?: {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  };
  onDragStart?: () => void;
  onDrag?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
  onResizeStart?: () => void;
  onResize?: (size: Size) => void;
  onResizeEnd?: (size: Size) => void;
}

export const useDraggable = (options: UseDraggableOptions = {}) => {
  const {
    initialPosition = { x: 0, y: 0 },
    initialSize = { width: 300, height: 200 },
    minSize = { width: 100, height: 100 },
    maxSize = { width: 1200, height: 800 },
    bounds,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  const [state, setState] = useState<DraggableState>({
    position: initialPosition,
    size: initialSize,
    isDragging: false,
    isResizing: false,
  });

  // 同步外部传入的初始位置和尺寸变化
  useEffect(() => {
    setState(prev => ({
      ...prev,
      position: initialPosition,
      size: initialSize
    }));
  }, [initialPosition.x, initialPosition.y, initialSize.width, initialSize.height]);

  const dragStartPos = useRef<Position>({ x: 0, y: 0 });
  const elementStartPos = useRef<Position>({ x: 0, y: 0 });
  const resizeStartSize = useRef<Size>({ width: 0, height: 0 });
  const resizeStartPos = useRef<Position>({ x: 0, y: 0 });
  const resizeDirection = useRef<string>('');

  // 限制位置在边界内
  const constrainPosition = useCallback((pos: Position): Position => {
    if (!bounds) return pos;
    
    const constrainedPos = { ...pos };
    
    if (bounds.left !== undefined) {
      constrainedPos.x = Math.max(bounds.left, constrainedPos.x);
    }
    if (bounds.top !== undefined) {
      constrainedPos.y = Math.max(bounds.top, constrainedPos.y);
    }
    if (bounds.right !== undefined) {
      constrainedPos.x = Math.min(bounds.right - state.size.width, constrainedPos.x);
    }
    if (bounds.bottom !== undefined) {
      constrainedPos.y = Math.min(bounds.bottom - state.size.height, constrainedPos.y);
    }
    
    return constrainedPos;
  }, [bounds, state.size]);

  // 限制尺寸在最小最大值之间
  const constrainSize = useCallback((size: Size): Size => {
    return {
      width: Math.max(minSize.width, Math.min(maxSize.width, size.width)),
      height: Math.max(minSize.height, Math.min(maxSize.height, size.height)),
    };
  }, [minSize, maxSize]);

  // 开始拖拽
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...state.position };
    
    setState(prev => ({ ...prev, isDragging: true }));
    onDragStart?.();
  }, [state.position, onDragStart]);

  // 开始调整大小
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = { ...state.size };
    resizeDirection.current = direction;
    
    setState(prev => ({ ...prev, isResizing: true }));
    onResizeStart?.();
  }, [state.size, onResizeStart]);

  // 鼠标移动处理
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (state.isDragging) {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      
      const newPosition = {
        x: elementStartPos.current.x + deltaX,
        y: elementStartPos.current.y + deltaY,
      };
      
      const constrainedPosition = constrainPosition(newPosition);
      
      setState(prev => ({ ...prev, position: constrainedPosition }));
      onDrag?.(constrainedPosition);
    }
    
    if (state.isResizing) {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;
      
      let newSize = { ...resizeStartSize.current };
      let newPosition = { ...state.position };
      
      const direction = resizeDirection.current;
      const isProportional = e.shiftKey; // 按住Shift键进行等比缩放
      
      if (isProportional) {
        // 等比缩放逻辑
        const aspectRatio = resizeStartSize.current.width / resizeStartSize.current.height;
        
        if (direction.includes('right') || direction.includes('left')) {
          // 基于宽度变化计算等比缩放
          if (direction.includes('right')) {
            newSize.width = resizeStartSize.current.width + deltaX;
          } else {
            newSize.width = resizeStartSize.current.width - deltaX;
            newPosition.x = state.position.x + deltaX;
          }
          newSize.height = newSize.width / aspectRatio;
        } else if (direction.includes('bottom') || direction.includes('top')) {
          // 基于高度变化计算等比缩放
          if (direction.includes('bottom')) {
            newSize.height = resizeStartSize.current.height + deltaY;
          } else {
            newSize.height = resizeStartSize.current.height - deltaY;
            newPosition.y = state.position.y + deltaY;
          }
          newSize.width = newSize.height * aspectRatio;
        }
        
        // 对于角落拖拽，使用较大的变化量
        if (direction.includes('-')) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          const delta = Math.max(absX, absY) * (deltaX < 0 || deltaY < 0 ? -1 : 1);
          
          if (direction.includes('right')) {
            newSize.width = resizeStartSize.current.width + delta;
          } else if (direction.includes('left')) {
            newSize.width = resizeStartSize.current.width - delta;
            newPosition.x = state.position.x + delta;
          }
          
          if (direction.includes('bottom')) {
            newSize.height = resizeStartSize.current.height + delta;
          } else if (direction.includes('top')) {
            newSize.height = resizeStartSize.current.height - delta;
            newPosition.y = state.position.y + delta;
          }
          
          // 确保等比缩放
          newSize.height = newSize.width / aspectRatio;
        }
      } else {
        // 普通缩放逻辑
        if (direction.includes('right')) {
          newSize.width = resizeStartSize.current.width + deltaX;
        }
        if (direction.includes('left')) {
          newSize.width = resizeStartSize.current.width - deltaX;
          newPosition.x = state.position.x + deltaX;
        }
        if (direction.includes('bottom')) {
          newSize.height = resizeStartSize.current.height + deltaY;
        }
        if (direction.includes('top')) {
          newSize.height = resizeStartSize.current.height - deltaY;
          newPosition.y = state.position.y + deltaY;
        }
      }
      
      const constrainedSize = constrainSize(newSize);
      const constrainedPosition = constrainPosition(newPosition);
      
      setState(prev => ({
        ...prev,
        size: constrainedSize,
        position: constrainedPosition,
      }));
      
      onResize?.(constrainedSize);
    }
  }, [state.isDragging, state.isResizing, state.position, constrainPosition, constrainSize, onDrag, onResize]);

  // 鼠标释放处理
  const handleMouseUp = useCallback(() => {
    if (state.isDragging) {
      setState(prev => ({ ...prev, isDragging: false }));
      onDragEnd?.(state.position);
    }
    
    if (state.isResizing) {
      setState(prev => ({ ...prev, isResizing: false }));
      onResizeEnd?.(state.size);
    }
  }, [state.isDragging, state.isResizing, state.position, state.size, onDragEnd, onResizeEnd]);

  // 添加全局事件监听器
  useEffect(() => {
    if (state.isDragging || state.isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = state.isDragging ? 'grabbing' : 'resizing';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };
    }
  }, [state.isDragging, state.isResizing, handleMouseMove, handleMouseUp]);

  // 设置位置
  const setPosition = useCallback((position: Position) => {
    const constrainedPosition = constrainPosition(position);
    setState(prev => ({ ...prev, position: constrainedPosition }));
  }, [constrainPosition]);

  // 设置尺寸
  const setSize = useCallback((size: Size) => {
    const constrainedSize = constrainSize(size);
    setState(prev => ({ ...prev, size: constrainedSize }));
  }, [constrainSize]);

  // 强制设置尺寸（绕过限制，用于插槽适配）
  const setSizeForced = useCallback((size: Size) => {
    setState(prev => ({ ...prev, size }));
  }, []);

  return {
    position: state.position,
    size: state.size,
    isDragging: state.isDragging,
    isResizing: state.isResizing,
    setPosition,
    setSize,
    setSizeForced,
    handleDragStart,
    handleResizeStart,
  };
};

export type { Position, Size, DraggableState, UseDraggableOptions };