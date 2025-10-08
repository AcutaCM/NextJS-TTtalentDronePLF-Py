'use client';

import React, { useState, useRef, ReactNode, Children } from 'react';

interface InternalDraggableProps {
  children: ReactNode;
}

interface DraggableItemProps {
  children: ReactNode;
  index: number;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ children, index }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        position: 'relative',
        zIndex: isDragging ? 1000 : 1,
        marginBottom: '12px',
      }}
    >
      {children}
    </div>
  );
};

const InternalDraggable: React.FC<InternalDraggableProps> = ({ children }) => {
  const childrenArray = Children.toArray(children);
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {childrenArray.map((child, index) => (
        <DraggableItem key={index} index={index}>
          {child}
        </DraggableItem>
      ))}
    </div>
  );
};

export default InternalDraggable;