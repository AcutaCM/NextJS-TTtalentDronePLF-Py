"use client";

import React, { useState } from 'react';
import { Button } from '@heroui/button';
import { Input } from '@heroui/input';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { Badge } from '@heroui/badge';
import { useDrone } from '@/contexts/DroneContext';

const DroneControlPanel: React.FC = () => {
  const {
    droneState,
    connectToDrone,
    disconnectFromDrone,
    startMission,
    stopMission,
    configureAI,
    updateDroneState,
  } = useDrone();

  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConfiguringAI, setIsConfiguringAI] = useState(false);

  // 连接无人机
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const success = await connectToDrone();
      if (success) {
        console.log('无人机连接成功');
      } else {
        console.log('无人机连接失败');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 断开连接
  const handleDisconnect = () => {
    disconnectFromDrone();
  };

  // 配置 AI
  const handleConfigureAI = async () => {
    if (!apiKey.trim()) {
      alert('请输入有效的 API 密钥');
      return;
    }

    setIsConfiguringAI(true);
    try {
      const success = await configureAI(apiKey, apiEndpoint || undefined);
      if (success) {
        alert('AI 配置成功！');
        setApiKey('');
        setApiEndpoint('');
      } else {
        alert('AI 配置失败，请检查 API 密钥格式');
      }
    } finally {
      setIsConfiguringAI(false);
    }
  };

  // 开始任务
  const handleStartMission = (missionType: string) => {
    if (!droneState.isConnected) {
      alert('请先连接无人机');
      return;
    }
    startMission(missionType);
  };

  // 模拟巡航状态变化
  const handleCruiseAction = (action: string) => {
    if (!droneState.isConnected) {
      alert('请先连接无人机');
      return;
    }

    switch (action) {
      case 'takeoff':
        updateDroneState({ cruiseStatus: 'takeoff' });
        setTimeout(() => updateDroneState({ cruiseStatus: 'hovering' }), 2000);
        break;
      case 'land':
        updateDroneState({ cruiseStatus: 'landing' });
        setTimeout(() => updateDroneState({ cruiseStatus: 'standby' }), 2000);
        break;
      case 'cruise':
        updateDroneState({ cruiseStatus: 'cruising' });
        break;
      case 'hover':
        updateDroneState({ cruiseStatus: 'hovering' });
        break;
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    if (status.includes('已连接') || status.includes('在线') || status.includes('执行中')) {
      return 'success';
    }
    if (status.includes('连接中') || status.includes('准备中')) {
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
              <Badge color={getStatusColor(droneState.connectionStatus)} variant="flat">
                {droneState.connectionStatus === 'connected' ? '已连接' : 
                 droneState.connectionStatus === 'connecting' ? '连接中' :
                 droneState.connectionStatus === 'error' ? '连接错误' : '未连接'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">AI 状态:</span>
              <Badge color={getStatusColor(droneState.aiStatus)} variant="flat">
                {droneState.aiStatus === 'online' ? '在线' :
                 droneState.aiStatus === 'connecting' ? '连接中' :
                 droneState.aiStatus === 'error' ? '配置错误' : '离线'}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">任务状态:</span>
              <Badge color={getStatusColor(droneState.missionStatus)} variant="flat">
                {droneState.missionStatus === 'executing' ? '执行中' :
                 droneState.missionStatus === 'preparing' ? '准备中' :
                 droneState.missionStatus === 'completed' ? '已完成' :
                 droneState.missionStatus === 'failed' ? '失败' : '待机'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">巡航状态:</span>
              <Badge color={getStatusColor(droneState.cruiseStatus)} variant="flat">
                {droneState.cruiseStatus === 'cruising' ? '飞行中' :
                 droneState.cruiseStatus === 'takeoff' ? '起飞' :
                 droneState.cruiseStatus === 'landing' ? '降落' :
                 droneState.cruiseStatus === 'hovering' ? '悬停' : '待机'}
              </Badge>
            </div>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 无人机连接控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">无人机连接</h4>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="solid"
              onPress={handleConnect}
              isLoading={isConnecting}
              isDisabled={droneState.isConnected}
              className="flex-1"
            >
              {isConnecting ? '连接中...' : '连接 Tello'}
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={handleDisconnect}
              isDisabled={!droneState.isConnected}
              className="flex-1"
            >
              断开连接
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 巡航控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">巡航控制</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              color="success"
              variant="solid"
              onPress={() => handleCruiseAction('takeoff')}
              isDisabled={!droneState.isConnected || droneState.cruiseStatus !== 'standby'}
              size="sm"
            >
              起飞
            </Button>
            <Button
              color="warning"
              variant="solid"
              onPress={() => handleCruiseAction('land')}
              isDisabled={!droneState.isConnected || droneState.cruiseStatus === 'standby'}
              size="sm"
            >
              降落
            </Button>
            <Button
              color="primary"
              variant="solid"
              onPress={() => handleCruiseAction('cruise')}
              isDisabled={!droneState.isConnected || droneState.cruiseStatus === 'standby'}
              size="sm"
            >
              开始巡航
            </Button>
            <Button
              color="secondary"
              variant="solid"
              onPress={() => handleCruiseAction('hover')}
              isDisabled={!droneState.isConnected || droneState.cruiseStatus === 'standby'}
              size="sm"
            >
              悬停
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 任务控制 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">任务控制</h4>
          <div className="flex gap-2">
            <Button
              color="primary"
              variant="solid"
              onPress={() => handleStartMission('巡检任务')}
              isDisabled={!droneState.isConnected || droneState.missionStatus !== 'standby'}
              size="sm"
              className="flex-1"
            >
              开始巡检
            </Button>
            <Button
              color="secondary"
              variant="solid"
              onPress={() => handleStartMission('监控任务')}
              isDisabled={!droneState.isConnected || droneState.missionStatus !== 'standby'}
              size="sm"
              className="flex-1"
            >
              开始监控
            </Button>
            <Button
              color="danger"
              variant="solid"
              onPress={stopMission}
              isDisabled={droneState.missionStatus === 'standby'}
              size="sm"
              className="flex-1"
            >
              停止任务
            </Button>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* AI 配置 */}
        <div className="space-y-3">
          <h4 className="text-md font-medium text-white">AI 配置</h4>
          <div className="space-y-2">
            <Input
              label="API 密钥"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onValueChange={setApiKey}
              type="password"
              size="sm"
              classNames={{
                input: "text-white",
                label: "text-white/80",
                inputWrapper: "bg-white/10 border-white/20"
              }}
            />
            <Input
              label="API 端点 (可选)"
              placeholder="https://api.openai.com/v1"
              value={apiEndpoint}
              onValueChange={setApiEndpoint}
              size="sm"
              classNames={{
                input: "text-white",
                label: "text-white/80",
                inputWrapper: "bg-white/10 border-white/20"
              }}
            />
            <Button
              color="success"
              variant="solid"
              onPress={handleConfigureAI}
              isLoading={isConfiguringAI}
              className="w-full"
              size="sm"
            >
              {isConfiguringAI ? '配置中...' : '配置 AI'}
            </Button>
          </div>
        </div>

        {/* 电池和信号信息 */}
        {droneState.isConnected && (
          <>
            <Divider className="bg-white/20" />
            <div className="space-y-2">
              <h4 className="text-md font-medium text-white">设备信息</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {droneState.batteryLevel !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-white/80">电池电量:</span>
                    <span className="text-white">{droneState.batteryLevel}%</span>
                  </div>
                )}
                {droneState.signalStrength !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-white/80">信号强度:</span>
                    <span className="text-white">{droneState.signalStrength}%</span>
                  </div>
                )}
                {droneState.altitude !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-white/80">高度:</span>
                    <span className="text-white">{droneState.altitude}m</span>
                  </div>
                )}
                {droneState.speed !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-white/80">速度:</span>
                    <span className="text-white">{droneState.speed}m/s</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default DroneControlPanel;