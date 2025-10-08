// 工作流执行引擎
export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    nodeType: string;
    parameters: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface ExecutionContext {
  variables: Record<string, any>;
  results: Record<string, any>;
  logs: string[];
  currentNode?: string;
  isRunning: boolean;
  shouldStop: boolean;
}

export class WorkflowEngine {
  private context: ExecutionContext;
  private nodes: WorkflowNode[];
  private edges: WorkflowEdge[];
  private onLog?: (message: string) => void;
  private onStateChange?: (context: ExecutionContext) => void;
  private commandSender?: (type: string, data?: any) => Promise<any> | any;

  constructor(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[],
    onLog?: (message: string) => void,
    onStateChange?: (context: ExecutionContext) => void,
    commandSender?: (type: string, data?: any) => Promise<any> | any
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.onLog = onLog;
    this.onStateChange = onStateChange;
    this.commandSender = commandSender;
    this.context = {
      variables: {
        battery: 85,
        altitude: 0,
        speed: 0,
        temperature: 25,
        timestamp: Date.now()
      },
      results: {},
      logs: [],
      isRunning: false,
      shouldStop: false
    };
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.context.logs.push(logMessage);
    this.onLog?.(logMessage);
  }

  private updateState() {
    this.onStateChange?.(this.context);
  }

  private async sendCommand(type: string, data?: any): Promise<boolean> {
    try {
      let sender = this.commandSender as any;
      if (!sender && typeof globalThis !== 'undefined' && (globalThis as any).__droneSendMessage) {
        sender = (globalThis as any).__droneSendMessage;
      }
      if (!sender) {
        this.log(`未配置后端命令发送器: ${type}`);
        return false;
      }
      const res = await sender(type, data);
      return res !== false;
    } catch (e: any) {
      this.log(`发送命令失败: ${type} - ${e?.message || e}`);
      return false;
    }
  }

  async execute(): Promise<void> {
    this.context.isRunning = true;
    this.context.shouldStop = false;
    this.log('开始执行工作流');
    this.updateState();

    try {
      // 找到起始节点 - 修复：检查 data.nodeType 而不是 type
      const startNode = this.nodes.find(node => 
        node.type === 'start' || node.data?.nodeType === 'start'
      );
      if (!startNode) {
        throw new Error('未找到起始节点');
      }

      await this.executeNode(startNode);
    } catch (error) {
      this.log(`工作流执行错误: ${error}`);
    } finally {
      this.context.isRunning = false;
      this.log('工作流执行完成');
      this.updateState();
    }
  }

  stop() {
    this.context.shouldStop = true;
    this.log('收到停止信号');
    this.updateState();
  }

  private async executeNode(node: WorkflowNode): Promise<void> {
    if (this.context.shouldStop) {
      this.log('工作流已停止');
      return;
    }

    this.context.currentNode = node.id;
    const nodeType = node.data?.nodeType || node.type;
    this.log(`执行节点: ${node.data.label} (${nodeType})`);
    this.updateState();

    try {
      const result = await this.executeNodeLogic(node);
      this.context.results[node.id] = result;

      // 根据节点类型和结果决定下一步
      const nextNodes = await this.getNextNodes(node, result);
      
      for (const nextNode of nextNodes) {
        await this.executeNode(nextNode);
      }
    } catch (error) {
      this.log(`节点执行失败: ${node.data.label} - ${error}`);
      throw error;
    }
  }

  private async executeNodeLogic(node: WorkflowNode): Promise<any> {
    const { type, data } = node;
    const params = data.parameters || {};
    
    // 修复：优先使用 data.nodeType，如果不存在则使用 type
    const nodeType = data.nodeType || type;

    switch (nodeType) {
      case 'start':
        return { status: 'started', timestamp: Date.now() };

      case 'end':
        this.log('到达结束节点');
        return { status: 'completed', timestamp: Date.now() };

      // 逻辑判断节点
      case 'condition_branch':
        return this.executeConditionBranch(params);

      case 'if_else':
        return this.executeIfElse(params);

      case 'loop':
        return this.executeLoop(params);

      // 图像处理节点
      case 'take_photo':
        return this.executeTakePhoto(params);

      case 'record_video':
        return this.executeRecordVideo(params);

      case 'image_analysis':
        return this.executeImageAnalysis(params);

      // AI分析节点
      case 'ai_classification':
        return this.executeAIClassification(params);

      case 'ai_detection':
        return this.executeAIDetection(params);

      case 'ai_segmentation':
        return this.executeAISegmentation(params);

      // 数据处理节点
      case 'data_storage':
        return this.executeDataStorage(params);

      case 'data_transform':
        return this.executeDataTransform(params);

      case 'data_filter':
        return this.executeDataFilter(params);

      // 网络通信节点
      case 'http_request':
        return this.executeHttpRequest(params);

      case 'websocket_send':
        return this.executeWebSocketSend(params);

      case 'api_call':
        return this.executeApiCall(params);

      // 基础控制节点
      case 'takeoff':
        return this.executeTakeoffWithBackend(params);

      case 'land':
        return this.executeLandWithBackend(params);

      case 'hover':
        return this.executeHoverWithBackend(params);

      case 'wait':
        return this.executeWait(params);

      // 运动控制
      case 'move_forward':
        return this.executeMove('forward', params);
      case 'move_backward':
        return this.executeMove('back', params);
      case 'move_left':
        return this.executeMove('left', params);
      case 'move_right':
        return this.executeMove('right', params);
      case 'move_up':
        return this.executeMove('up', params);
      case 'move_down':
        return this.executeMove('down', params);

      // 旋转与特技
      case 'rotate_cw':
        return this.executeRotate('cw', params);
      case 'rotate_ccw':
        return this.executeRotate('ccw', params);
      case 'flip_forward':
        return this.executeFlip('f');
      case 'flip_backward':
        return this.executeFlip('b');
      case 'flip_left':
        return this.executeFlip('l');
      case 'flip_right':
        return this.executeFlip('r');

      // 检测与视频
      case 'start_video':
        return this.executeStartVideo();
      case 'stop_video':
        return this.executeStopVideo();
      case 'qr_scan':
        return this.executeQRScan(params);
      case 'strawberry_detection':
        return this.executeStrawberryDetection(params);

      default:
        this.log(`未知节点类型: ${nodeType}`);
        return { status: 'skipped', reason: 'unknown_type' };
    }
  }

  // 条件分支执行
  private executeConditionBranch(params: any): any {
    const { variable, operator, value } = params;
    const currentValue = this.context.variables[variable];
    
    let conditionMet = false;
    switch (operator) {
      case '>':
        conditionMet = currentValue > value;
        break;
      case '<':
        conditionMet = currentValue < value;
        break;
      case '>=':
        conditionMet = currentValue >= value;
        break;
      case '<=':
        conditionMet = currentValue <= value;
        break;
      case '==':
        conditionMet = currentValue == value;
        break;
      case '!=':
        conditionMet = currentValue != value;
        break;
    }

    this.log(`条件判断: ${variable}(${currentValue}) ${operator} ${value} = ${conditionMet}`);
    
    return {
      condition: conditionMet,
      variable,
      currentValue,
      operator,
      value,
      action: conditionMet ? params.trueAction : params.falseAction
    };
  }

  // 图像采集
  private async executeTakePhoto(params: any): Promise<any> {
    this.log(`拍照 - 分辨率: ${params.resolution}, 格式: ${params.format}`);
    
    // 模拟拍照过程
    await this.delay(1000);
    
    const filename = params.filename.replace('{timestamp}', Date.now().toString());
    const result = {
      status: 'success',
      filename,
      resolution: params.resolution,
      format: params.format,
      size: Math.floor(Math.random() * 5000000) + 1000000, // 模拟文件大小
      timestamp: Date.now()
    };

    this.log(`拍照完成: ${filename}`);
    return result;
  }

  // AI检测
  private async executeAIDetection(params: any): Promise<any> {
    this.log(`AI检测 - 模型: ${params.model}, 置信度: ${params.confidence}`);
    
    // 模拟AI检测过程
    await this.delay(2000);
    
    // 模拟检测结果
    const detections = [];
    const numDetections = Math.floor(Math.random() * params.maxDetections);
    
    for (let i = 0; i < numDetections; i++) {
      detections.push({
        class: `object_${i}`,
        confidence: Math.random() * (1 - params.confidence) + params.confidence,
        bbox: {
          x: Math.random() * 800,
          y: Math.random() * 600,
          width: Math.random() * 200 + 50,
          height: Math.random() * 200 + 50
        }
      });
    }

    const result = {
      status: 'success',
      model: params.model,
      detections,
      processingTime: 2000,
      timestamp: Date.now()
    };

    this.log(`AI检测完成: 发现 ${detections.length} 个对象`);
    return result;
  }

  // HTTP请求
  private async executeHttpRequest(params: any): Promise<any> {
    this.log(`HTTP请求 - ${params.method} ${params.url}`);
    
    try {
      // 模拟HTTP请求
      await this.delay(1000);
      
      const result = {
        status: 'success',
        method: params.method,
        url: params.url,
        statusCode: 200,
        response: { message: 'Request successful', timestamp: Date.now() },
        timestamp: Date.now()
      };

      this.log(`HTTP请求成功: ${params.url}`);
      return result;
    } catch (error) {
      this.log(`HTTP请求失败: ${error}`);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };
    }
  }

  // 基础控制节点实现
  private async executeTakeoff(params: any): Promise<any> {
    this.log(`起飞 - 高度: ${params.height}cm`);
    await this.delay(3000);
    this.context.variables.altitude = params.height;
    return { status: 'success', altitude: params.height };
  }

  private async executeLand(params: any): Promise<any> {
    this.log('降落');
    await this.delay(3000);
    this.context.variables.altitude = 0;
    return { status: 'success', altitude: 0 };
  }

  private async executeHover(params: any): Promise<any> {
    this.log(`悬停 ${params.duration} 秒`);
    await this.delay(params.duration * 1000);
    return { status: 'success', duration: params.duration };
  }

  private async executeWait(params: any): Promise<any> {
    this.log(`等待 ${params.duration} 秒 - ${params.description || ''}`);
    await this.delay(params.duration * 1000);
    return { status: 'success', duration: params.duration };
  }

  // 其他节点的简化实现
  private executeIfElse(params: any): any {
    return { status: 'success', condition: true };
  }

  private executeLoop(params: any): any {
    return { status: 'success', iterations: params.iterations };
  }

  private async executeRecordVideo(params: any): Promise<any> {
    this.log(`录制视频 ${params.duration} 秒`);
    await this.delay(params.duration * 1000);
    return { status: 'success', duration: params.duration };
  }

  private async executeImageAnalysis(params: any): Promise<any> {
    this.log(`图像分析 - ${params.analysisType}`);
    await this.delay(1500);
    return { status: 'success', analysisType: params.analysisType };
  }

  private async executeAIClassification(params: any): Promise<any> {
    this.log(`AI分类 - ${params.model}`);
    await this.delay(1500);
    return { status: 'success', model: params.model, class: 'example_class', confidence: 0.95 };
  }

  private async executeAISegmentation(params: any): Promise<any> {
    this.log(`AI分割 - ${params.model}`);
    await this.delay(2000);
    return { status: 'success', model: params.model, segments: 5 };
  }

  private executeDataStorage(params: any): any {
    this.log(`数据存储 - ${params.format}`);
    return { status: 'success', format: params.format };
  }

  private executeDataTransform(params: any): any {
    this.log(`数据转换 - ${params.inputFormat} -> ${params.outputFormat}`);
    return { status: 'success', inputFormat: params.inputFormat, outputFormat: params.outputFormat };
  }

  private executeDataFilter(params: any): any {
    this.log(`数据过滤 - ${params.filterType}`);
    return { status: 'success', filterType: params.filterType, filtered: 10 };
  }

  private async executeWebSocketSend(params: any): Promise<any> {
    this.log(`WebSocket发送 - ${params.url}`);
    await this.delay(500);
    return { status: 'success', url: params.url };
  }

  private async executeApiCall(params: any): Promise<any> {
    this.log(`API调用 - ${params.endpoint}`);
    await this.delay(1000);
    return { status: 'success', endpoint: params.endpoint };
  }

  // 后端联动版：基础控制
  private async executeTakeoffWithBackend(params: any): Promise<any> {
    const height = Number(params?.height ?? 100);
    this.log(`起飞 - 目标高度: ${height}cm`);
    await this.sendCommand('drone_takeoff');
    await this.delay(2000);
    this.context.variables.altitude = height;
    return { status: 'success', altitude: height };
  }

  private async executeLandWithBackend(params: any): Promise<any> {
    this.log('降落');
    await this.sendCommand('drone_land');
    await this.delay(1500);
    this.context.variables.altitude = 0;
    return { status: 'success', altitude: 0 };
  }

  private async executeHoverWithBackend(params: any): Promise<any> {
    const duration = Number(params?.duration ?? 2);
    this.log(`悬停 ${duration} 秒`);
    await this.sendCommand('manual_control', { left_right: 0, forward_backward: 0, up_down: 0, yaw: 0 });
    await this.delay(duration * 1000);
    return { status: 'success', duration };
  }

  // 新增：运动/旋转/翻转/检测/视频 执行器
  private async executeMove(direction: string, params: any): Promise<any> {
    const distance = Number(params?.distance ?? 50);
    this.log(`移动 ${direction} ${distance}cm`);
    const ok = await this.sendCommand('move', { direction, distance });
    if (!ok) {
      // 后端若不支持move，退化为manual_control脉冲
      const speed = 40;
      let lr = 0, fb = 0, ud = 0;
      switch (direction) {
        case 'left': lr = -speed; break;
        case 'right': lr = speed; break;
        case 'forward':
        case 'front': fb = speed; break;
        case 'back':
        case 'backward': fb = -speed; break;
        case 'up': ud = speed; break;
        case 'down': ud = -speed; break;
      }
      const durationMs = Math.max(300, Math.min(3000, Math.floor(distance * 20)));
      await this.sendCommand('manual_control', { left_right: lr, forward_backward: fb, up_down: ud, yaw: 0 });
      await this.delay(durationMs);
      await this.sendCommand('manual_control', { left_right: 0, forward_backward: 0, up_down: 0, yaw: 0 });
    } else {
      await this.delay(400);
    }
    return { status: 'success', direction, distance };
  }

  private async executeRotate(direction: 'cw' | 'ccw', params: any): Promise<any> {
    const degrees = Number(params?.degrees ?? 90);
    this.log(`旋转 ${direction} ${degrees}°`);
    const ok = await this.sendCommand('rotate', { direction, degrees });
    if (!ok) {
      const yaw = direction === 'cw' ? 60 : -60;
      const durationMs = Math.max(300, Math.min(2000, Math.floor(degrees * 6)));
      await this.sendCommand('manual_control', { left_right: 0, forward_backward: 0, up_down: 0, yaw });
      await this.delay(durationMs);
      await this.sendCommand('manual_control', { left_right: 0, forward_backward: 0, up_down: 0, yaw: 0 });
    } else {
      await this.delay(300);
    }
    return { status: 'success', direction, degrees };
  }

  private async executeFlip(direction: 'l' | 'r' | 'f' | 'b'): Promise<any> {
    this.log(`翻转 ${direction}`);
    await this.sendCommand('flip', { direction });
    await this.delay(300);
    return { status: 'success', direction };
  }

  private async executeStartVideo(): Promise<any> {
    this.log('开启视频流');
    await this.sendCommand('start_video_streaming');
    return { status: 'success' };
  }

  private async executeStopVideo(): Promise<any> {
    this.log('停止视频流');
    await this.sendCommand('stop_video_streaming');
    return { status: 'success' };
  }

  private async executeQRScan(params: any): Promise<any> {
    const duration = Number(params?.duration ?? 5);
    this.log(`开始QR检测 (${duration}s)`);
    await this.sendCommand('start_qr_detection');
    await this.delay(duration * 1000);
    await this.sendCommand('stop_qr_detection');
    return { status: 'success', duration };
  }

  private async executeStrawberryDetection(params: any): Promise<any> {
    const duration = Number(params?.duration ?? 5);
    this.log(`开始草莓检测 (${duration}s)`);
    await this.sendCommand('start_strawberry_detection');
    await this.delay(duration * 1000);
    await this.sendCommand('stop_strawberry_detection');
    return { status: 'success', duration };
  }

  // 获取下一个要执行的节点
  private async getNextNodes(currentNode: WorkflowNode, result: any): Promise<WorkflowNode[]> {
    const outgoingEdges = this.edges.filter(edge => edge.source === currentNode.id);
    const nextNodes: WorkflowNode[] = [];

    for (const edge of outgoingEdges) {
      const nextNode = this.nodes.find(node => node.id === edge.target);
      if (nextNode) {
        // 对于条件分支节点，根据结果决定是否执行下一个节点
        const currentNodeType = currentNode.data?.nodeType || currentNode.type;
        if (currentNodeType === 'condition_branch' && result.condition !== undefined) {
          // 这里可以根据边的类型或标签来决定执行路径
          // 简化处理：如果条件为真，执行第一个分支，否则执行第二个分支
          const edgeIndex = outgoingEdges.indexOf(edge);
          if ((result.condition && edgeIndex === 0) || (!result.condition && edgeIndex === 1)) {
            nextNodes.push(nextNode);
          }
        } else {
          nextNodes.push(nextNode);
        }
      }
    }

    return nextNodes;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 获取当前执行状态
  getContext(): ExecutionContext {
    return { ...this.context };
  }

  // 更新变量
  updateVariable(key: string, value: any) {
    this.context.variables[key] = value;
    this.updateState();
  }
}
