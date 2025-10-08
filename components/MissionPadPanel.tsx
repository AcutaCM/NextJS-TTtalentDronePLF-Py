import React from "react";
import { Card, CardBody } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Badge } from "@heroui/badge";

interface MissionPadPanelProps {
  isConnected: boolean;
  onStartMission: () => void;
  onStopMission: () => void;
}

const MissionPadPanel: React.FC<MissionPadPanelProps> = ({
  isConnected,
  onStartMission,
  onStopMission,
}) => {
  return (
    <Card className="h-full bg-background/60 backdrop-blur-sm border border-divider">
      <CardBody className="p-5 h-full flex flex-col">
        {/* 标题 */}
        <div className="mb-6">
          <h2 className="text-foreground font-extrabold text-[20px] leading-[27px]">
            挑战卡任务控制
          </h2>
          <p className="text-foreground/80 font-extrabold text-[20px] leading-[27px]">
            MISSIONPAD
          </p>
        </div>
        
        {/* 输入框区域 */}
        <div className="flex-1 space-y-4">
          {/* 第一行：任务轮次和执行高度 */}
          <div className="flex gap-4">
            <Input
              label="任务轮次"
              labelPlacement="inside"
              variant="bordered"
              color="primary"
              size="sm"
              radius="md"
              className="flex-1"
            />
            <Input
              label="执行高度(m)"
              labelPlacement="inside"
              variant="bordered"
              color="primary"
              size="sm"
              radius="md"
              className="flex-1"
            />
          </div>
          
          {/* 第二行：卡停留时间 */}
          <Input
            label="卡停留时间(s)"
            labelPlacement="inside"
            variant="bordered"
            color="primary"
            size="sm"
            radius="md"
            className="w-full"
          />
        </div>
        
        {/* 按钮区域 */}
        <div className="flex gap-3 mt-6">
          <Button
            color="primary"
            variant="bordered"
            size="lg"
            radius="lg"
            className="flex-1 h-[48px] font-medium"
            onPress={onStartMission}
            isDisabled={!isConnected}
          >
            开始任务
          </Button>
          <Button
            color="primary"
            variant="bordered"
            size="lg"
            radius="lg"
            className="flex-1 h-[48px] font-medium"
            onPress={onStopMission}
            isDisabled={!isConnected}
          >
            停止任务
          </Button>
        </div>
        
        {/* 状态徽章 */}
        <Badge
          color="success"
          variant="shadow"
          size="sm"
          className="absolute top-4 right-4"
        >
          5
        </Badge>
      </CardBody>
    </Card>
  );
};

export default MissionPadPanel;