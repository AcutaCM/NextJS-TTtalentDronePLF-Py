import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Badge } from "@heroui/badge";
import { Switch } from "@heroui/switch";

interface DetectionControlPanelProps {
  isConnected: boolean;
  onStartDetection: () => void;
  onConfigAPI: () => void;
  rippleDetectionEnabled: boolean;
  qrDetectionEnabled: boolean;
  onRippleDetectionChange: (enabled: boolean) => void;
  onQRDetectionChange: (enabled: boolean) => void;
  startRippleDetection: () => void;
  stopRippleDetection: () => void;
  startQRDetection: () => void;
  stopQRDetection: () => void;
}

const DetectionControlPanel: React.FC<DetectionControlPanelProps> = ({
  isConnected,
  onStartDetection,
  onConfigAPI,
  rippleDetectionEnabled,
  qrDetectionEnabled,
  onRippleDetectionChange,
  onQRDetectionChange,
  startRippleDetection,
  stopRippleDetection,
  startQRDetection,
  stopQRDetection,
}) => {
  return (
    <Card className="w-full h-full bg-background/60 backdrop-blur-sm border border-divider">
      <CardBody className="p-[4%] flex flex-col h-full">
        {/* 标题 */}
        <div className="mb-[6%]">
          <h2 className="text-foreground font-extrabold text-[1.25rem] leading-tight">
            检测控制
          </h2>
          <p className="text-foreground/80 font-extrabold text-[1.25rem] leading-tight">
            DETECTION CONTROL
          </p>
        </div>
        
        {/* 检测区域 */}
        <div className="flex gap-[3%] mb-[6%] flex-1">
          {/* 草莓成熟度检测 */}
          <div className="relative flex-1 bg-content2 rounded-[9px] p-[4%]">
            <div className="text-foreground font-normal text-[1.25rem] leading-tight">
              <div>草莓成熟度检测</div>
              <div className="text-foreground/80 text-[0.875rem] mt-1">RIPPLE DETECTION</div>
            </div>
            
            {/* 开关 */}
            <div className="absolute bottom-[4%] left-1/2 transform -translate-x-1/2">
              <Switch
                size="sm"
                color="primary"
                isSelected={rippleDetectionEnabled}
                onValueChange={(enabled) => {
                  onRippleDetectionChange(enabled);
                  if (enabled) {
                    startRippleDetection();
                  } else {
                    stopRippleDetection();
                  }
                }}
                isDisabled={!isConnected}
              />
            </div>
            
            {/* 徽章 */}
            <Badge
              color="success"
              variant="shadow"
              size="sm"
              className="absolute top-[4%] right-[4%]"
            >
              5
            </Badge>
          </div>
          
          {/* QR码检测 */}
          <div className="relative flex-1 bg-content2 rounded-[9px] p-[4%]">
            <div className="text-foreground font-semibold text-[1.25rem] leading-tight">
              <div>QR码检测</div>
              <div className="text-foreground/80 text-[0.875rem] mt-1">QR DETECTION</div>
            </div>
            
            {/* 开关 */}
            <div className="absolute bottom-[4%] left-1/2 transform -translate-x-1/2">
              <Switch
                size="sm"
                color="primary"
                isSelected={qrDetectionEnabled}
                onValueChange={(enabled) => {
                  onQRDetectionChange(enabled);
                  if (enabled) {
                    startQRDetection();
                  } else {
                    stopQRDetection();
                  }
                }}
                isDisabled={!isConnected}
              />
            </div>
            
            {/* 徽章 */}
            <Badge
              color="default"
              variant="shadow"
              size="sm"
              className="absolute top-[4%] right-[4%]"
            >
              5
            </Badge>
          </div>
        </div>
        
        {/* API配置按钮 */}
        <Button
          color="primary"
          variant="bordered"
          size="lg"
          radius="lg"
          className="w-full font-normal"
          style={{height: 'min(12%, 48px)'}}
          onPress={onConfigAPI}
          isDisabled={!isConnected}
        >
          API配置
        </Button>
      </CardBody>
    </Card>
  );
};

export default DetectionControlPanel;