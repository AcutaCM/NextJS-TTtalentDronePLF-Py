"use client";

import React from "react";
import { Button } from "@heroui/button";
import { Tooltip } from "@heroui/tooltip";
import { useLayout } from "@/contexts/LayoutContext";

interface ComponentSelectorButtonProps {
  className?: string;
}

const ComponentSelectorButton: React.FC<ComponentSelectorButtonProps> = ({ className = "" }) => {
  const { showComponentSelector, setShowComponentSelector } = useLayout();

  const handleToggle = () => {
    setShowComponentSelector(!showComponentSelector);
  };

  return (
    <Tooltip content="组件选择器" placement="bottom">
      <Button
        isIconOnly
        size="sm"
        variant="light"
        className={`w-6 h-6 min-w-6 opacity-80 hover:opacity-100 transition-opacity ${className} ${
          showComponentSelector ? 'bg-blue-500/20 text-blue-400' : 'text-white'
        }`}
        onPress={handleToggle}
      >
        <svg 
          className="w-4 h-4" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </Button>
    </Tooltip>
  );
};

export default ComponentSelectorButton;