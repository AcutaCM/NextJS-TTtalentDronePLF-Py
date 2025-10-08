"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, ButtonGroup } from '@heroui/button';
import { Input, Textarea } from '@heroui/input';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Divider } from '@heroui/divider';
import { Badge } from '@heroui/badge';
import { Tabs, Tab } from '@heroui/tabs';
import { ScrollShadow } from '@heroui/scroll-shadow';
import { Chip } from '@heroui/chip';
import { Progress } from '@heroui/progress';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { useDisclosure } from '@heroui/use-disclosure';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Plane, 
  PlaneLanding, 
  AlertTriangle, 
  Mic, 
  MicOff,
  Send,
  Settings,
  Eye,
  EyeOff,
  Battery,
  Thermometer,
  Ruler,
  Wifi,
  Clock,
  Brain,
  Zap,
  RotateCw,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoveUp,
  MoveDown,
  Square,
  Play,
  Pause
} from 'lucide-react';

// 类型定义
interface TelloAgentState {
  connected: boolean;
  flying: boolean;
  battery: number;
  temperature: number;
  height: number;
  speed: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  wifi_signal: number;
  flight_time: number;
}

interface DroneCommand {
  action: string;
  parameters?: Record<string, any>;
  description: string;
}

interface CommandResult {
  success: boolean;
  action: string;
  message: string;
  data?: any;
  error?: string;
}

interface AIAnalysis {
  success: boolean;
  commands: DroneCommand[];
  raw_response: string;
  error?: string;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

const TelloIntelligentAgent: React.FC = () => {
  // 状态管理
  const [agentState, setAgentState] = useState<TelloAgentState>({
    connected: false,
    flying: false,
    battery: 0,
    temperature: 0,
    height: 0,
    speed: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
    wifi_signal: 0,
    flight_time: 0
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [naturalCommand, setNaturalCommand] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string | null>(null);

  // WebSocket连接
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // 模态框控制
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();

  // 添加日志
  const addLog = useCallback((type: LogEntry['type'], message: string, details?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    setLogs(prev => [logEntry, ...prev].slice(0, 100)); // 保留最近100条日志
  }, []);

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      wsRef.current = new WebSocket('ws://localhost:3004');
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
        addLog('success', 'WebSocket连接成功');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          addLog('error', 'WebSocket消息解析失败', error);
        }
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
        addLog('warning', 'WebSocket连接断开');
        
        // 自动重连
        if (!reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            addLog('info', '尝试重新连接WebSocket...');
            connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        addLog('error', 'WebSocket连接错误', error);
      };

    } catch (error) {
      addLog('error', 'WebSocket连接失败', error);
    }
  }, [addLog]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'drone_status':
        if (data.data) {
          setAgentState(prev => ({
            ...prev,
            ...data.data
          }));
        }
        break;

      case 'connect_drone_response':
        setIsConnecting(false);
        if (data.success) {
          addLog('success', data.message || '无人机连接成功');
          toast.success('无人机连接成功');
        } else {
          addLog('error', data.error || '无人机连接失败');
          toast.error(data.error || '无人机连接失败');
        }
        break;

      case 'disconnect_drone_response':
        if (data.success) {
          addLog('info', '无人机连接已断开');
          toast.success('无人机连接已断开');
        }
        break;

      case 'natural_language_command_response':
        setIsExecuting(false);
        if (data.success) {
          addLog('success', data.message || '命令执行完成');
          if (data.ai_analysis) {
            addLog('info', 'AI分析结果', data.ai_analysis);
          }
          if (data.execution_results) {
            data.execution_results.forEach((result: CommandResult) => {
              addLog(result.success ? 'success' : 'error', result.message);
            });
          }
          toast.success('命令执行完成');
        } else {
          addLog('error', data.error || '命令执行失败');
          toast.error(data.error || '命令执行失败');
        }
        break;

      case 'drone_command_response':
        if (data.success) {
          addLog('success', data.message || '命令执行成功');
        } else {
          addLog('error', data.error || '命令执行失败');
        }
        break;

      default:
        addLog('info', '收到未知消息类型', data);
    }
  }, [addLog]);

  // 发送WebSocket消息
  const sendWebSocketMessage = useCallback((type: string, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = { type, data: data || {} };
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      addLog('error', 'WebSocket未连接');
      toast.error('WebSocket未连接');
      return false;
    }
  }, [addLog]);

  // 连接无人机
  const connectDrone = useCallback(() => {
    if (!wsConnected) {
      toast.error('请先连接WebSocket服务');
      return;
    }
    
    setIsConnecting(true);
    sendWebSocketMessage('connect_drone');
    addLog('info', '正在连接无人机...');
  }, [wsConnected, sendWebSocketMessage, addLog]);

  // 断开无人机连接
  const disconnectDrone = useCallback(() => {
    sendWebSocketMessage('disconnect_drone');
    addLog('info', '正在断开无人机连接...');
  }, [sendWebSocketMessage, addLog]);

  // 执行自然语言命令
  const executeNaturalCommand = useCallback(() => {
    if (!naturalCommand.trim()) {
      toast.error('请输入命令');
      return;
    }

    if (!agentState.connected) {
      toast.error('请先连接无人机');
      return;
    }

    setIsExecuting(true);
    sendWebSocketMessage('natural_language_command', { command: naturalCommand });
    
    // 添加到历史记录
    setCommandHistory(prev => [naturalCommand, ...prev.filter(cmd => cmd !== naturalCommand)].slice(0, 20));
    setHistoryIndex(-1);
    
    addLog('info', `执行自然语言命令: ${naturalCommand}`);
    setNaturalCommand('');
  }, [naturalCommand, agentState.connected, sendWebSocketMessage, addLog]);

  // 执行基础命令
  const executeBasicCommand = useCallback((action: string, parameters?: Record<string, any>) => {
    if (!agentState.connected) {
      toast.error('请先连接无人机');
      return;
    }

    sendWebSocketMessage('drone_command', { action, parameters });
    addLog('info', `执行命令: ${action}`, parameters);
  }, [agentState.connected, sendWebSocketMessage, addLog]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeNaturalCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setNaturalCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setNaturalCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setNaturalCommand('');
      }
    }
  }, [executeNaturalCommand, historyIndex, commandHistory]);

  // 获取状态颜色
  const getStatusColor = (connected: boolean, flying: boolean) => {
    if (!connected) return 'default';
    if (flying) return 'success';
    return 'primary';
  };

  // 获取电池颜色
  const getBatteryColor = (battery: number) => {
    if (battery > 50) return 'success';
    if (battery > 20) return 'warning';
    return 'danger';
  };

  // 组件挂载时连接WebSocket
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // 定期更新状态
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsConnected && agentState.connected) {
        sendWebSocketMessage('get_status');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [wsConnected, agentState.connected, sendWebSocketMessage]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#193059',
            color: '#E6F1FF',
            border: '1px solid #64FFDA',
          },
        }}
      />

      {/* 标题栏 */}
      <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Tello智能代理</h1>
              <p className="text-sm text-gray-300">自然语言控制无人机</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              color={wsConnected ? 'success' : 'danger'} 
              variant="flat"
              className="text-xs"
            >
              WebSocket: {wsConnected ? '已连接' : '断开'}
            </Badge>
            <Button
              isIconOnly
              variant="ghost"
              onPress={onSettingsOpen}
              className="text-gray-300 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：控制面板 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 连接状态 */}
          <Card className="bg-gray-900/50 border border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Plane className="w-5 h-5" />
                无人机状态
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge 
                    color={getStatusColor(agentState.connected, agentState.flying)}
                    variant="flat"
                    size="lg"
                  >
                    {!agentState.connected ? '未连接' : agentState.flying ? '飞行中' : '已连接'}
                  </Badge>
                  {agentState.connected && (
                    <div className="flex items-center gap-4 text-sm text-gray-300">
                      <div className="flex items-center gap-1">
                        <Battery className="w-4 h-4" />
                        <span className={`font-medium ${agentState.battery > 20 ? 'text-green-400' : 'text-red-400'}`}>
                          {agentState.battery}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-4 h-4" />
                        <span>{agentState.temperature}°C</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler className="w-4 h-4" />
                        <span>{agentState.height}cm</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    variant="solid"
                    onPress={connectDrone}
                    isLoading={isConnecting}
                    isDisabled={agentState.connected || !wsConnected}
                    size="sm"
                  >
                    {isConnecting ? '连接中...' : '连接'}
                  </Button>
                  <Button
                    color="danger"
                    variant="solid"
                    onPress={disconnectDrone}
                    isDisabled={!agentState.connected}
                    size="sm"
                  >
                    断开
                  </Button>
                </div>
              </div>

              {agentState.connected && agentState.battery > 0 && (
                <Progress
                  value={agentState.battery}
                  color={getBatteryColor(agentState.battery)}
                  className="w-full"
                  label="电池电量"
                  showValueLabel
                />
              )}
            </CardBody>
          </Card>

          {/* 自然语言控制 */}
          <Card className="bg-gray-900/50 border border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Brain className="w-5 h-5" />
                自然语言控制
              </h3>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="输入自然语言指令，例如：'起飞然后向前飞行50厘米'"
                  value={naturalCommand}
                  onChange={(e) => setNaturalCommand(e.target.value)}
                  onKeyDown={handleKeyDown}
                  minRows={2}
                  maxRows={4}
                  className="flex-1"
                  classNames={{
                    input: "text-white placeholder-gray-400",
                    inputWrapper: "bg-gray-800 border-gray-600"
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    color="primary"
                    variant="solid"
                    onPress={executeNaturalCommand}
                    isLoading={isExecuting}
                    isDisabled={!agentState.connected || !naturalCommand.trim()}
                    isIconOnly
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    color="secondary"
                    variant="ghost"
                    onPress={() => setIsListening(!isListening)}
                    isIconOnly
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* 快捷命令 */}
              <div className="space-y-2">
                <p className="text-sm text-gray-400">快捷命令：</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '起飞',
                    '降落',
                    '向前飞行30厘米',
                    '向上升20厘米',
                    '顺时针旋转90度',
                    '查询电池电量',
                    '悬停'
                  ].map((cmd) => (
                    <Chip
                      key={cmd}
                      variant="flat"
                      color="primary"
                      className="cursor-pointer hover:bg-blue-600/20"
                      onClick={() => setNaturalCommand(cmd)}
                    >
                      {cmd}
                    </Chip>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 基础控制 */}
          <Card className="bg-gray-900/50 border border-gray-700">
            <CardHeader>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                基础控制
              </h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  color="success"
                  variant="solid"
                  onPress={() => executeBasicCommand('takeoff')}
                  isDisabled={!agentState.connected || agentState.flying}
                  size="sm"
                  startContent={<Plane className="w-4 h-4" />}
                >
                  起飞
                </Button>
                <Button
                  color="warning"
                  variant="solid"
                  onPress={() => executeBasicCommand('land')}
                  isDisabled={!agentState.connected || !agentState.flying}
                  size="sm"
                  startContent={<PlaneLanding className="w-4 h-4" />}
                >
                  降落
                </Button>
                <Button
                  color="danger"
                  variant="solid"
                  onPress={() => executeBasicCommand('emergency')}
                  isDisabled={!agentState.connected}
                  size="sm"
                  startContent={<AlertTriangle className="w-4 h-4" />}
                >
                  紧急停止
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => executeBasicCommand('get_battery')}
                  isDisabled={!agentState.connected}
                  size="sm"
                  startContent={<Battery className="w-4 h-4" />}
                >
                  查询电量
                </Button>
              </div>

              {/* 方向控制 */}
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400">方向控制：</p>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  <div></div>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_forward', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <div></div>
                  
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_left', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_up', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <MoveUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_right', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  
                  <div></div>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_back', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('move_down', { distance: 30 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    isIconOnly
                    size="sm"
                  >
                    <MoveDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* 旋转控制 */}
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('rotate_counter_clockwise', { degrees: 90 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    size="sm"
                    startContent={<RotateCcw className="w-4 h-4" />}
                  >
                    逆时针
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => executeBasicCommand('rotate_clockwise', { degrees: 90 })}
                    isDisabled={!agentState.connected || !agentState.flying}
                    size="sm"
                    startContent={<RotateCw className="w-4 h-4" />}
                  >
                    顺时针
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 右侧：日志和状态 */}
        <div className="space-y-4">
          {/* 视频流 */}
          <Card className="bg-gray-900/50 border border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                视频流
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setVideoEnabled(!videoEnabled)}
                startContent={videoEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              >
                {videoEnabled ? '关闭' : '开启'}
              </Button>
            </CardHeader>
            <CardBody>
              <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                {videoEnabled && currentFrame ? (
                  <img src={currentFrame} alt="Tello视频流" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>视频流未启用</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* 日志 */}
          <Card className="bg-gray-900/50 border border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="text-lg font-semibold text-white">系统日志</h3>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setLogs([])}
              >
                清空
              </Button>
            </CardHeader>
            <CardBody>
              <ScrollShadow className="h-64">
                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">暂无日志</p>
                  ) : (
                    logs.map((log, index) => (
                      <div
                        key={index}
                        className={`text-xs p-2 rounded border-l-2 ${
                          log.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-300' :
                          log.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500 text-yellow-300' :
                          log.type === 'error' ? 'bg-red-900/20 border-red-500 text-red-300' :
                          'bg-blue-900/20 border-blue-500 text-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.message}</span>
                          <span className="text-gray-400">{log.timestamp}</span>
                        </div>
                        {log.details && (
                          <pre className="mt-1 text-xs opacity-75 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollShadow>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 设置模态框 */}
      <Modal isOpen={isSettingsOpen} onClose={onSettingsClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            <h3 className="text-xl font-semibold">Tello智能代理设置</h3>
          </ModalHeader>
          <ModalBody>
            <Tabs>
              <Tab key="connection" title="连接设置">
                <div className="space-y-4">
                  <Input
                    label="WebSocket地址"
                    placeholder="ws://localhost:3004"
                    defaultValue="ws://localhost:3004"
                  />
                  <Input
                    label="Tello IP地址"
                    placeholder="192.168.10.1"
                    defaultValue="192.168.10.1"
                  />
                </div>
              </Tab>
              <Tab key="ai" title="AI设置">
                <div className="space-y-4">
                  <Input
                    label="Azure OpenAI端点"
                    placeholder="https://your-resource.openai.azure.com/"
                  />
                  <Input
                    label="Azure OpenAI密钥"
                    type="password"
                    placeholder="输入API密钥"
                  />
                  <Input
                    label="模型部署名称"
                    placeholder="gpt-4"
                    defaultValue="gpt-4"
                  />
                </div>
              </Tab>
              <Tab key="safety" title="安全设置">
                <div className="space-y-4">
                  <Input
                    label="最大飞行高度 (cm)"
                    type="number"
                    placeholder="300"
                    defaultValue="300"
                  />
                  <Input
                    label="最低电量警告 (%)"
                    type="number"
                    placeholder="20"
                    defaultValue="20"
                  />
                </div>
              </Tab>
            </Tabs>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onSettingsClose}>
              取消
            </Button>
            <Button color="primary" onPress={onSettingsClose}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TelloIntelligentAgent;