import { useState, useEffect, useCallback, useRef } from 'react';
import { saveDroneState, getDroneState, clearDroneState, hasValidStoredState, onStorageChange } from '../lib/droneStateStorage';

interface DroneStatus {
  connected: boolean;
  flying: boolean;
  battery: number;
  mission_active: boolean;
  challenge_cruise_active: boolean;
  wifi_signal: number;
  temperature: number;
  altitude?: number;
  speed?: number;
  gps?: { lat: number; lng: number } | null;
  mode?: 'manual' | 'auto' | 'cruise';
  armed?: boolean;
}

interface MissionStatus {
  active: boolean;
  progress: number;
  currentWaypoint: number;
  totalWaypoints: number;
  estimatedTime: number;
}

interface DetectionStats {
  totalPlants: number;
  matureStrawberries: number;
  immatureStrawberries: number;
  diseased: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface VideoStreamState {
  isStreaming: boolean;
  currentFrame: string | null; // Base64 encoded frame
  fps: number;
  resolution: string;
  timestamp: string;
  fileMode: boolean;
  detectionStatus: {
    qr_enabled: boolean;
    strawberry_enabled: boolean;
    ai_enabled: boolean;
  };
}

interface MissionPositionPayload {
  current_pad?: number | string;
  coords?: { x: number; y: number; z: number };
  target_pad?: number | string;
  progress?: number | null;
  note?: string | null;
  timestamp?: string;
}

// 新增：QR扫描结果接口
interface QRScanResult {
  id: string;
  plantId: string;
  timestamp: string;
  qrImage: string; // Base64 encoded image
  size?: string;
  cooldownTime?: number;
}

// 新增：QR扫描状态接口
interface QRScanState {
  lastScan: QRScanResult | null;
  scanHistory: QRScanResult[];
  cooldowns: Record<string, number>; // plantId -> cooldown end timestamp
}

// 新增：任务消息类型
interface MissionMessage {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export const useDroneControl = () => {
  // 从本地存储恢复状态
  const storedState = getDroneState();
  
  const [droneStatus, setDroneStatus] = useState<DroneStatus>({
    connected: storedState.connected,
    flying: storedState.flying,
    battery: storedState.battery,
    mission_active: storedState.mission_active,
    challenge_cruise_active: storedState.challenge_cruise_active,
    wifi_signal: storedState.wifi_signal,
    temperature: storedState.temperature,
    altitude: storedState.altitude || 0,
    speed: storedState.speed || 0,
    gps: storedState.gps,
    mode: storedState.mode || 'manual',
    armed: storedState.armed || false
  });

  // 包装setDroneStatus以自动保存到本地存储
  const updateDroneStatus = useCallback((updater: React.SetStateAction<DroneStatus>) => {
    setDroneStatus(prev => {
      const newState = typeof updater === 'function' ? updater(prev) : updater;
      // 保存到本地存储
      saveDroneState(newState);
      return newState;
    });
  }, []);

  // 重连相关状态
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3秒

  const [missionStatus, setMissionStatus] = useState<MissionStatus>({
    active: false,
    progress: 0,
    currentWaypoint: 0,
    totalWaypoints: 0,
    estimatedTime: 0
  });

  const [detectionStats, setDetectionStats] = useState<DetectionStats>({
    totalPlants: 0,
    matureStrawberries: 0,
    immatureStrawberries: 0,
    diseased: 0
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [videoStream, setVideoStream] = useState<VideoStreamState>({
    isStreaming: false,
    currentFrame: null,
    fps: 0,
    resolution: '0x0',
    timestamp: '',
    fileMode: false,
    detectionStatus: {
      qr_enabled: false,
      strawberry_enabled: false,
      ai_enabled: false
    }
  });
  
  // 新增：任务位置与任务消息
  const [missionPosition, setMissionPosition] = useState<MissionPositionPayload | null>(null);
  const [missionMessages, setMissionMessages] = useState<MissionMessage[]>([]);

  // 新增：QR扫描状态
  const [qrScan, setQrScan] = useState<QRScanState>({
    lastScan: null,
    scanHistory: [],
    cooldowns: {}
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = useCallback((level: 'info' | 'warning' | 'error' | 'success', message: string) => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep only last 100 logs
  }, []);

  // 清除重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connectToDrone = useCallback(async () => {
    if (isConnecting || (droneStatus.connected && wsRef.current?.readyState === WebSocket.OPEN)) return;
    
    // 清除之前的重连定时器
    clearReconnectTimeout();
    
    setIsConnecting(true);
    addLog('info', '正在连接无人机...');

    try {
      // Connect to backend WebSocket server on port 3002
      const ws = new WebSocket('ws://localhost:3002');
      
      ws.onopen = () => {
        wsRef.current = ws;
        addLog('info', 'WebSocket连接成功，发送无人机连接命令...');
        // Send drone_connect message
        ws.send(JSON.stringify({ type: 'drone_connect' }));
        setIsConnecting(false);
        setIsReconnecting(false);
        setReconnectAttempts(0); // 重置重连计数
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
             case 'drone_status':
               updateDroneStatus(prev => ({ ...prev, ...data.data }));
               break;
             case 'drone_connected': {
               const payload = data.data || {};
               if (payload.success) {
                 updateDroneStatus(prev => ({ ...prev, connected: true, battery: payload.battery ?? prev.battery }));
                 addLog('success', '无人机连接成功');
               } else {
                 updateDroneStatus(prev => ({ ...prev, connected: false }));
                 addLog('error', payload.message || '无人机连接失败');
               }
               break;
             }
             case 'connection_established': {
               const payload = data.data || {};
               addLog('info', payload.message || '已连接到后端服务');
               break;
             }
             case 'drone_takeoff_complete':
               updateDroneStatus(prev => ({ ...prev, flying: true }));
               addLog('success', '无人机起飞完成');
               break;
             case 'drone_land_complete':
               updateDroneStatus(prev => ({ ...prev, flying: false }));
               addLog('success', '无人机降落完成');
               break;
            case 'mission_status':
              if (data.data?.status === 'challenge_cruise_started') {
                setMissionStatus(prev => ({ ...prev, active: true }));
                addLog('info', '挑战卡巡航任务已开始');
              } else if (data.data?.status === 'challenge_cruise_stopped') {
                setMissionStatus(prev => ({ ...prev, active: false }));
                addLog('info', '挑战卡巡航任务已停止');
              } else if (data.data?.type === 'progress_update') {
                const msg = (typeof data.data.message === 'string') ? data.data.message : JSON.stringify(data.data.message);
                setMissionMessages(prev => ([{ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), level: 'info' as MissionMessage['level'], message: msg }, ...prev]).slice(0, 100));
              }
              break;
            case 'mission_position': {
              const payload: MissionPositionPayload = data.data || data;
              setMissionPosition(payload);
              const note = payload?.note || `位置更新: PAD${payload.current_pad} -> ${payload.target_pad} [${payload.coords?.x}, ${payload.coords?.y}, ${payload.coords?.z}]`;
              setMissionMessages(prev => ([{ id: Date.now().toString(), timestamp: payload.timestamp || new Date().toLocaleTimeString(), level: 'success' as MissionMessage['level'], message: note }, ...prev]).slice(0, 100));
              break;
            }
            case 'strawberry_detection':
              if (data.data) {
                setDetectionStats(prev => ({
                  ...prev,
                  totalPlants: data.data.total_count || prev.totalPlants,
                  matureStrawberries: data.data.mature_count || prev.matureStrawberries,
                  immatureStrawberries: data.data.immature_count || prev.immatureStrawberries
                }));
                addLog('info', `检测到${data.data.total_count}个草莓`);
              }
              break;
            case 'ai_analysis_complete':
              addLog('success', 'AI分析完成');
              // 处理AI分析结果并触发相应的无人机动作
              if (data.data?.analysis) {
                const analysis = data.data.analysis;
                const plantId = data.data.plant_id;
                
                // 根据健康评分触发不同的动作
                if (analysis.health_score !== undefined) {
                  const healthScore = analysis.health_score;
                  addLog('info', `植株 ${plantId} 健康评分: ${healthScore}/100`);
                  
                  // 如果健康评分低于阈值，触发警告动作
                  if (healthScore < 60) {
                    addLog('warning', `植株 ${plantId} 健康状况不佳，建议进一步检查`);
                    // 可以在这里添加触发无人机特定动作的逻辑
                    // 例如：悬停更长时间、拍摄更多照片等
                  } else if (healthScore >= 80) {
                    addLog('success', `植株 ${plantId} 健康状况良好`);
                  }
                }
                
                // 处理疾病检测结果
                if (analysis.diseases && analysis.diseases.length > 0) {
                  analysis.diseases.forEach((disease: any) => {
                    addLog('warning', `检测到疾病: ${disease.name} (置信度: ${disease.confidence})`);
                  });
                }
                
                // 处理营养状况
                if (analysis.nutrition_status) {
                  addLog('info', `营养状况: ${analysis.nutrition_status}`);
                }
              }
              break;
            case 'simulation_started': {
              const payload = data.data || {};
              addLog('info', payload.message || '模拟分析开始');
              break;
            }
            case 'simulation_analysis_complete': {
              const payload = data.data || {};
              addLog('success', payload.message || '模拟分析完成');
              break;
            }
            case 'qr_detected': {
              const payload = data.data;
              if (payload?.plant_id) {
                const now = Date.now();
                const cooldownEnds = now + (payload.cooldown_seconds ?? 60) * 1000;

                const newScan: QRScanResult = {
                  id: `${payload.plant_id}-${now}`,
                  plantId: payload.plant_id,
                  timestamp: new Date(now).toLocaleTimeString(),
                  qrImage: payload.qr_image, // 假设后端返回'qr_image'字段
                  size: payload.size,
                  cooldownTime: cooldownEnds
                };

                setQrScan(prev => {
                  const newHistory = [newScan, ...prev.scanHistory].slice(0, 20);
                  return {
                    lastScan: newScan,
                    scanHistory: newHistory,
                    cooldowns: {
                      ...prev.cooldowns,
                      [payload.plant_id]: cooldownEnds
                    }
                  };
                });

                addLog('info', `检测到QR码: ${payload.plant_id}`);
              }
              break;
            }
            case 'status_update':
              addLog('info', data.data?.message || '状态更新');
              break;
            case 'error':
              addLog('error', data.data?.message || '发生错误');
              break;
            case 'manual_control_ack':
              addLog('info', '手动控制指令已确认');
              break;
            case 'heartbeat_ack':
              // Silent heartbeat acknowledgment
              break;
            case 'video_frame': {
              const payload = data.data || {};
              setVideoStream(prev => ({
                ...prev,
                isStreaming: true,
                currentFrame: payload.frame || null,
                fps: payload.fps ?? prev.fps,
                resolution: `${payload.width || 0}x${payload.height || 0}`,
                timestamp: payload.timestamp || new Date().toISOString(),
                fileMode: payload.file_mode || false,
                detectionStatus: payload.detection_status || prev.detectionStatus
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
              console.log('未处理的消息类型:', data.type, data);
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
         wsRef.current = null;
         updateDroneStatus(prev => ({ ...prev, connected: false }));
         setVideoStream(prev => ({ ...prev, isStreaming: false, currentFrame: null }));
         
         // 检查是否是正常关闭（用户主动断开）
         if (event.code === 1000) {
           addLog('info', '无人机连接正常断开');
           setIsConnecting(false);
           return;
         }
         
         addLog('warning', '无人机连接断开，准备重连...');
         setIsConnecting(false);
         
         // 如果不是正常断开且之前是连接状态，尝试重连
         if (storedState.connected && !isReconnecting) {
           attemptReconnect();
         }
       };

      ws.onerror = (error) => {
        addLog('error', '无人机连接失败');
        setIsConnecting(false);
        
        // 连接错误时也尝试重连
        if (!isReconnecting) {
          attemptReconnect();
        }
      };

    } catch (error) {
      addLog('error', '连接错误: ' + (error as Error).message);
      setIsConnecting(false);
    }
  }, [isConnecting, droneStatus.connected, addLog]);

  // 自动重连函数
  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      addLog('error', `重连失败，已达到最大重连次数 (${maxReconnectAttempts})`);
      setIsReconnecting(false);
      setReconnectAttempts(0);
      return;
    }

    setIsReconnecting(true);
    setReconnectAttempts(prev => prev + 1);
    addLog('info', `尝试重连... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connectToDrone();
    }, reconnectDelay);
  }, [reconnectAttempts, maxReconnectAttempts, addLog, connectToDrone]);

  const disconnectFromDrone = useCallback(() => {
     if (wsRef.current) {
       // Send drone_disconnect message before closing
       wsRef.current.send(JSON.stringify({ type: 'drone_disconnect' }));
       wsRef.current.close();
       wsRef.current = null;
     }
     updateDroneStatus(prev => ({ ...prev, connected: false }));
     setVideoStream(prev => ({ ...prev, isStreaming: false, currentFrame: null }));
     addLog('info', '已断开无人机连接');
   }, [addLog]);

  const sendMessage = useCallback((type: string, data?: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('error', '无人机未连接，无法发送命令');
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

  const takeoff = useCallback(() => {
    addLog('info', '发送起飞命令...');
    return sendMessage('drone_takeoff');
  }, [sendMessage, addLog]);

  const land = useCallback(() => {
    addLog('info', '发送降落命令...');
    return sendMessage('drone_land');
  }, [sendMessage, addLog]);

  const startMission = useCallback(() => {
    addLog('info', '启动任务...');
    return sendMessage('mission_start');
  }, [sendMessage, addLog]);

  const pauseMission = useCallback(() => {
    addLog('info', '暂停任务...');
    return sendMessage('mission_pause');
  }, [sendMessage, addLog]);

  const resumeMission = useCallback(() => {
    addLog('info', '恢复任务...');
    return sendMessage('mission_resume');
  }, [sendMessage, addLog]);

  const stopMission = useCallback(() => {
    addLog('info', '停止任务...');
    return sendMessage('mission_stop');
  }, [sendMessage, addLog]);

  const startDetection = useCallback(() => {
    addLog('info', '启动草莓检测...');
    return sendMessage('start_strawberry_detection');
  }, [sendMessage, addLog]);

  const stopDetection = useCallback(() => {
    addLog('info', '停止草莓检测...');
    return sendMessage('stop_strawberry_detection');
  }, [sendMessage, addLog]);

  const startRippleDetection = useCallback(() => {
    addLog('info', '启动草莓成熟度检测...');
    return sendMessage('start_strawberry_detection');
  }, [sendMessage, addLog]);

  const stopRippleDetection = useCallback(() => {
    addLog('info', '停止草莓成熟度检测...');
    return sendMessage('stop_strawberry_detection');
  }, [sendMessage, addLog]);

  const startQRDetection = useCallback(() => {
    addLog('info', '启动QR码检测...');
    return sendMessage('start_qr_detection');
  }, [sendMessage, addLog]);

  const stopQRDetection = useCallback(() => {
    addLog('info', '停止QR码检测...');
    return sendMessage('stop_qr_detection');
  }, [sendMessage, addLog]);

  const manualControl = useCallback((direction: 'up' | 'down' | 'left' | 'right' | 'center') => {
    let left_right = 0;
    let forward_backward = 0;
    let up_down = 0;
    let yaw = 0;

    const controlValue = 50; // 控制强度，范围 -100 到 100

    switch (direction) {
      case 'up':
        up_down = controlValue;
        break;
      case 'down':
        up_down = -controlValue;
        break;
      case 'left':
        left_right = -controlValue;
        break;
      case 'right':
        left_right = controlValue;
        break;
      case 'center':
        // 悬停，所有值为0
        break;
    }

    addLog('info', `手动控制: ${direction}`);
    return sendMessage('manual_control', {
      left_right,
      forward_backward,
      up_down,
      yaw
    });
  }, [sendMessage, addLog]);

  const startVideoStream = useCallback(() => {
    addLog('info', '启动视频流...');
    return sendMessage('start_video_streaming', {});
  }, [sendMessage, addLog]);

  const stopVideoStream = useCallback(() => {
    addLog('info', '停止视频流...');
    setVideoStream(prev => ({
      ...prev,
      isStreaming: false,
      currentFrame: null
    }));
    return sendMessage('stop_video_streaming', {});
  }, [sendMessage, addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('info', '日志已清空');
  }, [addLog]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setQrScan(prev => {
        const activeCooldowns: Record<string, number> = {};
        let needsUpdate = false;
        for (const plantId in prev.cooldowns) {
          if (prev.cooldowns[plantId] > now) {
            activeCooldowns[plantId] = prev.cooldowns[plantId];
          } else {
            needsUpdate = true;
          }
        }
        return needsUpdate ? { ...prev, cooldowns: activeCooldowns } : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);
  
  // 页面加载时检查存储的连接状态并自动重连
  useEffect(() => {
    const checkAndReconnect = async () => {
      // 检查是否有有效的存储状态且之前是连接状态
      if (hasValidStoredState() && storedState.connected) {
        addLog('info', '检测到之前的连接状态，正在尝试重连...');
        // 延迟一点时间再连接，确保组件完全初始化
        setTimeout(() => {
          connectToDrone();
        }, 1000);
      }
    };

    checkAndReconnect();
  }, [connectToDrone]); // 依赖connectToDrone函数


  return {
    droneStatus,
    missionStatus,
    detectionStats,
    logs,
    videoStream,
    isConnecting,
    missionPosition,
    missionMessages,
    qrScan, // 导出QR状态
    connectToDrone,
    disconnectFromDrone,
    takeoff,
    land,
    startMission,
    pauseMission,
    resumeMission,
    stopMission,
    startDetection,
    stopDetection,
    startRippleDetection,
    stopRippleDetection,
    startQRDetection,
    stopQRDetection,
    startVideoStream,
    stopVideoStream,
    manualControl,
    clearLogs,
    sendMessage
  };
};