// 系统状态收集器 - 收集所有组件状态用于AI分析
import { DroneState } from '../contexts/DroneContext';

// 系统整体状态接口
export interface SystemStatus {
  timestamp: number;
  
  // 无人机状态
  drone: {
    isConnected: boolean;
    connectionStatus: string;
    missionStatus: string;
    cruiseStatus: string;
    batteryLevel?: number;
    signalStrength?: number;
    altitude?: number;
    speed?: number;
    currentMission?: string;
  };
  
  // AI 系统状态
  ai: {
    status: string;
    isConfigured: boolean;
    lastInteraction?: number;
  };
  
  // 检测系统状态
  detection: {
    currentType: 'strawberry' | 'qr' | 'general';
    isActive: boolean;
    lastDetectionTime?: number;
    detectionCount?: number;
  };
  
  // 视频流状态
  video: {
    isStreaming: boolean;
    quality?: string;
    fps?: number;
    resolution?: string;
  };
  
  // 任务执行状态
  mission: {
    isActive: boolean;
    progress?: number;
    type?: string;
    startTime?: number;
    estimatedDuration?: number;
  };
  
  // 系统整体健康状况
  system: {
    componentCount: number;
    activeComponents: string[];
    errorCount: number;
    warnings: string[];
  };
  
  // 用户交互状态
  user: {
    lastActivity: number;
    interactionMode: 'manual' | 'automatic' | 'mixed';
    recentActions: string[];
  };
}

// 检测系统状态（模拟）
interface DetectionStatus {
  currentType: 'strawberry' | 'qr' | 'general';
  isActive: boolean;
  lastDetectionTime?: number;
  detectionCount?: number;
}

// 视频流状态（模拟）
interface VideoStatus {
  isStreaming: boolean;
  quality?: string;
  fps?: number;
  resolution?: string;
}

// 任务状态（模拟）
interface MissionStatus {
  isActive: boolean;
  progress?: number;
  type?: string;
  startTime?: number;
  estimatedDuration?: number;
}

// 系统状态收集器类
export class SystemStatusCollector {
  private static instance: SystemStatusCollector;
  private detectionStatus: DetectionStatus = {
    currentType: 'strawberry',
    isActive: false,
  };
  private videoStatus: VideoStatus = {
    isStreaming: false,
  };
  private missionStatus: MissionStatus = {
    isActive: false,
  };
  private userActivity: {
    lastActivity: number;
    recentActions: string[];
  } = {
    lastActivity: Date.now(),
    recentActions: [],
  };

  private constructor() {}

  public static getInstance(): SystemStatusCollector {
    if (!SystemStatusCollector.instance) {
      SystemStatusCollector.instance = new SystemStatusCollector();
    }
    return SystemStatusCollector.instance;
  }

  // 更新检测状态
  public updateDetectionStatus(status: Partial<DetectionStatus>) {
    this.detectionStatus = { ...this.detectionStatus, ...status };
  }

  // 更新视频状态
  public updateVideoStatus(status: Partial<VideoStatus>) {
    this.videoStatus = { ...this.videoStatus, ...status };
  }

  // 更新任务状态
  public updateMissionStatus(status: Partial<MissionStatus>) {
    this.missionStatus = { ...this.missionStatus, ...status };
  }

  // 记录用户活动
  public recordUserActivity(action: string) {
    this.userActivity.lastActivity = Date.now();
    this.userActivity.recentActions.push(action);
    // 只保留最近10个活动
    if (this.userActivity.recentActions.length > 10) {
      this.userActivity.recentActions = this.userActivity.recentActions.slice(-10);
    }
  }

  // 收集完整的系统状态
  public collectSystemStatus(droneState: DroneState): SystemStatus {
    const now = Date.now();
    
    // 分析系统健康状况
    const warnings: string[] = [];
    let errorCount = 0;
    
    // 检查各种警告条件
    if (droneState.batteryLevel && droneState.batteryLevel < 20) {
      warnings.push('无人机电量过低');
      errorCount++;
    }
    
    if (droneState.signalStrength && droneState.signalStrength < 30) {
      warnings.push('无人机信号强度弱');
      errorCount++;
    }
    
    if (!droneState.isConnected && this.missionStatus.isActive) {
      warnings.push('任务正在执行但无人机未连接');
      errorCount++;
    }
    
    if (droneState.aiStatus === 'error') {
      warnings.push('AI服务配置错误');
      errorCount++;
    }

    // 确定用户交互模式
    const timeSinceLastActivity = now - this.userActivity.lastActivity;
    let interactionMode: 'manual' | 'automatic' | 'mixed' = 'manual';
    
    if (timeSinceLastActivity > 300000) { // 5分钟无操作
      interactionMode = 'automatic';
    } else if (this.missionStatus.isActive) {
      interactionMode = 'mixed';
    }

    return {
      timestamp: now,
      
      drone: {
        isConnected: droneState.isConnected,
        connectionStatus: droneState.connectionStatus,
        missionStatus: droneState.missionStatus,
        cruiseStatus: droneState.cruiseStatus,
        batteryLevel: droneState.batteryLevel,
        signalStrength: droneState.signalStrength,
        altitude: droneState.altitude,
        speed: droneState.speed,
        currentMission: droneState.currentMission,
      },
      
      ai: {
        status: droneState.aiStatus,
        isConfigured: droneState.aiApiConfigured,
        lastInteraction: now,
      },
      
      detection: this.detectionStatus,
      video: this.videoStatus,
      mission: this.missionStatus,
      
      system: {
        componentCount: 12, // 根据实际组件数量
        activeComponents: this.getActiveComponents(),
        errorCount,
        warnings,
      },
      
      user: {
        lastActivity: this.userActivity.lastActivity,
        interactionMode,
        recentActions: this.userActivity.recentActions,
      },
    };
  }

  // 获取当前活跃组件列表（模拟）
  private getActiveComponents(): string[] {
    const activeComponents: string[] = [];
    
    if (this.detectionStatus.isActive) {
      activeComponents.push('detection-system');
    }
    
    if (this.videoStatus.isStreaming) {
      activeComponents.push('video-stream');
    }
    
    if (this.missionStatus.isActive) {
      activeComponents.push('mission-controller');
    }
    
    // 基础组件总是活跃
    activeComponents.push('drone-connection', 'ai-assistant', 'manual-control');
    
    return activeComponents;
  }

  // 生成用于AI分析的状态描述
  public generateStatusDescription(systemStatus: SystemStatus): string {
    const { drone, ai, detection, video, mission, system, user } = systemStatus;
    
    let description = `当前系统状态分析报告（${new Date(systemStatus.timestamp).toLocaleString()}）：

【无人机状态】
- 连接状态：${drone.isConnected ? '已连接' : '未连接'}（${drone.connectionStatus}）
- 任务状态：${drone.missionStatus}${drone.currentMission ? `（${drone.currentMission}）` : ''}
- 巡航状态：${drone.cruiseStatus}`;

    if (drone.batteryLevel) {
      description += `\n- 电池电量：${drone.batteryLevel}%`;
    }
    
    if (drone.signalStrength) {
      description += `\n- 信号强度：${drone.signalStrength}%`;
    }
    
    if (drone.altitude) {
      description += `\n- 高度：${drone.altitude}m`;
    }
    
    if (drone.speed) {
      description += `\n- 速度：${drone.speed}m/s`;
    }

    description += `

【AI系统状态】
- AI服务：${ai.status}（${ai.isConfigured ? '已配置' : '未配置'}）

【检测系统】
- 检测类型：${detection.currentType}
- 检测状态：${detection.isActive ? '运行中' : '待机'}`;

    if (detection.detectionCount) {
      description += `\n- 检测次数：${detection.detectionCount}`;
    }

    description += `

【视频系统】
- 视频流：${video.isStreaming ? '正在播放' : '未播放'}`;

    if (video.quality) {
      description += `\n- 画质：${video.quality}`;
    }

    description += `

【任务执行】
- 任务状态：${mission.isActive ? '执行中' : '待机'}`;

    if (mission.progress) {
      description += `\n- 任务进度：${mission.progress}%`;
    }
    
    if (mission.type) {
      description += `\n- 任务类型：${mission.type}`;
    }

    description += `

【系统健康】
- 活跃组件：${system.activeComponents.length}个（${system.activeComponents.join('、')}）
- 错误数量：${system.errorCount}个`;

    if (system.warnings.length > 0) {
      description += `\n- 警告信息：${system.warnings.join('；')}`;
    }

    description += `

【用户交互】
- 交互模式：${user.interactionMode}
- 最近活动：${Math.floor((Date.now() - user.lastActivity) / 1000)}秒前`;

    if (user.recentActions.length > 0) {
      description += `\n- 最近操作：${user.recentActions.slice(-3).join('、')}`;
    }

    return description;
  }
}

// 导出单例实例
export const systemStatusCollector = SystemStatusCollector.getInstance();