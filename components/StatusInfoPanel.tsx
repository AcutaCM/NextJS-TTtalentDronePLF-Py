import React from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Progress } from "@heroui/progress";
import { Chip } from "@heroui/chip";
import { Badge } from "@heroui/badge";

interface StatusInfoPanelProps {
  batteryLevel: number;
  analyzedPlants: number;
  detectionMode: string;
  cruiseStatus: string;
  strawberryCount: {
    ripe: number;
    halfRipe: number;
    unripe: number;
  };
  connectionStatus: string;
  flightTime: number;
  altitude: number;
  gpsSignal: number;
  temperature: number;
  humidity: number;
}

const StatusInfoPanel: React.FC<StatusInfoPanelProps> = ({
  batteryLevel,
  analyzedPlants,
  detectionMode,
  cruiseStatus,
  strawberryCount,
  connectionStatus,
  flightTime,
  altitude,
  gpsSignal,
  temperature,
  humidity,
}) => {
  const getBatteryColor = (level: number) => {
    if (level > 60) return "success";
    if (level > 30) return "warning";
    return "danger";
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "connected":
      case "已连接":
        return "success";
      case "connecting":
      case "连接中":
        return "warning";
      case "disconnected":
      case "已断开":
      default:
        return "danger";
    }
  };

  const getCruiseStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "运行中":
        return "primary";
      case "paused":
      case "暂停":
        return "warning";
      case "completed":
      case "已完成":
        return "success";
      case "inactive":
      case "未激活":
      default:
        return "default";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalStrawberries = strawberryCount.ripe + strawberryCount.halfRipe + strawberryCount.unripe;

  return (
    <Card className="h-full bg-black/40 border border-white/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-400"></i>
            状态信息
          </h3>
          <p className="text-white/70 text-sm">Status Information</p>
        </div>
      </CardHeader>
      <Divider className="bg-white/20" />
      <CardBody className="space-y-4">
        {/* 连接状态 */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm flex items-center gap-2">
            <i className="fas fa-wifi text-blue-400"></i>
            连接状态:
          </span>
          <Chip 
            color={getConnectionStatusColor(connectionStatus)}
            variant="flat"
            size="sm"
          >
            {connectionStatus}
          </Chip>
        </div>

        {/* 电池电量 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm flex items-center gap-2">
              <i className="fas fa-battery-three-quarters text-green-400"></i>
              电池电量:
            </span>
            <span className="text-white font-bold">{batteryLevel}%</span>
          </div>
          <Progress
            value={batteryLevel}
            color={getBatteryColor(batteryLevel)}
            className="w-full"
            size="sm"
          />
        </div>

        {/* 飞行信息 */}
        <div className="space-y-3">
          <h4 className="text-white font-medium text-sm flex items-center gap-2">
            <i className="fas fa-plane text-blue-400"></i>
            飞行信息
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-white/60">飞行时间</div>
              <div className="text-white font-bold">{formatTime(flightTime)}</div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-white/60">高度 (cm)</div>
              <div className="text-white font-bold">{altitude}</div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-white/60">GPS信号</div>
              <div className="text-white font-bold">{gpsSignal}%</div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-2">
              <div className="text-white/60">温度 (°C)</div>
              <div className="text-white font-bold">{temperature}</div>
            </div>
          </div>
        </div>

        {/* 已分析植株 */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm flex items-center gap-2">
            <i className="fas fa-seedling text-green-400"></i>
            已分析植株:
          </span>
          <Badge color="success" variant="shadow">
            {analyzedPlants}
          </Badge>
        </div>

        {/* 检测模式 */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm flex items-center gap-2">
            <i className="fas fa-search text-purple-400"></i>
            检测模式:
          </span>
          <Chip color="secondary" variant="flat" size="sm">
            {detectionMode}
          </Chip>
        </div>

        {/* 巡航状态 */}
        <div className="flex items-center justify-between">
          <span className="text-white/80 text-sm flex items-center gap-2">
            <i className="fas fa-route text-orange-400"></i>
            巡航状态:
          </span>
          <Chip 
            color={getCruiseStatusColor(cruiseStatus)}
            variant="flat"
            size="sm"
          >
            {cruiseStatus}
          </Chip>
        </div>

        {/* 草莓检测计数 */}
        <div className="space-y-3">
          <h4 className="text-white font-medium text-sm flex items-center gap-2">
            <i className="fas fa-chart-pie text-red-400"></i>
            草莓检测计数
          </h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">总计:</span>
              <Badge color="default" variant="shadow">
                {totalStrawberries}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="bg-red-500/20 rounded-lg p-2 text-center">
                <div className="text-red-300">成熟</div>
                <div className="text-red-400 font-bold text-lg">{strawberryCount.ripe}</div>
              </div>
              
              <div className="bg-orange-500/20 rounded-lg p-2 text-center">
                <div className="text-orange-300">半成熟</div>
                <div className="text-orange-400 font-bold text-lg">{strawberryCount.halfRipe}</div>
              </div>
              
              <div className="bg-green-500/20 rounded-lg p-2 text-center">
                <div className="text-green-300">未成熟</div>
                <div className="text-green-400 font-bold text-lg">{strawberryCount.unripe}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 环境信息 */}
        <div className="space-y-3">
          <h4 className="text-white font-medium text-sm flex items-center gap-2">
            <i className="fas fa-thermometer-half text-yellow-400"></i>
            环境信息
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-yellow-500/20 rounded-lg p-2 text-center">
              <div className="text-yellow-300">温度</div>
              <div className="text-yellow-400 font-bold">{temperature}°C</div>
            </div>
            
            <div className="bg-blue-500/20 rounded-lg p-2 text-center">
              <div className="text-blue-300">湿度</div>
              <div className="text-blue-400 font-bold">{humidity}%</div>
            </div>
          </div>
        </div>

        {/* 系统提示 */}
        <div className="mt-4">
          <h4 className="text-white font-medium text-sm mb-2">
            <i className="fas fa-exclamation-triangle mr-2 text-yellow-400"></i>
            系统提示:
          </h4>
          <div className="space-y-1">
            {batteryLevel < 30 && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <i className="fas fa-battery-empty"></i>
                电池电量低，建议尽快充电
              </div>
            )}
            {gpsSignal < 50 && (
              <div className="text-xs text-orange-400 flex items-center gap-1">
                <i className="fas fa-satellite-dish"></i>
                GPS信号弱，可能影响定位精度
              </div>
            )}
            {temperature > 35 && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <i className="fas fa-thermometer-full"></i>
                温度过高，注意设备散热
              </div>
            )}
            {connectionStatus.toLowerCase().includes('disconnect') && (
              <div className="text-xs text-red-400 flex items-center gap-1">
                <i className="fas fa-unlink"></i>
                无人机连接断开，请检查连接
              </div>
            )}
            {batteryLevel >= 30 && gpsSignal >= 50 && temperature <= 35 && 
             connectionStatus.toLowerCase().includes('connect') && (
              <div className="text-xs text-green-400 flex items-center gap-1">
                <i className="fas fa-check-circle"></i>
                系统状态正常
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default StatusInfoPanel;