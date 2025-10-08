'use client';

import React, { useState, useEffect } from 'react';
import { Input, Button, Card, CardBody } from '@nextui-org/react';

interface SizeControlProps {
  width: number;
  height: number;
  onSizeChange: (size: { width: number; height: number }) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const SizeControl: React.FC<SizeControlProps> = ({
  width,
  height,
  onSizeChange,
  onClose,
  position
}) => {
  const [inputWidth, setInputWidth] = useState(width.toString());
  const [inputHeight, setInputHeight] = useState(height.toString());
  const [isLocked, setIsLocked] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(width / height);

  useEffect(() => {
    setInputWidth(width.toString());
    setInputHeight(height.toString());
    setAspectRatio(width / height);
  }, [width, height]);

  const handleWidthChange = (value: string) => {
    setInputWidth(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newHeight = numValue / aspectRatio;
        setInputHeight(newHeight.toString());
        onSizeChange({ width: numValue, height: newHeight });
      } else {
        onSizeChange({ width: numValue, height: parseFloat(inputHeight) || height });
      }
    }
  };

  const handleHeightChange = (value: string) => {
    setInputHeight(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      if (isLocked) {
        const newWidth = numValue * aspectRatio;
        setInputWidth(newWidth.toString());
        onSizeChange({ width: newWidth, height: numValue });
      } else {
        onSizeChange({ width: parseFloat(inputWidth) || width, height: numValue });
      }
    }
  };

  const handlePresetSize = (presetWidth: number, presetHeight: number) => {
    setInputWidth(presetWidth.toString());
    setInputHeight(presetHeight.toString());
    onSizeChange({ width: presetWidth, height: presetHeight });
  };

  return (
    <div
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <Card className="w-80 shadow-lg">
        <CardBody className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">尺寸控制</h3>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              onPress={onClose}
            >
              ✕
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* 宽度和高度输入 */}
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  label="宽度"
                  value={inputWidth}
                  onChange={(e) => handleWidthChange(e.target.value)}
                  endContent="px"
                  size="sm"
                />
              </div>
              <Button
                isIconOnly
                size="sm"
                variant={isLocked ? "solid" : "bordered"}
                color={isLocked ? "primary" : "default"}
                onPress={() => setIsLocked(!isLocked)}
                title={isLocked ? "解锁比例" : "锁定比例"}
              >
                {isLocked ? "🔒" : "🔓"}
              </Button>
              <div className="flex-1">
                <Input
                  label="高度"
                  value={inputHeight}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  endContent="px"
                  size="sm"
                />
              </div>
            </div>
            
            {/* 预设尺寸 */}
            <div>
              <p className="text-sm text-gray-600 mb-2">预设尺寸:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => handlePresetSize(300, 200)}
                >
                  小 (300×200)
                </Button>
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => handlePresetSize(400, 300)}
                >
                  中 (400×300)
                </Button>
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => handlePresetSize(600, 400)}
                >
                  大 (600×400)
                </Button>
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={() => handlePresetSize(800, 600)}
                >
                  特大 (800×600)
                </Button>
              </div>
            </div>
            
            {/* 比例信息 */}
            <div className="text-xs text-gray-500">
              当前比例: {(width / height).toFixed(2)}:1
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default SizeControl;