"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 定义无人机状态类型
export interface DroneState {
  // 无人机连接状态
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  // 任务状态
  missionStatus: 'standby' | 'preparing' | 'executing' | 'completed' | 'failed';
  currentMission?: string;
  
  // 巡航状态
  cruiseStatus: 'standby' | 'takeoff' | 'cruising' | 'landing' | 'hovering';
  
  // AI 状态
  aiStatus: 'offline' | 'connecting' | 'online' | 'error';
  aiApiConfigured: boolean;
  
  // 电池和信号状态
  batteryLevel?: number;
  signalStrength?: number;
  
  // 位置信息
  altitude?: number;
  speed?: number;
}

// 定义 Context 类型
interface DroneContextType {
  droneState: DroneState;
  updateDroneState: (updates: Partial<DroneState>) => void;
  connectToDrone: () => Promise<boolean>;
  disconnectFromDrone: () => void;
  startMission: (missionType: string) => void;
  stopMission: () => void;
  configureAI: (apiKey: string, endpoint?: string) => Promise<boolean>;
  getStatusText: () => {
    cruise: string;
    mission: string;
    drone: string;
    ai: string;
  };
}

// 创建 Context
const DroneContext = createContext<DroneContextType | undefined>(undefined);

// 初始状态
const initialDroneState: DroneState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  missionStatus: 'standby',
  cruiseStatus: 'standby',
  aiStatus: 'offline',
  aiApiConfigured: false,
  batteryLevel: undefined,
  signalStrength: undefined,
  altitude: undefined,
  speed: undefined,
};

// Provider 组件
export const DroneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [droneState, setDroneState] = useState<DroneState>(initialDroneState);

  // 更新无人机状态
  const updateDroneState = (updates: Partial<DroneState>) => {
    setDroneState(prev => ({ ...prev, ...updates }));
  };

  // 连接到 Tello 无人机
  const connectToDrone = async (): Promise<boolean> => {
    try {
      updateDroneState({ connectionStatus: 'connecting' });
      
      // 模拟连接过程 - 在实际项目中这里会调用 Tello SDK
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟连接成功/失败
      const connected = Math.random() > 0.3; // 70% 成功率
      
      if (connected) {
        updateDroneState({
          isConnected: true,
          connectionStatus: 'connected',
          batteryLevel: Math.floor(Math.random() * 100),
          signalStrength: Math.floor(Math.random() * 100),
        });
        return true;
      } else {
        updateDroneState({
          isConnected: false,
          connectionStatus: 'error',
        });
        return false;
      }
    } catch (error) {
      updateDroneState({
        isConnected: false,
        connectionStatus: 'error',
      });
      return false;
    }
  };

  // 断开无人机连接
  const disconnectFromDrone = () => {
    updateDroneState({
      isConnected: false,
      connectionStatus: 'disconnected',
      missionStatus: 'standby',
      cruiseStatus: 'standby',
      batteryLevel: undefined,
      signalStrength: undefined,
      altitude: undefined,
      speed: undefined,
    });
  };

  // 开始任务
  const startMission = (missionType: string) => {
    if (!droneState.isConnected) return;
    
    updateDroneState({
      missionStatus: 'preparing',
      currentMission: missionType,
    });
    
    // 模拟任务执行
    setTimeout(() => {
      updateDroneState({ missionStatus: 'executing' });
    }, 1000);
  };

  // 停止任务
  const stopMission = () => {
    updateDroneState({
      missionStatus: 'standby',
      currentMission: undefined,
    });
  };

  // 配置 AI API
  const configureAI = async (apiKey: string, endpoint?: string): Promise<boolean> => {
    try {
      updateDroneState({ aiStatus: 'connecting' });
      
      // 模拟 API 配置验证
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 验证 API 密钥格式
      const isValidKey = apiKey.length > 10 && apiKey.startsWith('sk-');
      
      if (isValidKey) {
        updateDroneState({
          aiStatus: 'online',
          aiApiConfigured: true,
        });
        return true;
      } else {
        updateDroneState({
          aiStatus: 'error',
          aiApiConfigured: false,
        });
        return false;
      }
    } catch (error) {
      updateDroneState({
        aiStatus: 'error',
        aiApiConfigured: false,
      });
      return false;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    const cruiseText = {
      'standby': '巡航：待机',
      'takeoff': '巡航：起飞',
      'cruising': '巡航：飞行中',
      'landing': '巡航：降落',
      'hovering': '巡航：悬停',
    }[droneState.cruiseStatus];

    const missionText = {
      'standby': '任务：待机',
      'preparing': '任务：准备中',
      'executing': '任务：执行中',
      'completed': '任务：已完成',
      'failed': '任务：失败',
    }[droneState.missionStatus];

    const droneText = {
      'disconnected': '无人机：未连接',
      'connecting': '无人机：连接中',
      'connected': '无人机：已连接',
      'error': '无人机：连接错误',
    }[droneState.connectionStatus];

    const aiText = {
      'offline': 'AI：离线',
      'connecting': 'AI：连接中',
      'online': 'AI：在线',
      'error': 'AI：配置错误',
    }[droneState.aiStatus];

    return {
      cruise: cruiseText,
      mission: missionText,
      drone: droneText,
      ai: aiText,
    };
  };

  // 模拟无人机状态更新
  useEffect(() => {
    if (!droneState.isConnected) return;

    const interval = setInterval(() => {
      // 随机更新一些状态
      if (Math.random() > 0.8) {
        updateDroneState({
          altitude: Math.floor(Math.random() * 100),
          speed: Math.floor(Math.random() * 20),
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [droneState.isConnected]);

  const contextValue: DroneContextType = {
    droneState,
    updateDroneState,
    connectToDrone,
    disconnectFromDrone,
    startMission,
    stopMission,
    configureAI,
    getStatusText,
  };

  return (
    <DroneContext.Provider value={contextValue}>
      {children}
    </DroneContext.Provider>
  );
};

// Hook 来使用 DroneContext
export const useDrone = (): DroneContextType => {
  const context = useContext(DroneContext);
  if (context === undefined) {
    throw new Error('useDrone must be used within a DroneProvider');
  }
  return context;
};

export default DroneContext;