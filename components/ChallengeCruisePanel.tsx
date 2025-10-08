import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";

interface ChallengeCruisePanelProps {
  isConnected: boolean;
  cruiseActive: boolean;
  onStartCruise: (params: CruiseParams) => void;
  onStopCruise: () => void;
  cruiseProgress?: number;
  currentRound?: number;
  totalRounds?: number;
}

interface CruiseParams {
  rounds: number;
  height: number;
  stayDuration: number;
}

const ChallengeCruisePanel: React.FC<ChallengeCruisePanelProps> = ({
  isConnected,
  cruiseActive,
  onStartCruise,
  onStopCruise,
  cruiseProgress = 0,
  currentRound = 0,
  totalRounds = 0,
}) => {
  const [rounds, setRounds] = useState("3");
  const [height, setHeight] = useState("100");
  const [stayDuration, setStayDuration] = useState("3");

  const handleStartCruise = () => {
    const params: CruiseParams = {
      rounds: parseInt(rounds) || 3,
      height: parseInt(height) || 100,
      stayDuration: parseInt(stayDuration) || 3,
    };
    onStartCruise(params);
  };

  const isValidRounds = parseInt(rounds) >= 1 && parseInt(rounds) <= 10;
  const isValidHeight = parseInt(height) >= 50 && parseInt(height) <= 300;
  const isValidStayDuration = parseInt(stayDuration) >= 1 && parseInt(stayDuration) <= 10;
  const isFormValid = isValidRounds && isValidHeight && isValidStayDuration;

  return (
    <Card className="h-full bg-black/40 border border-white/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <i className="fas fa-route text-blue-400"></i>
            挑战卡巡航控制
          </h3>
          <p className="text-white/70 text-sm">Challenge Card Cruise Control</p>
        </div>
      </CardHeader>
      <Divider className="bg-white/20" />
      <CardBody className="space-y-4">
        {/* 巡航参数设置 */}
        <div className="space-y-3">
          <Input
            label="巡航轮次"
            placeholder="1-10"
            value={rounds}
            onValueChange={setRounds}
            isDisabled={cruiseActive}
            color={isValidRounds ? "default" : "danger"}
            description="设置巡航轮次 (1-10)"
            startContent={<i className="fas fa-repeat text-white/60"></i>}
          />
          
          <Input
            label="飞行高度 (cm)"
            placeholder="50-300"
            value={height}
            onValueChange={setHeight}
            isDisabled={cruiseActive}
            color={isValidHeight ? "default" : "danger"}
            description="设置飞行高度 (50-300cm)"
            startContent={<i className="fas fa-arrows-alt-v text-white/60"></i>}
          />
          
          <Input
            label="悬停时长 (秒)"
            placeholder="1-10"
            value={stayDuration}
            onValueChange={setStayDuration}
            isDisabled={cruiseActive}
            color={isValidStayDuration ? "default" : "danger"}
            description="在每个挑战卡上的悬停时长 (1-10秒)"
            startContent={<i className="fas fa-clock text-white/60"></i>}
          />
        </div>

        {/* 控制按钮 */}
        <div className="space-y-2">
          <Button
            className="w-full bg-blue-600/80 hover:bg-blue-600 text-white"
            onPress={handleStartCruise}
            isDisabled={!isConnected || cruiseActive || !isFormValid}
            startContent={<i className="fas fa-play"></i>}
          >
            开始巡航
          </Button>
          
          <Button
            className="w-full bg-red-600/80 hover:bg-red-600 text-white"
            onPress={onStopCruise}
            isDisabled={!cruiseActive}
            startContent={<i className="fas fa-stop"></i>}
          >
            停止巡航
          </Button>
        </div>

        {/* 巡航状态显示 */}
        {cruiseActive && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">巡航状态:</span>
              <Chip color="primary" variant="flat">
                <i className="fas fa-plane mr-1"></i>
                进行中
              </Chip>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/80">
                <span>当前轮次: {currentRound}/{totalRounds}</span>
                <span>{Math.round(cruiseProgress)}%</span>
              </div>
              <Progress
                value={cruiseProgress}
                color="primary"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 任务序列说明 */}
        <div className="mt-4">
          <h4 className="text-white font-medium text-sm mb-2">
            <i className="fas fa-list-ol mr-2 text-blue-400"></i>
            任务序列:
          </h4>
          <ol className="text-xs text-white/70 space-y-1 pl-4">
            <li>1. 起飞并调整到设定高度</li>
            <li>2. 检测并对准挑战卡1</li>
            <li>3. 向右移动以定位挑战卡6</li>
            <li>4. 精确悬停在卡6上方</li>
            <li>5. 向左移动返回挑战卡1</li>
            <li>6. 重复设定的轮次</li>
            <li>7. 返回卡1并安全降落</li>
          </ol>
        </div>

        {/* 任务提示 */}
        <div className="mt-4">
          <h4 className="text-white font-medium text-sm mb-2">
            <i className="fas fa-lightbulb mr-2 text-yellow-400"></i>
            任务提示:
          </h4>
          <ul className="text-xs text-white/70 space-y-1 pl-4">
            <li>• 较低的高度可提高挑战卡检测效果</li>
            <li>• 保持挑战卡在无人机向下摄像头的视野内</li>
            <li>• 确保良好的光照以获得最佳卡识别效果</li>
            <li>• 清空飞行区域的障碍物</li>
            <li>• 设置较少的轮次以延长电池寿命</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
};

export default ChallengeCruisePanel;