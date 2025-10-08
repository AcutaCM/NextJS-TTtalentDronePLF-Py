"use client";

import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup } from '@heroui/button';
import { Input } from '@heroui/input';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { Badge } from '@heroui/badge';
import { useTelloControl } from '@/hooks/useTelloControl';

const TelloControlPanel: React.FC = () => {
  const {
    telloState,
    missionStatus,
    position,
    logs,
    isConnecting,
    connectToTello,
    disconnectFromTello,
    takeoff,
    land,
    emergencyStop,
    move,
    rotate,
    flip,
    startChallengeCruise,
    stopChallengeCruise,
    clearLogs
  } = useTelloControl();

  const [moveDistance, setMoveDistance] = useState<number>(20);
  const [rotateDegrees, setRotateDegrees] = useState<number>(90);

  // 连接无人机
  const handleConnect = async () => {
    await connectToTello();
  };

  // 断开连接
  const handleDisconnect = () => {
    disconnectFromTello();
  };

  // 起飞
  const handleTakeoff = () => {
    takeoff();
  };

  // 降落
  const handleLand = () => {
    land();
  };

  // 紧急停止
  const handleEmergencyStop = () => {
    emergencyStop();
  };

  // 移动控制
  const handleMove = (direction: 'up' | 'down' | 'left' | 'right' | 'forward' | 'back') => {
    move(direction, moveDistance);
  };

  // 旋转控制
  const handleRotate = (direction: 'cw' | 'ccw') => {
    rotate(direction, rotateDegrees);
  };

  // 翻滚控制
  const handleFlip = (direction: 'l' | 'r' | 'f' | 'b') => {
    flip(direction);
  };

  // 启动挑战卡巡航
  const handleStartCruise = () => {
    startChallengeCruise({
      rounds: 3,
      height: 100,
      stayDuration: 3
    });
  };

  // 停止挑战卡巡航
  const handleStopCruise = () => {
    stopChallengeCruise();
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    if (status.includes('成功') || status.includes('已连接') || status.includes('飞行中')) {
      return 'success';
    }
    if (status.includes('中') || status.includes('准备')) {
      return 'warning';
    }
    if (status.includes('错误') || status.includes('失败')) {
      return 'danger';
    }
    return 'default';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white/10 backdrop-blur-md border border-white/20">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold text-white">Tello 无人机控制面板</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* 状态显示 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">连接状态:</span>
              <Badge color={getStatusColor(telloState.connected ? '已连接' : '未连接')} variant="flat">
                {telloState.connected ? '已连接' : '未连接'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">飞行状态:</span>
              <Badge color={getStatusColor(telloState.flying ? '飞行中' : '待机')} variant="flat">
                {telloState.flying ? '飞行中' : '待机'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">电池电量:</span>
              <Badge color={telloState.battery > 20 ? 'success' : 'warning'} variant="flat">
                {telloState.battery}%
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">挑战卡巡航:</span>
              <Badge color={getStatusColor(missionStatus.active ? '运行中' : '待机')} variant="flat">
                {missionStatus.active ? '运行中' : '待机'}
              </Badge>
            </div>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 无人机连接控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">连接控制</h4>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="solid"
              onPress={handleConnect}
              isLoading={isConnecting}
              isDisabled={telloState.connected}
              className="flex-1"
            >
              {isConnecting ? '连接中...' : '连接 Tello'}
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={handleDisconnect}
              isDisabled={!telloState.connected}
              className="flex-1"
            >
              断开连接
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 基础飞行控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">基础飞行控制</h4>
          <div className="grid grid-cols-3 gap-2">
            <Button
              color="success"
              variant="solid"
              onPress={handleTakeoff}
              isDisabled={!telloState.connected || telloState.flying}
              size="sm"
            >
              起飞
            </Button>
            <Button
              color="warning"
              variant="solid"
              onPress={handleLand}
              isDisabled={!telloState.connected || !telloState.flying}
              size="sm"
            >
              降落
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={handleEmergencyStop}
              isDisabled={!telloState.connected}
              size="sm"
            >
              紧急停止
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 精确移动控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">精确移动控制</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">距离 (cm):</span>
              <Input
                type="number"
                value={moveDistance.toString()}
                onValueChange={(value) => setMoveDistance(Number(value))}
                min={20}
                max={500}
                size="sm"
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('up')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↑ 上升
              </Button>
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('forward')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↑ 前进
              </Button>
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('down')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↓ 下降
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('left')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ← 左移
              </Button>
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('back')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↓ 后退
              </Button>
              <Button
                color="primary"
                variant="solid"
                onPress={() => handleMove('right')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                → 右移
              </Button>
            </div>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 旋转和翻滚控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">旋转和翻滚控制</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/80">角度 (°):</span>
              <Input
                type="number"
                value={rotateDegrees.toString()}
                onValueChange={(value) => setRotateDegrees(Number(value))}
                min={1}
                max={360}
                size="sm"
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                color="secondary"
                variant="solid"
                onPress={() => handleRotate('ccw')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↺ 左转
              </Button>
              <Button
                color="secondary"
                variant="solid"
                onPress={() => handleRotate('cw')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↻ 右转
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button
                color="warning"
                variant="solid"
                onPress={() => handleFlip('l')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ← 左翻
              </Button>
              <Button
                color="warning"
                variant="solid"
                onPress={() => handleFlip('f')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↑ 前翻
              </Button>
              <Button
                color="warning"
                variant="solid"
                onPress={() => handleFlip('b')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                ↓ 后翻
              </Button>
              <Button
                color="warning"
                variant="solid"
                onPress={() => handleFlip('r')}
                isDisabled={!telloState.connected || !telloState.flying}
                size="sm"
              >
                → 右翻
              </Button>
            </div>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 任务控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">任务控制</h4>
          <div className="flex gap-2">
            <Button
              color="success"
              variant="solid"
              onPress={handleStartCruise}
              isDisabled={!telloState.connected || !telloState.flying || missionStatus.active}
              size="sm"
              className="flex-1"
            >
              启动挑战卡巡航
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={handleStopCruise}
              isDisabled={!missionStatus.active}
              size="sm"
              className="flex-1"
            >
              停止巡航
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 日志显示 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium text-white">控制日志</h4>
            <Button
              color="default"
              variant="light"
              size="sm"
              onPress={clearLogs}
            >
              清空日志
            </Button>
          </div>
          <div className="h-40 overflow-y-auto bg-black/20 rounded-lg p-2">
            {logs.length === 0 ? (
              <p className="text-white/50 text-sm">暂无日志</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="text-xs mb-1">
                  <span className="text-white/50">[{log.timestamp}]</span>
                  <span className={
                    log.level === 'error' ? 'text-red-400' :
                    log.level === 'warning' ? 'text-yellow-400' :
                    log.level === 'success' ? 'text-green-400' :
                    'text-blue-400'
                  }>
                    {' '}{log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default TelloControlPanel;