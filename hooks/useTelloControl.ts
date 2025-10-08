import { useState, useEffect, useCallback, useRef } from 'react';

interface TelloState {
  connected: boolean;
  flying: boolean;
  battery: number;
  wifiSignal: number;
  temperature: number;
  altitude: number;
  speed: number;
  pitch: number;
  roll: number;
  yaw: number;
  missionActive: boolean;
  challengeCruiseActive: boolean;
}

interface TelloPosition {
  x: number;
  y: number;
  z: number;
  padId?: number;
}

interface TelloMissionStatus {
  active: boolean;
  progress: number;
  currentWaypoint: number;
  totalWaypoints: number;
  estimatedTime: number;
}

interface TelloLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface TelloVideoStream {
  isStreaming: boolean;
  currentFrame: string | null;
  fps: number;
  resolution: string;
  timestamp: string;
}

export const useTelloControl = () => {
  const [telloState, setTelloState] = useState<TelloState>({
    connected: false,
    flying: false,
    battery: 0,
    wifiSignal: 0,
    temperature: 0,
    altitude: 0,
    speed: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    missionActive: false,
    challengeCruiseActive: false
  });

  const [missionStatus, setMissionStatus] = useState<TelloMissionStatus>({
    active: false,
    progress: 0,
    currentWaypoint: 0,
    totalWaypoints: 0,
    estimatedTime: 0
  });

  const [position, setPosition] = useState<TelloPosition>({
    x: 0,
    y: 0,
    z: 0,
    padId: undefined
  });

  const [logs, setLogs] = useState<TelloLogEntry[]>([]);
  const [videoStream, setVideoStream] = useState<TelloVideoStream>({
    isStreaming: false,
    currentFrame: null,
    fps: 0,
    resolution: '0x0',
    timestamp: ''
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((level: 'info' | 'warning' | 'error' | 'success', message: string) => {
    const newLog: TelloLogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  }, []);

  // 心跳机制，保持连接活跃
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 3000); // 每3秒发送一次心跳
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connectToTello = useCallback(async () => {
    if (isConnecting || telloState.connected) return;
    
    setIsConnecting(true);
    addLog('info', '正在连接Tello无人机...');

    try {
      const ws = new WebSocket('ws://localhost:3002');
      
      ws.onopen = () => {
        wsRef.current = ws;
        addLog('info', 'WebSocket连接成功，发送Tello连接命令...');
        ws.send(JSON.stringify({ type: 'drone_connect' }));
        startHeartbeat();
        setIsConnecting(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'drone_status':
              setTelloState(prev => ({ 
                ...prev, 
                ...data.data,
                // 确保关键状态正确映射
                connected: data.data.connected ?? prev.connected,
                flying: data.data.flying ?? prev.flying,
                battery: data.data.battery ?? prev.battery,
                altitude: data.data.altitude ?? prev.altitude,
                speed: data.data.speed ?? prev.speed
              }));
              break;
              
            case 'drone_connected': {
              const payload = data.data || {};
              if (payload.success) {
                setTelloState(prev => ({ 
                  ...prev, 
                  connected: true, 
                  battery: payload.battery ?? prev.battery 
                }));
                addLog('success', 'Tello无人机连接成功');
              } else {
                setTelloState(prev => ({ ...prev, connected: false }));
                addLog('error', payload.message || 'Tello无人机连接失败');
              }
              break;
            }
            
            case 'connection_established': {
              const payload = data.data || {};
              addLog('info', payload.message || '已连接到Tello后端服务');
              break;
            }
            
            case 'drone_takeoff_complete':
              setTelloState(prev => ({ ...prev, flying: true }));
              addLog('success', 'Tello起飞完成');
              break;
              
            case 'drone_land_complete':
              setTelloState(prev => ({ ...prev, flying: false }));
              addLog('success', 'Tello降落完成');
              break;
              
            case 'mission_status':
              if (data.data?.type === 'challenge_cruise_started') {
                setMissionStatus(prev => ({ ...prev, active: true }));
                setTelloState(prev => ({ ...prev, challengeCruiseActive: true }));
                addLog('info', '挑战卡巡航任务已开始');
              } else if (data.data?.type === 'challenge_cruise_stopped') {
                setMissionStatus(prev => ({ ...prev, active: false }));
                setTelloState(prev => ({ ...prev, challengeCruiseActive: false }));
                addLog('info', '挑战卡巡航任务已停止');
              } else if (data.data?.type === 'progress_update') {
                addLog('info', data.data.message || '任务进度更新');
              }
              break;
              
            case 'mission_position': {
              const payload = data.data || {};
              setPosition({
                x: payload.coords?.x || 0,
                y: payload.coords?.y || 0,
                z: payload.coords?.z || 0,
                padId: payload.current_pad ? Number(payload.current_pad) : undefined
              });
              break;
            }
              
            case 'status_update':
              addLog('info', data.data?.message || '状态更新');
              break;
              
            case 'error':
              addLog('error', data.data?.message || '发生错误');
              break;
              
            case 'video_frame': {
              const payload = data.data || {};
              setVideoStream(prev => ({
                ...prev,
                isStreaming: true,
                currentFrame: payload.frame || null,
                fps: payload.fps ?? prev.fps,
                resolution: `${payload.width || 0}x${payload.height || 0}`,
                timestamp: payload.timestamp || new Date().toISOString()
              }));
              break;
            }
            
            case 'video_stream_error': {
              const payload = data.data || {};
              setVideoStream(prev => ({
                ...prev,
                isStreaming: false,
                currentFrame: null
              }));
              addLog('error', `视频流错误: ${payload.message || '未知错误'}`);
              break;
            }
            
            default:
              // 忽略未处理的消息类型
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        stopHeartbeat();
        setTelloState(prev => ({ 
          ...prev, 
          connected: false,
          flying: false,
          missionActive: false,
          challengeCruiseActive: false
        }));
        setVideoStream(prev => ({ ...prev, isStreaming: false, currentFrame: null }));
        addLog('warning', 'Tello连接断开');
        setIsConnecting(false);
      };

      ws.onerror = (error) => {
        addLog('error', 'Tello连接错误: ' + error.type);
        setIsConnecting(false);
      };

    } catch (error) {
      addLog('error', '连接错误: ' + (error as Error).message);
      setIsConnecting(false);
    }
  }, [isConnecting, telloState.connected, addLog, startHeartbeat, stopHeartbeat]);

  const disconnectFromTello = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'drone_disconnect' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    stopHeartbeat();
    setTelloState(prev => ({ 
      ...prev, 
      connected: false,
      flying: false,
      missionActive: false,
      challengeCruiseActive: false
    }));
    setVideoStream(prev => ({ ...prev, isStreaming: false, currentFrame: null }));
    addLog('info', '已断开Tello连接');
  }, [addLog, stopHeartbeat]);

  const sendMessage = useCallback((type: string, data?: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', 'Tello未连接，无法发送命令');
      return false;
    }

    try {
      const message = { type, ...(data && { data }) };
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      addLog('error', '发送命令失败: ' + (error as Error).message);
      return false;
    }
  }, [addLog]);

  // 基础飞行控制
  const takeoff = useCallback(() => {
    addLog('info', '发送起飞命令...');
    return sendMessage('drone_takeoff');
  }, [sendMessage, addLog]);

  const land = useCallback(() => {
    addLog('info', '发送降落命令...');
    return sendMessage('drone_land');
  }, [sendMessage, addLog]);

  const emergencyStop = useCallback(() => {
    addLog('warning', '发送紧急停止命令...');
    return sendMessage('emergency_stop');
  }, [sendMessage, addLog]);

  // 精确控制
  const move = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'forward' | 'back', distance: number) => {
    addLog('info', `移动 ${direction} ${distance}cm`);
    return sendMessage('move', { direction, distance });
  }, [sendMessage, addLog]);

  const rotate = useCallback((direction: 'cw' | 'ccw', degrees: number) => {
    addLog('info', `旋转 ${direction} ${degrees}度`);
    return sendMessage('rotate', { direction, degrees });
  }, [sendMessage, addLog]);

  const flip = useCallback((direction: 'l' | 'r' | 'f' | 'b') => {
    addLog('info', `翻滚 ${direction}`);
    return sendMessage('flip', { direction });
  }, [sendMessage, addLog]);

  // 任务控制
  const startMission = useCallback((missionType: string, params?: any) => {
    addLog('info', `启动任务: ${missionType}`);
    return sendMessage('mission_start', { missionType, ...params });
  }, [sendMessage, addLog]);

  const stopMission = useCallback(() => {
    addLog('info', '停止任务');
    return sendMessage('mission_stop');
  }, [sendMessage, addLog]);

  const startChallengeCruise = useCallback((params?: { rounds?: number, height?: number, stayDuration?: number }) => {
    addLog('info', '启动挑战卡巡航任务');
    return sendMessage('challenge_cruise_start', params || {});
  }, [sendMessage, addLog]);

  const stopChallengeCruise = useCallback(() => {
    addLog('info', '停止挑战卡巡航任务');
    return sendMessage('challenge_cruise_stop');
  }, [sendMessage, addLog]);

  // 视频控制
  const startVideoStream = useCallback(() => {
    addLog('info', '启动视频流...');
    return sendMessage('start_video_streaming');
  }, [sendMessage, addLog]);

  const stopVideoStream = useCallback(() => {
    addLog('info', '停止视频流...');
    setVideoStream(prev => ({
      ...prev,
      isStreaming: false,
      currentFrame: null
    }));
    return sendMessage('stop_video_streaming');
  }, [sendMessage, addLog]);

  // 日志控制
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', '日志已清空');
  }, [addLog]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      stopHeartbeat();
    };
  }, [stopHeartbeat]);

  return {
    // 状态
    telloState,
    missionStatus,
    position,
    logs,
    videoStream,
    isConnecting,
    
    // 连接控制
    connectToTello,
    disconnectFromTello,
    
    // 基础飞行控制
    takeoff,
    land,
    emergencyStop,
    
    // 精确控制
    move,
    rotate,
    flip,
    
    // 任务控制
    startMission,
    stopMission,
    startChallengeCruise,
    stopChallengeCruise,
    
    // 视频控制
    startVideoStream,
    stopVideoStream,
    
    // 日志控制
    clearLogs,
    
    // 通用消息发送
    sendMessage
  };
};