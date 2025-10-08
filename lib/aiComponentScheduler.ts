// AI组件调度器 - 智能解析用户意图并调度相应组件
import { systemStatusCollector, SystemStatus } from './systemStatusCollector';
import { DroneState } from '../contexts/DroneContext';
import { agentManager, AgentParseResult } from './agentManager';

// 组件调度指令接口
interface ComponentCommand {
  component: string;
  action: string;
  parameters?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// AI解析结果接口
interface AIParseResult {
  intent: string;
  commands: ComponentCommand[];
  needsConfirmation: boolean;
  response: string;
}

// 组件调度器类
export class AIComponentScheduler {
  private static instance: AIComponentScheduler;
  private registeredComponents: Map<string, ComponentHandler> = new Map();

  private constructor() {
    this.initializeComponents();
  }

  public static getInstance(): AIComponentScheduler {
    if (!AIComponentScheduler.instance) {
      AIComponentScheduler.instance = new AIComponentScheduler();
    }
    return AIComponentScheduler.instance;
  }

  // 初始化组件处理器
  private initializeComponents() {
    // 注册无人机控制组件
    this.registerComponent('drone', new DroneComponentHandler());
    
    // 注册YOLO检测组件
    this.registerComponent('yolo', new YOLOComponentHandler());
    
    // 注册视频流组件
    this.registerComponent('video', new VideoComponentHandler());
    
    // 注册截图组件
    this.registerComponent('screenshot', new ScreenshotComponentHandler());
    
    // 注册系统状态组件
    this.registerComponent('system', new SystemComponentHandler());
  }

  // 注册组件处理器
  public registerComponent(name: string, handler: ComponentHandler) {
    this.registeredComponents.set(name, handler);
  }

  // 主要的AI调度函数 - 现在集成Agent管理器
  public async scheduleWithAI(userInput: string, systemStatus: SystemStatus): Promise<AIParseResult> {
    try {
      // 首先尝试使用Agent管理器处理
      const agentResult: AgentParseResult = await agentManager.processUserInput(userInput, systemStatus);
      
      // 如果Agent管理器处理了指令，直接返回结果
      if (agentResult.commands.length > 0) {
        // 将Agent命令转换为组件命令格式
        const componentCommands: ComponentCommand[] = agentResult.commands.map(agentCmd => ({
          component: agentCmd.agent,
          action: agentCmd.action,
          parameters: agentCmd.parameters,
          priority: agentCmd.priority
        }));
        
        return {
          intent: agentResult.intent,
          commands: componentCommands,
          needsConfirmation: agentResult.needsConfirmation,
          response: agentResult.response
        };
      }
      
      // 如果Agent管理器没有处理，使用原有的组件调度逻辑
      // 使用AI解析用户意图
      const parseResult = await this.parseUserIntent(userInput, systemStatus);
      
      // 执行解析出的指令
      const executionResults = await this.executeCommands(parseResult.commands);
      
      // 整合结果并返回响应
      return {
        ...parseResult,
        response: this.generateResponse(parseResult, executionResults)
      };
      
    } catch (error: any) {
      console.error('AI组件调度失败:', error);
      return {
        intent: 'error',
        commands: [],
        needsConfirmation: false,
        response: `调度失败: ${error.message}`
      };
    }
  }

  // 使用AI解析用户意图 - 增强调试日志
  private async parseUserIntent(userInput: string, systemStatus: SystemStatus): Promise<AIParseResult> {
    console.log('🔍 开始解析用户意图:', userInput);
    
    // 优先使用后备解析，确保系统稳定性
    const fallbackResult = this.fallbackParse(userInput, systemStatus);
    console.log('🔧 后备解析结果:', {
      commands: fallbackResult.commands.length,
      intent: fallbackResult.intent
    });
    
    if (fallbackResult.commands.length > 0) {
      console.log('✅ 使用后备解析结果');
      return fallbackResult;
    }
    
    // 如果后备解析没有匹配到指令，尝试AI解析
    try {
      console.log('🤖 尝试AI解析...');
      const prompt = this.buildIntentParsePrompt(userInput, systemStatus);
      
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.QWEN_MODEL || 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的无人机农业系统AI调度员，能够理解用户指令并生成相应的组件调度命令。重要：请始终使用中文回复，不要使用英文或其他语言。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          config: {
            baseUrl: process.env.QWEN_BASE_URL || 'http://localhost:11434/v1',
            model: process.env.QWEN_MODEL || 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated'
          }
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ AI解析请求失败: ${response.status}, 使用后备解析`);
        return fallbackResult;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }
      
      console.log('✨ AI解析成功');
      return this.parseAIResponse(result.trim());
    } catch (error) {
      console.warn('⚠️ AI解析失败，使用后备解析:', error);
      return fallbackResult;
    }
  }

  // 构建意图解析提示词
  private buildIntentParsePrompt(userInput: string, systemStatus: SystemStatus): string {
    const statusDescription = systemStatusCollector.generateStatusDescription(systemStatus);
    
    return `分析用户指令并生成组件调度命令。

当前系统状态：
${statusDescription}

用户指令："${userInput}"

可用组件和操作：
1. drone (无人机控制)
   - status: 查询状态
   - takeoff: 起飞
   - land: 降落
   - hover: 悬停
   - move: 移动 (参数: direction, distance)
   - connect: 连接
   - disconnect: 断开连接

2. yolo (检测系统)
   - start: 开始检测 (参数: type=['strawberry','qr','general'])
   - stop: 停止检测
   - switch: 切换检测类型 (参数: type)
   - status: 检测状态

3. video (视频流)
   - start: 开始播放
   - stop: 停止播放
   - status: 视频状态

4. screenshot (截图功能)
   - capture: 截图 (参数: withDetection=true/false, save=true/false)
   - save: 保存截图

5. system (系统状态)
   - status: 系统状态
   - health: 健康检查

请按以下JSON格式回复：
{
  "intent": "用户意图描述",
  "commands": [
    {
      "component": "组件名",
      "action": "操作名",
      "parameters": {"参数": "值"},
      "priority": "low/medium/high/critical"
    }
  ],
  "needsConfirmation": true/false,
  "response": "对用户的回复"
}

示例：
用户："检查无人机状态" 
回复：{"intent":"查询无人机状态","commands":[{"component":"drone","action":"status","priority":"medium"}],"needsConfirmation":false,"response":"正在查询无人机状态..."}

用户："开始草莓检测并截图保存"
回复：{"intent":"启动草莓检测并截图","commands":[{"component":"yolo","action":"start","parameters":{"type":"strawberry"},"priority":"medium"},{"component":"screenshot","action":"capture","parameters":{"withDetection":true,"save":true},"priority":"medium"}],"needsConfirmation":false,"response":"已启动草莓检测，正在截图保存..."}`;
  }

  // 解析AI响应
  private parseAIResponse(aiResponse: string): AIParseResult {
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || '未知意图',
          commands: parsed.commands || [],
          needsConfirmation: parsed.needsConfirmation || false,
          response: parsed.response || '正在处理您的请求...'
        };
      }
      
      // 如果没有找到JSON，使用后备解析
      return this.fallbackParse(aiResponse);
      
    } catch (error) {
      console.error('解析AI响应失败:', error);
      return this.fallbackParse(aiResponse);
    }
  }

  // 后备解析逻辑
  private fallbackParse(userInput: string, systemStatus?: SystemStatus): AIParseResult {
    // 增强语言理解：统一转小写并去除空格，支持中英文
    const input = userInput.toLowerCase().replace(/\s+/g, '');
    const originalInput = userInput.toLowerCase(); // 保留原始输入用于空格分词匹配
    const commands: ComponentCommand[] = [];
    let responseMessage = '正在执行您的指令...';
    
    // 增强的关键词匹配函数
    const matchKeywords = (text: string, keywords: string[]): boolean => {
      return keywords.some(keyword => {
        const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
        return text.includes(normalizedKeyword) || originalInput.includes(keyword.toLowerCase());
      });
    };
    
    // 无人机控制相关 - 增强关键词
    const droneKeywords = ['无人机', '飞机', 'drone', 'uav', '飞行器', '航拍器'];
    const statusKeywords = ['状态', 'status', '情况', '信息', '怎么样', '如何', '现在'];
    
    if (matchKeywords(input, droneKeywords) && matchKeywords(input, statusKeywords)) {
      commands.push({
        component: 'drone',
        action: 'status',
        priority: 'medium'
      });
      responseMessage = '正在查询无人机状态...';
    }
    
    // 起飞指令 - 增强关键词
    const takeoffKeywords = ['起飞', 'takeoff', 'take off', '上升', '升空', '飞起来', '起来', '启动飞行'];
    if (matchKeywords(input, takeoffKeywords)) {
      commands.push({
        component: 'drone',
        action: 'takeoff',
        priority: 'high'
      });
      responseMessage = '无人机起飞指令已发送！';
    }
    
    // 降落指令 - 增强关键词
    const landKeywords = ['降落', 'land', 'landing', '着陆', '下降', '落地', '降下来', '停止飞行'];
    if (matchKeywords(input, landKeywords)) {
      commands.push({
        component: 'drone',
        action: 'land',
        priority: 'high'
      });
      responseMessage = '无人机降落指令已发送！';
    }
    
    // 悬停指令 - 增强关键词
    const hoverKeywords = ['悬停', 'hover', 'hovering', '保持', '停留', '定点', '悬浮', '不动'];
    if (matchKeywords(input, hoverKeywords)) {
      commands.push({
        component: 'drone',
        action: 'hover',
        priority: 'medium'
      });
      responseMessage = '无人机悬停指令已发送！';
    }
    
    // 检测系统相关 - 增强关键词
    const detectionKeywords = ['检测', 'detect', 'detection', '识别', '扫描', '分析', '找', '寻找'];
    const strawberryKeywords = ['草莓', 'strawberry', '莓果', '红莓'];
    const qrKeywords = ['qr', 'qr码', '二维码', '条码', 'barcode', 'code'];
    
    if (matchKeywords(input, detectionKeywords) && matchKeywords(input, strawberryKeywords)) {
      commands.push({
        component: 'yolo',
        action: 'start',
        parameters: { type: 'strawberry' },
        priority: 'medium'
      });
      responseMessage = '已启动草莓检测系统！';
    }
    
    if (matchKeywords(input, detectionKeywords) && matchKeywords(input, qrKeywords)) {
      commands.push({
        component: 'yolo',
        action: 'start',
        parameters: { type: 'qr' },
        priority: 'medium'
      });
      responseMessage = '已启动QR码检测系统！';
    }
    
    // 停止检测 - 增强关键词
    const stopKeywords = ['停止', 'stop', '关闭', '结束', '暂停', '停下', '停掉', '中止'];
    if (matchKeywords(input, stopKeywords) && matchKeywords(input, detectionKeywords)) {
      commands.push({
        component: 'yolo',
        action: 'stop',
        priority: 'medium'
      });
      responseMessage = '已停止检测系统！';
    }
    
    // 截图相关 - 增强关键词
    const screenshotKeywords = ['截图', 'screenshot', '拍照', '截屏', '拍摄', '捕获', '抓拍', '保存图片'];
    const detectionBoxKeywords = ['检测框', 'detection box', '绘制', '画框', '标记', '框选'];
    const saveKeywords = ['保存', 'save', '存储', '储存', '保留'];
    
    if (matchKeywords(input, screenshotKeywords)) {
      const withDetection = matchKeywords(input, detectionBoxKeywords) || matchKeywords(input, ['绘制', '框']);
      const save = matchKeywords(input, saveKeywords);
      
      commands.push({
        component: 'screenshot',
        action: 'capture',
        parameters: { withDetection, save },
        priority: 'medium'
      });
      responseMessage = `正在截图${withDetection ? '（包含检测框）' : ''}${save ? '并保存' : ''}`;
    }
    
    // 视频流相关 - 增强关键词
    const videoKeywords = ['视频', 'video', '视频流', '画面', '直播', '监控'];
    const startKeywords = ['开启', '启动', 'start', '开始', '打开', '播放'];
    
    if (matchKeywords(input, videoKeywords) && matchKeywords(input, startKeywords)) {
      commands.push({
        component: 'video',
        action: 'start',
        priority: 'medium'
      });
      responseMessage = '已启动视频流！';
    }
    
    if (matchKeywords(input, videoKeywords) && matchKeywords(input, stopKeywords)) {
      commands.push({
        component: 'video',
        action: 'stop',
        priority: 'medium'
      });
      responseMessage = '已停止视频流！';
    }
    
    // 系统状态相关 - 增强关键词
    const systemKeywords = ['系统', 'system', '整体', '全部'];
    if (matchKeywords(input, systemKeywords) && matchKeywords(input, statusKeywords)) {
      commands.push({
        component: 'system',
        action: 'status',
        priority: 'medium'
      });
      responseMessage = '正在获取系统状态...';
    }
    
    // 复合指令处理 - 增强语义理解
    const isStrawberryDetectionWithScreenshot = (
      matchKeywords(input, strawberryKeywords) && 
      matchKeywords(input, detectionKeywords) && 
      matchKeywords(input, screenshotKeywords)
    );
    
    if (isStrawberryDetectionWithScreenshot) {
      commands.length = 0; // 清空之前的单个指令
      commands.push(
        {
          component: 'yolo',
          action: 'start',
          parameters: { type: 'strawberry' },
          priority: 'medium'
        },
        {
          component: 'screenshot',
          action: 'capture',
          parameters: { withDetection: true, save: true },
          priority: 'medium'
        }
      );
      responseMessage = '已启动草莓检测，正在截图保存...';
    }
    
    // 智能连接指令 - 新增
    const connectKeywords = ['连接', 'connect', '接入', '连上', '链接'];
    if (matchKeywords(input, droneKeywords) && matchKeywords(input, connectKeywords)) {
      commands.push({
        component: 'drone',
        action: 'connect',
        priority: 'high'
      });
      responseMessage = '正在连接无人机...';
    }
    
    // 智能断开指令 - 新增
    const disconnectKeywords = ['断开', 'disconnect', '断连', '分离', '关闭连接'];
    if (matchKeywords(input, droneKeywords) && matchKeywords(input, disconnectKeywords)) {
      commands.push({
        component: 'drone',
        action: 'disconnect',
        priority: 'high'
      });
      responseMessage = '正在断开无人机连接...';
    }
    
    // 如果没有匹配到任何指令，但包含组件相关关键词，提供帮助信息
    const allComponentKeywords = [...droneKeywords, ...detectionKeywords, ...screenshotKeywords, ...videoKeywords, ...systemKeywords];
    if (commands.length === 0 && matchKeywords(input, allComponentKeywords)) {
      responseMessage = '抱歉，我没有理解您的指令。您可以尝试说：\n- "无人机状态" - 查询无人机状态\n- "起飞" - 无人机起飞\n- "降落" - 无人机降落\n- "开始草莓检测" - 启动草莓检测\n- "截图并保存" - 截图保存';
    }
    
    return {
      intent: commands.length > 0 ? '组件控制指令' : '普通对话',
      commands,
      needsConfirmation: false,
      response: responseMessage
    };
  }

  // 执行指令
  private async executeCommands(commands: ComponentCommand[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const command of commands) {
      try {
        const handler = this.registeredComponents.get(command.component);
        if (handler) {
          const result = await handler.execute(command.action, command.parameters);
          results.push(result);
        } else {
          results.push(`组件 ${command.component} 不存在`);
        }
      } catch (error: any) {
        results.push(`执行 ${command.component}.${command.action} 失败: ${error.message}`);
      }
    }
    
    return results;
  }

  // 生成最终响应
  private generateResponse(parseResult: AIParseResult, executionResults: string[]): string {
    let response = parseResult.response;
    
    if (executionResults.length > 0) {
      response += '\n\n执行结果：\n' + executionResults.join('\n');
    }
    
    return response;
  }
}

// 组件处理器基类
abstract class ComponentHandler {
  abstract execute(action: string, parameters?: Record<string, any>): Promise<string>;
}

// 无人机组件处理器
class DroneComponentHandler extends ComponentHandler {
  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'status':
        return await this.getDroneStatus();
      case 'takeoff':
        return await this.takeoff();
      case 'land':
        return await this.land();
      case 'hover':
        return await this.hover();
      case 'move':
        return await this.move(parameters?.direction, parameters?.distance);
      case 'connect':
        return await this.connect();
      case 'disconnect':
        return await this.disconnect();
      default:
        return `未知的无人机操作: ${action}`;
    }
  }

  private async getDroneStatus(): Promise<string> {
    // 获取真实无人机状态
    const response = await fetch('/api/drone/status');
    if (response.ok) {
      const status = await response.json();
      return `无人机状态：
连接状态: ${status.connected ? '已连接' : '未连接'}
电池电量: ${status.battery || 'N/A'}%
飞行状态: ${status.flying ? '飞行中' : '地面'}
GPS信号: ${status.gps || 'N/A'}
高度: ${status.altitude || 'N/A'}m
速度: ${status.speed || 'N/A'}m/s`;
    }
    return '无法获取无人机状态';
  }

  private async takeoff(): Promise<string> {
    const response = await fetch('/api/drone/takeoff', { method: 'POST' });
    return response.ok ? '无人机起飞指令已发送' : '起飞指令发送失败';
  }

  private async land(): Promise<string> {
    const response = await fetch('/api/drone/land', { method: 'POST' });
    return response.ok ? '无人机降落指令已发送' : '降落指令发送失败';
  }

  private async hover(): Promise<string> {
    const response = await fetch('/api/drone/hover', { method: 'POST' });
    return response.ok ? '无人机悬停指令已发送' : '悬停指令发送失败';
  }

  private async move(direction: string, distance: number): Promise<string> {
    const response = await fetch('/api/drone/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction, distance })
    });
    return response.ok ? `无人机${direction}移动${distance}米指令已发送` : '移动指令发送失败';
  }

  private async connect(): Promise<string> {
    try {
      const response = await fetch('/api/drone/connect', { method: 'POST' });
      
      if (response.ok) {
        const result = await response.json();
        
        // 根据返回的详细信息提供更准确的反馈
        if (result.method === 'websocket') {
          return `✅ ${result.message}

🔗 **连接方式**: WebSocket直连
📡 **状态**: ${result.status === 'connected' ? '已连接' : '连接中'}
⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        } else if (result.method === 'api_fallback') {
          return `⚠️ ${result.message}

💡 **提示**: ${result.note}
📡 **状态**: 指令已发送，等待响应
⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        } else {
          return `📡 ${result.message || '无人机连接指令已发送'}

⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        return `❌ 连接指令发送失败

🔍 **错误**: ${errorResult.error || '未知错误'}
💡 **建议**: ${errorResult.suggestion || '请检查网络连接和后端服务'}`;
      }
    } catch (error: any) {
      return `❌ 连接请求失败: ${error.message}

💡 **建议**: 请检查网络连接和API服务是否正常`;
    }
  }

  private async disconnect(): Promise<string> {
    try {
      const response = await fetch('/api/drone/disconnect', { method: 'POST' });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.method === 'websocket') {
          return `✅ ${result.message}

🔗 **断开方式**: WebSocket直连
📡 **状态**: 已断开连接
⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        } else if (result.method === 'api_fallback') {
          return `⚠️ ${result.message}

💡 **提示**: ${result.note}
📡 **状态**: 断开指令已发送
⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        } else {
          return `📡 ${result.message || '无人机断开连接指令已发送'}

⏰ **时间**: ${new Date(result.timestamp).toLocaleTimeString()}`;
        }
      } else {
        const errorResult = await response.json().catch(() => ({}));
        return `❌ 断开连接指令发送失败

🔍 **错误**: ${errorResult.error || '未知错误'}
💡 **建议**: ${errorResult.suggestion || '请检查网络连接和后端服务'}`;
      }
    } catch (error: any) {
      return `❌ 断开连接请求失败: ${error.message}

💡 **建议**: 请检查网络连接和API服务是否正常`;
    }
  }
}

// YOLO检测组件处理器
class YOLOComponentHandler extends ComponentHandler {
  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'start':
        return await this.startDetection(parameters?.type || 'general');
      case 'stop':
        return await this.stopDetection();
      case 'switch':
        return await this.switchDetectionType(parameters?.type);
      case 'status':
        return await this.getDetectionStatus();
      default:
        return `未知的检测操作: ${action}`;
    }
  }

  private async startDetection(type: string): Promise<string> {
    const response = await fetch('/api/detection/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    return response.ok ? `已启动${type}检测` : '启动检测失败';
  }

  private async stopDetection(): Promise<string> {
    const response = await fetch('/api/detection/stop', { method: 'POST' });
    return response.ok ? '已停止检测' : '停止检测失败';
  }

  private async switchDetectionType(type: string): Promise<string> {
    const response = await fetch('/api/detection/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ detection_type: type })
    });
    return response.ok ? `已切换到${type}检测模式` : '切换检测类型失败';
  }

  private async getDetectionStatus(): Promise<string> {
    const response = await fetch('/api/detection/status');
    if (response.ok) {
      const status = await response.json();
      return `检测状态：
当前类型: ${status.type}
运行状态: ${status.active ? '运行中' : '停止'}
检测次数: ${status.count || 0}`;
    }
    return '无法获取检测状态';
  }
}

// 视频流组件处理器
class VideoComponentHandler extends ComponentHandler {
  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'start':
        return await this.startVideo();
      case 'stop':
        return await this.stopVideo();
      case 'status':
        return await this.getVideoStatus();
      default:
        return `未知的视频操作: ${action}`;
    }
  }

  private async startVideo(): Promise<string> {
    const response = await fetch('/api/video/start', { method: 'POST' });
    return response.ok ? '视频流已启动' : '启动视频流失败';
  }

  private async stopVideo(): Promise<string> {
    const response = await fetch('/api/video/stop', { method: 'POST' });
    return response.ok ? '视频流已停止' : '停止视频流失败';
  }

  private async getVideoStatus(): Promise<string> {
    const response = await fetch('/api/video/status');
    if (response.ok) {
      const status = await response.json();
      return `视频流状态：
播放状态: ${status.playing ? '播放中' : '停止'}
分辨率: ${status.resolution || 'N/A'}
帧率: ${status.fps || 'N/A'}fps`;
    }
    return '无法获取视频状态';
  }
}

// 截图组件处理器
class ScreenshotComponentHandler extends ComponentHandler {
  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'capture':
        return await this.captureScreenshot(parameters?.withDetection, parameters?.save);
      case 'save':
        return await this.saveScreenshot();
      default:
        return `未知的截图操作: ${action}`;
    }
  }

  private async captureScreenshot(withDetection: boolean = true, save: boolean = true): Promise<string> {
    const response = await fetch('/api/screenshot/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ withDetection, save })
    });
    
    if (response.ok) {
      const result = await response.json();
      return `截图成功${withDetection ? '（包含检测框）' : ''}${save ? '，已保存到文件' : ''}`;
    }
    return '截图失败';
  }

  private async saveScreenshot(): Promise<string> {
    const response = await fetch('/api/screenshot/save', { method: 'POST' });
    return response.ok ? '截图已保存' : '保存截图失败';
  }
}

// 系统状态组件处理器
class SystemComponentHandler extends ComponentHandler {
  async execute(action: string, parameters?: Record<string, any>): Promise<string> {
    switch (action) {
      case 'status':
        return await this.getSystemStatus();
      case 'health':
        return await this.getSystemHealth();
      default:
        return `未知的系统操作: ${action}`;
    }
  }

  private async getSystemStatus(): Promise<string> {
    const systemStatus = systemStatusCollector.collectSystemStatus({
      isConnected: true,
      connectionStatus: 'connected',
      missionStatus: 'standby',
      cruiseStatus: 'standby',
      aiStatus: 'online',
      aiApiConfigured: true
    } as any);
    
    return systemStatusCollector.generateStatusDescription(systemStatus);
  }

  private async getSystemHealth(): Promise<string> {
    const response = await fetch('/api/system/health');
    if (response.ok) {
      const health = await response.json();
      return `系统健康状态：
CPU使用率: ${health.cpu || 'N/A'}%
内存使用率: ${health.memory || 'N/A'}%
存储空间: ${health.storage || 'N/A'}%
网络状态: ${health.network || 'N/A'}`;
    }
    return '无法获取系统健康状态';
  }
}

// 导出单例实例
export const aiComponentScheduler = AIComponentScheduler.getInstance();