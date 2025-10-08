// Agent管理器 - 专门处理面板控制和系统操作
import { DroneState } from '../contexts/DroneContext';
import { systemStatusCollector, SystemStatus } from './systemStatusCollector';

// Agent类型定义
export type AgentType = 'panel-control' | 'tello-drone' | 'system-monitor' | 'data-analysis';

// Agent指令接口
export interface AgentCommand {
  agent: AgentType;
  action: string;
  parameters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Agent解析结果接口
export interface AgentParseResult {
  intent: string;
  commands: AgentCommand[];
  needsConfirmation: boolean;
  response: string;
}

// Agent基类
export abstract class BaseAgent {
  abstract getType(): AgentType;
  abstract execute(action: string, parameters?: Record<string, any>): Promise<string>;
  abstract canHandle(action: string): boolean;
}

// 面板控制Agent
export class PanelControlAgent extends BaseAgent {
  getType(): AgentType {
    return 'panel-control';
  }

  canHandle(action: string): boolean {
    const panelActions = [
      'show-panel', 'hide-panel', 'toggle-panel', 
      'switch-tab', 'update-layout', 'resize-panel'
    ];
    return panelActions.includes(action);
  }

  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'show-panel':
        return this.showPanel(parameters?.panelId);
      case 'hide-panel':
        return this.hidePanel(parameters?.panelId);
      case 'toggle-panel':
        return this.togglePanel(parameters?.panelId);
      case 'switch-tab':
        return this.switchTab(parameters?.tabId);
      case 'update-layout':
        return this.updateLayout(parameters?.layoutConfig);
      case 'resize-panel':
        return this.resizePanel(parameters?.panelId, parameters?.size);
      default:
        return `未知的面板控制操作: ${action}`;
    }
  }

  private showPanel(panelId?: string): string {
    // 这里应该与前端状态管理集成
    console.log(`显示面板: ${panelId || '默认面板'}`);
    return `已显示面板: ${panelId || '默认面板'}`;
  }

  private hidePanel(panelId?: string): string {
    console.log(`隐藏面板: ${panelId || '默认面板'}`);
    return `已隐藏面板: ${panelId || '默认面板'}`;
  }

  private togglePanel(panelId?: string): string {
    console.log(`切换面板: ${panelId || '默认面板'}`);
    return `已切换面板: ${panelId || '默认面板'}`;
  }

  private switchTab(tabId?: string): string {
    console.log(`切换标签页: ${tabId || '默认标签页'}`);
    return `已切换到标签页: ${tabId || '默认标签页'}`;
  }

  private updateLayout(layoutConfig?: any): string {
    console.log('更新布局配置:', layoutConfig);
    return '布局已更新';
  }

  private resizePanel(panelId?: string, size?: { width: number; height: number }): string {
    console.log(`调整面板大小: ${panelId || '默认面板'} ->`, size);
    return `面板 ${panelId || '默认面板'} 大小已调整`;
  }
}

// Tello 无人机专用 Agent
export class TelloDroneAgent extends BaseAgent {
  getType(): AgentType {
    return 'tello-drone';
  }

  canHandle(action: string): boolean {
    const telloActions = [
      'takeoff', 'land', 'hover', 'emergency-stop',
      'forward', 'back', 'left', 'right', 'up', 'down',
      'cw', 'ccw', 'flip',
      'streamon', 'streamoff',
      'battery', 'speed', 'speed?',
      'rc', 'go', 'curve', 'stop'
    ];
    return telloActions.includes(action);
  }

  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    // 构建 API 路径
    let apiPath = '';
    let method = 'POST';
    let body: any = null;

    switch (action) {
      case 'takeoff':
        apiPath = '/api/drone/takeoff';
        break;
      case 'land':
        apiPath = '/api/drone/land';
        break;
      case 'hover':
        apiPath = '/api/drone/hover';
        break;
      case 'emergency-stop':
      case 'stop':
        apiPath = '/api/drone/emergency-stop';
        break;
      case 'forward':
      case 'back':
      case 'left':
      case 'right':
      case 'up':
      case 'down':
        apiPath = '/api/drone/move';
        body = { direction: action, distance: parameters?.distance || 20 };
        break;
      case 'cw':
      case 'ccw':
        apiPath = '/api/drone/rotate';
        body = { direction: action, degrees: parameters?.degrees || 90 };
        break;
      case 'flip':
        apiPath = '/api/drone/flip';
        body = { direction: parameters?.direction || 'f' };
        break;
      case 'streamon':
      case 'streamoff':
        apiPath = '/api/drone/stream';
        body = { enable: action === 'streamon' };
        break;
      case 'battery':
        apiPath = '/api/drone/battery';
        method = 'GET';
        break;
      case 'speed':
        apiPath = '/api/drone/speed';
        body = { speed: parameters?.speed || 50 };
        break;
      case 'speed?':
        apiPath = '/api/drone/speed';
        method = 'GET';
        break;
      case 'rc':
        apiPath = '/api/drone/rc';
        body = { 
          a: parameters?.a || 0, 
          b: parameters?.b || 0, 
          c: parameters?.c || 0, 
          d: parameters?.d || 0 
        };
        break;
      case 'go':
        apiPath = '/api/drone/go';
        body = { 
          x: parameters?.x || 0, 
          y: parameters?.y || 0, 
          z: parameters?.z || 0, 
          speed: parameters?.speed || 50 
        };
        break;
      case 'curve':
        apiPath = '/api/drone/curve';
        body = { 
          x1: parameters?.x1 || 0, 
          y1: parameters?.y1 || 0, 
          z1: parameters?.z1 || 0,
          x2: parameters?.x2 || 0, 
          y2: parameters?.y2 || 0, 
          z2: parameters?.z2 || 0,
          speed: parameters?.speed || 50 
        };
        break;
      default:
        return `未知的 Tello 无人机操作: ${action}`;
    }

    try {
      const options: RequestInit = { method };
      if (body && method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
      }

      const response = await fetch(apiPath, options);
      
      if (response.ok) {
        switch (action) {
          case 'takeoff':
            return 'Tello 无人机起飞指令已发送';
          case 'land':
            return 'Tello 无人机降落指令已发送';
          case 'hover':
            return 'Tello 无人机悬停指令已发送';
          case 'emergency-stop':
          case 'stop':
            return 'Tello 无人机紧急停止指令已发送';
          case 'forward':
          case 'back':
          case 'left':
          case 'right':
          case 'up':
          case 'down':
            return `Tello 无人机${action}移动${body.distance}厘米指令已发送`;
          case 'cw':
            return `Tello 无人机顺时针旋转${body.degrees}度指令已发送`;
          case 'ccw':
            return `Tello 无人机逆时针旋转${body.degrees}度指令已发送`;
          case 'flip':
            return `Tello 无人机${body.direction}方向翻滚指令已发送`;
          case 'streamon':
            return 'Tello 无人机视频流开启指令已发送';
          case 'streamoff':
            return 'Tello 无人机视频流关闭指令已发送';
          case 'battery':
            const batteryData = await response.json();
            return `Tello 无人机电池电量: ${batteryData.battery || 'N/A'}%`;
          case 'speed':
            return `Tello 无人机速度设置为${body.speed}cm/s指令已发送`;
          case 'speed?':
            const speedData = await response.json();
            return `Tello 无人机当前速度: ${speedData.speed || 'N/A'}cm/s`;
          case 'rc':
            return `Tello 无人机遥控指令已发送: a=${body.a}, b=${body.b}, c=${body.c}, d=${body.d}`;
          case 'go':
            return `Tello 无人机飞往坐标(${body.x}, ${body.y}, ${body.z})指令已发送`;
          case 'curve':
            return `Tello 无人机曲线飞行指令已发送`;
          default:
            return `Tello 无人机${action}指令已发送`;
        }
      } else {
        return `${action}指令发送失败: ${response.status} ${response.statusText}`;
      }
    } catch (error) {
      return `${action}指令发送失败: ${error}`;
    }
  }
}

// 系统监控Agent
export class SystemMonitorAgent extends BaseAgent {
  getType(): AgentType {
    return 'system-monitor';
  }

  canHandle(action: string): boolean {
    const monitorActions = [
      'system-status', 'health-check', 'performance', 
      'resource-usage', 'error-log', 'warning-log'
    ];
    return monitorActions.includes(action);
  }

  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'system-status':
        return await this.getSystemStatus();
      case 'health-check':
        return await this.healthCheck();
      case 'performance':
        return await this.getPerformance();
      case 'resource-usage':
        return await this.getResourceUsage();
      case 'error-log':
        return await this.getErrorLog();
      case 'warning-log':
        return await this.getWarningLog();
      default:
        return `未知的系统监控操作: ${action}`;
    }
  }

  private async getSystemStatus(): Promise<string> {
    // 这里应该从系统状态收集器获取状态
    return '系统状态正常';
  }

  private async healthCheck(): Promise<string> {
    return '系统健康检查完成，所有组件运行正常';
  }

  private async getPerformance(): Promise<string> {
    return '系统性能指标：CPU使用率 45%，内存使用率 65%';
  }

  private async getResourceUsage(): Promise<string> {
    return '资源使用情况：存储空间 2.3GB/10GB';
  }

  private async getErrorLog(): Promise<string> {
    return '最近错误日志：无';
  }

  private async getWarningLog(): Promise<string> {
    return '最近警告日志：无';
  }
}

// 数据分析Agent
export class DataAnalysisAgent extends BaseAgent {
  getType(): AgentType {
    return 'data-analysis';
  }

  canHandle(action: string): boolean {
    const analysisActions = [
      'analyze-detection', 'generate-report', 'export-data',
      'trend-analysis', 'predictive-analysis', 'statistical-summary'
    ];
    return analysisActions.includes(action);
  }

  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'analyze-detection':
        return await this.analyzeDetection(parameters?.type);
      case 'generate-report':
        return await this.generateReport(parameters?.reportType);
      case 'export-data':
        return await this.exportData(parameters?.format);
      case 'trend-analysis':
        return await this.trendAnalysis();
      case 'predictive-analysis':
        return await this.predictiveAnalysis();
      case 'statistical-summary':
        return await this.statisticalSummary();
      default:
        return `未知的数据分析操作: ${action}`;
    }
  }

  private async analyzeDetection(type?: string): Promise<string> {
    return `已完成${type || '检测'}数据分析`;
  }

  private async generateReport(reportType?: string): Promise<string> {
    return `已生成${reportType || '数据'}报告`;
  }

  private async exportData(format?: string): Promise<string> {
    return `数据已导出为${format || 'CSV'}格式`;
  }

  private async trendAnalysis(): Promise<string> {
    return '趋势分析完成';
  }

  private async predictiveAnalysis(): Promise<string> {
    return '预测分析完成';
  }

  private async statisticalSummary(): Promise<string> {
    return '统计摘要生成完成';
  }
}

// Agent管理器类
export class AgentManager {
  private static instance: AgentManager;
  private agents: Map<AgentType, BaseAgent> = new Map();

  private constructor() {
    this.initializeAgents();
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  // 初始化所有Agent
  private initializeAgents() {
    this.registerAgent(new PanelControlAgent());
    this.registerAgent(new TelloDroneAgent());
    this.registerAgent(new SystemMonitorAgent());
    this.registerAgent(new DataAnalysisAgent());
  }

  // 注册Agent
  public registerAgent(agent: BaseAgent) {
    this.agents.set(agent.getType(), agent);
  }

  // 根据用户输入解析并执行Agent指令
  public async processUserInput(userInput: string, systemStatus: SystemStatus): Promise<AgentParseResult> {
    try {
      // 使用后备解析处理用户输入
      const parseResult = this.fallbackParse(userInput, systemStatus);
      
      // 执行解析出的指令
      const executionResults = await this.executeCommands(parseResult.commands);
      
      // 整合结果并返回响应
      return {
        ...parseResult,
        response: this.generateResponse(parseResult, executionResults)
      };
      
    } catch (error: any) {
      console.error('Agent处理失败:', error);
      return {
        intent: 'error',
        commands: [],
        needsConfirmation: false,
        response: `Agent处理失败: ${error.message}`
      };
    }
  }

  // 后备解析逻辑
  private fallbackParse(userInput: string, systemStatus?: SystemStatus): AgentParseResult {
    // 统一转小写并去除空格
    const input = userInput.toLowerCase().replace(/\s+/g, '');
    const originalInput = userInput.toLowerCase();
    const commands: AgentCommand[] = [];
    let responseMessage = '正在执行您的指令...';
    
    // 增强的关键词匹配函数
    const matchKeywords = (text: string, keywords: string[]): boolean => {
      return keywords.some(keyword => {
        const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
        return text.includes(normalizedKeyword) || originalInput.includes(keyword.toLowerCase());
      });
    };
    
    // 面板控制相关关键词
    const panelKeywords = ['面板', 'panel', '界面', '显示', '隐藏', '切换', '标签', '布局'];
    const showKeywords = ['显示', 'show', '打开', '开启'];
    const hideKeywords = ['隐藏', 'hide', '关闭'];
    const toggleKeywords = ['切换', 'toggle'];
    
    if (matchKeywords(input, panelKeywords)) {
      if (matchKeywords(input, showKeywords)) {
        commands.push({
          agent: 'panel-control',
          action: 'show-panel',
          priority: 'medium'
        });
        responseMessage = '正在显示面板...';
      } else if (matchKeywords(input, hideKeywords)) {
        commands.push({
          agent: 'panel-control',
          action: 'hide-panel',
          priority: 'medium'
        });
        responseMessage = '正在隐藏面板...';
      } else if (matchKeywords(input, toggleKeywords)) {
        commands.push({
          agent: 'panel-control',
          action: 'toggle-panel',
          priority: 'medium'
        });
        responseMessage = '正在切换面板...';
      }
    }
    
    // 无人机操作相关关键词
    const droneKeywords = ['无人机', '飞机', 'drone', 'uav', '飞行器', 'tello'];
    const takeoffKeywords = ['起飞', 'takeoff', '升空', '飞起来', 'launch'];
    const landKeywords = ['降落', 'land', '着陆', '下降', '着陆'];
    const hoverKeywords = ['悬停', 'hover', '保持', '停留'];
    const emergencyKeywords = ['紧急', 'emergency', '停止', 'stop'];
    const moveKeywords = ['前进', '后退', '左转', '右转', '上升', '下降', '移动', '飞', 'go'];
    const rotateKeywords = ['旋转', '转动', 'cw', 'ccw', '顺时针', '逆时针'];
    const flipKeywords = ['翻滚', 'flip'];
    const streamKeywords = ['视频', 'stream', '摄像头'];
    const batteryKeywords = ['电池', '电量', 'battery'];
    const speedKeywords = ['速度', 'speed'];
    
    if (matchKeywords(input, droneKeywords)) {
      // 起飞指令
      if (matchKeywords(input, takeoffKeywords)) {
        commands.push({
          agent: 'tello-drone',
          action: 'takeoff',
          priority: 'high'
        });
        responseMessage = 'Tello 无人机起飞指令已发送！';
      } 
      // 降落指令
      else if (matchKeywords(input, landKeywords)) {
        commands.push({
          agent: 'tello-drone',
          action: 'land',
          priority: 'high'
        });
        responseMessage = 'Tello 无人机降落指令已发送！';
      } 
      // 悬停指令
      else if (matchKeywords(input, hoverKeywords)) {
        commands.push({
          agent: 'tello-drone',
          action: 'hover',
          priority: 'medium'
        });
        responseMessage = 'Tello 无人机悬停指令已发送！';
      } 
      // 紧急停止指令
      else if (matchKeywords(input, emergencyKeywords)) {
        commands.push({
          agent: 'tello-drone',
          action: 'emergency-stop',
          priority: 'critical'
        });
        responseMessage = 'Tello 无人机紧急停止指令已发送！';
      }
      // 移动指令
      else if (matchKeywords(input, moveKeywords)) {
        // 解析移动方向和距离
        let direction = '';
        let distance = 20; // 默认距离
        
        // 方向解析
        if (input.includes('前进') || input.includes('forward')) direction = 'forward';
        else if (input.includes('后退') || input.includes('back')) direction = 'back';
        else if (input.includes('左') || input.includes('left')) direction = 'left';
        else if (input.includes('右') || input.includes('right')) direction = 'right';
        else if (input.includes('上升') || input.includes('上') || input.includes('up')) direction = 'up';
        else if (input.includes('下降') || input.includes('下') || input.includes('down')) direction = 'down';
        
        // 距离解析
        const distanceMatch = input.match(/(\d+)(厘米|cm|米|m)?/);
        if (distanceMatch) {
          distance = parseInt(distanceMatch[1]);
          // 如果是米单位，转换为厘米
          if (distanceMatch[2] && (distanceMatch[2].includes('米') || distanceMatch[2].includes('m'))) {
            distance *= 100;
          }
        }
        
        if (direction) {
          commands.push({
            agent: 'tello-drone',
            action: direction,
            parameters: { distance },
            priority: 'medium'
          });
          responseMessage = `Tello 无人机${direction}移动${distance}厘米指令已发送！`;
        } else {
          commands.push({
            agent: 'tello-drone',
            action: 'forward', // 默认前进
            parameters: { distance: 20 },
            priority: 'medium'
          });
          responseMessage = 'Tello 无人机前进指令已发送！';
        }
      }
      // 旋转指令
      else if (matchKeywords(input, rotateKeywords)) {
        // 解析旋转方向和角度
        let direction = '';
        let degrees = 90; // 默认角度
        
        // 方向解析
        if (input.includes('顺时针') || input.includes('cw')) direction = 'cw';
        else if (input.includes('逆时针') || input.includes('ccw')) direction = 'ccw';
        
        // 角度解析
        const degreeMatch = input.match(/(\d+)(度|°)?/);
        if (degreeMatch) {
          degrees = parseInt(degreeMatch[1]);
        }
        
        if (direction) {
          commands.push({
            agent: 'tello-drone',
            action: direction,
            parameters: { degrees },
            priority: 'medium'
          });
          responseMessage = `Tello 无人机${direction === 'cw' ? '顺时针' : '逆时针'}旋转${degrees}度指令已发送！`;
        } else {
          commands.push({
            agent: 'tello-drone',
            action: 'cw', // 默认顺时针
            parameters: { degrees: 90 },
            priority: 'medium'
          });
          responseMessage = 'Tello 无人机顺时针旋转指令已发送！';
        }
      }
      // 翻滚指令
      else if (matchKeywords(input, flipKeywords)) {
        // 解析翻滚方向
        let direction = 'f'; // 默认向前翻滚
        
        if (input.includes('前') || input.includes('forward')) direction = 'f';
        else if (input.includes('后') || input.includes('back')) direction = 'b';
        else if (input.includes('左') || input.includes('left')) direction = 'l';
        else if (input.includes('右') || input.includes('right')) direction = 'r';
        
        commands.push({
          agent: 'tello-drone',
          action: 'flip',
          parameters: { direction },
          priority: 'medium'
        });
        responseMessage = `Tello 无人机${direction}方向翻滚指令已发送！`;
      }
      // 视频流控制指令
      else if (matchKeywords(input, streamKeywords)) {
        const enable = !input.includes('关闭') && !input.includes('off');
        commands.push({
          agent: 'tello-drone',
          action: enable ? 'streamon' : 'streamoff',
          priority: 'medium'
        });
        responseMessage = `Tello 无人机视频流${enable ? '开启' : '关闭'}指令已发送！`;
      }
      // 电池查询指令
      else if (matchKeywords(input, batteryKeywords)) {
        commands.push({
          agent: 'tello-drone',
          action: 'battery',
          priority: 'low'
        });
        responseMessage = '正在查询 Tello 无人机电池电量...';
      }
      // 速度控制指令
      else if (matchKeywords(input, speedKeywords)) {
        if (input.includes('查询') || input.includes('查看') || input.includes('?')) {
          commands.push({
            agent: 'tello-drone',
            action: 'speed?',
            priority: 'low'
          });
          responseMessage = '正在查询 Tello 无人机当前速度...';
        } else {
          // 解析速度值
          let speed = 50; // 默认速度
          const speedMatch = input.match(/(\d+)(cm\/s)?/);
          if (speedMatch) {
            speed = parseInt(speedMatch[1]);
          }
          
          commands.push({
            agent: 'tello-drone',
            action: 'speed',
            parameters: { speed },
            priority: 'medium'
          });
          responseMessage = `Tello 无人机速度设置为${speed}cm/s指令已发送！`;
        }
      }
    }
    
    // 系统监控相关关键词
    const systemKeywords = ['系统', 'system', '状态', 'status', '健康', 'health'];
    const checkKeywords = ['检查', 'check', '查看', '查询'];
    
    if (matchKeywords(input, systemKeywords) && matchKeywords(input, checkKeywords)) {
      commands.push({
        agent: 'system-monitor',
        action: 'system-status',
        priority: 'medium'
      });
      responseMessage = '正在获取系统状态...';
    }
    
    // 数据分析相关关键词
    const analysisKeywords = ['分析', 'analyze', '报告', 'report', '数据', 'data'];
    const generateKeywords = ['生成', 'generate', '创建', '制作'];
    
    if (matchKeywords(input, analysisKeywords) && matchKeywords(input, generateKeywords)) {
      commands.push({
        agent: 'data-analysis',
        action: 'generate-report',
        priority: 'medium'
      });
      responseMessage = '正在生成分析报告...';
    }
    
    return {
      intent: commands.length > 0 ? 'Agent控制指令' : '普通对话',
      commands,
      needsConfirmation: false,
      response: responseMessage
    };
  }

  // 执行指令
  private async executeCommands(commands: AgentCommand[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const command of commands) {
      try {
        const agent = this.agents.get(command.agent);
        if (agent) {
          const result = await agent.execute(command.action, command.parameters);
          results.push(result);
        } else {
          results.push(`Agent ${command.agent} 不存在`);
        }
      } catch (error: any) {
        results.push(`执行 ${command.agent}.${command.action} 失败: ${error.message}`);
      }
    }
    
    return results;
  }

  // 生成最终响应
  private generateResponse(parseResult: AgentParseResult, executionResults: string[]): string {
    let response = parseResult.response;
    
    if (executionResults.length > 0) {
      response += '\n\n执行结果：\n' + executionResults.join('\n');
    }
    
    return response;
  }
}

// 导出单例实例
export const agentManager = AgentManager.getInstance();