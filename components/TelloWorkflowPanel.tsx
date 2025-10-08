'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
} from 'reactflow';
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Badge } from "@heroui/badge";
import { Tabs, Tab } from "@heroui/tabs";
import { ScrollShadow } from "@heroui/scroll-shadow";
import toast, { Toaster } from 'react-hot-toast';
import WorkflowCanvas from './WorkflowCanvas';
import useWebSocket from '../hooks/useWebSocket';
import { WorkflowNode, WorkflowEngine, ExecutionContext } from '../lib/workflowEngine';
import StatusNode from './StatusNode';
import NodeConfigModal from './NodeConfigModal';
import WorkflowManagerModal from './WorkflowManagerModal';
import { useDisclosure } from "@heroui/use-disclosure";
import styles from '../styles/WorkflowEditor.module.css';
import {
  Play,
  Square,
  Save,
  FolderOpen,
  Trash2,
  Settings,
  Circle,
  StopCircle,
  Plane,
  PlaneLanding,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoveUp,
  MoveDown,
  RotateCw,
  RotateCcw,
  Clock,
  Pause,
  QrCode,
  Eye,
  Zap,
  RefreshCw,
  Target,
  Workflow,
  Camera,
  Brain,
  GitBranch,
  Database,
  FileImage,
  Cpu,
  Network,
  CheckCircle,
  XCircle,
  Code,
  Repeat,
  Variable,
  FileText,
  Hash
} from 'lucide-react';

let id = 0;
const getId = () => `dndnode_${id++}`;

// Tello 无人机控制流节点定义
const telloFlowNodes = [
  // 流程控制
  { 
    type: 'start', 
    label: '开始', 
    icon: Circle,
    category: 'flow',
    description: '工作流开始节点'
  },
  { 
    type: 'end', 
    label: '结束', 
    icon: StopCircle,
    category: 'flow',
    description: '工作流结束节点'
  },
  
  // 基础控制
  { 
    type: 'takeoff', 
    label: '起飞', 
    icon: Plane,
    category: 'basic',
    description: '无人机起飞到默认高度'
  },
  { 
    type: 'land', 
    label: '降落', 
    icon: PlaneLanding,
    category: 'basic',
    description: '无人机安全降落'
  },
  { 
    type: 'emergency_stop', 
    label: '紧急停止', 
    icon: AlertTriangle,
    category: 'basic',
    description: '立即停止所有动作并悬停'
  },
  
  // 移动控制
  { 
    type: 'move_forward', 
    label: '前进', 
    icon: ArrowUp,
    category: 'movement',
    description: '向前移动指定距离'
  },
  { 
    type: 'move_backward', 
    label: '后退', 
    icon: ArrowDown,
    category: 'movement',
    description: '向后移动指定距离'
  },
  { 
    type: 'move_left', 
    label: '左移', 
    icon: ArrowLeft,
    category: 'movement',
    description: '向左移动指定距离'
  },
  { 
    type: 'move_right', 
    label: '右移', 
    icon: ArrowRight,
    category: 'movement',
    description: '向右移动指定距离'
  },
  { 
    type: 'move_up', 
    label: '上升', 
    icon: MoveUp,
    category: 'movement',
    description: '向上移动指定距离'
  },
  { 
    type: 'move_down', 
    label: '下降', 
    icon: MoveDown,
    category: 'movement',
    description: '向下移动指定距离'
  },
  
  // 旋转控制
  { 
    type: 'rotate_cw', 
    label: '顺时针旋转', 
    icon: RotateCw,
    category: 'rotation',
    description: '顺时针旋转指定角度'
  },
  { 
    type: 'rotate_ccw', 
    label: '逆时针旋转', 
    icon: RotateCcw,
    category: 'rotation',
    description: '逆时针旋转指定角度'
  },
  
  // 特技动作
  { 
    type: 'flip_forward', 
    label: '前翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向前翻转360度'
  },
  { 
    type: 'flip_backward', 
    label: '后翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向后翻转360度'
  },
  { 
    type: 'flip_left', 
    label: '左翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向左翻转360度'
  },
  { 
    type: 'flip_right', 
    label: '右翻', 
    icon: RefreshCw,
    category: 'tricks',
    description: '向右翻转360度'
  },
  
  // 检测任务
  { 
    type: 'qr_scan', 
    label: 'QR码扫描', 
    icon: QrCode,
    category: 'detection',
    description: '扫描并识别QR码'
  },
  { 
    type: 'strawberry_detection', 
    label: '草莓检测', 
    icon: Eye,
    category: 'detection',
    description: '检测并识别草莓'
  },
  { 
    type: 'object_tracking', 
    label: '目标跟踪', 
    icon: Target,
    category: 'detection',
    description: '跟踪指定目标对象'
  },
  
  // 延时控制
  { 
    type: 'wait', 
    label: '等待', 
    icon: Clock,
    category: 'control',
    description: '等待指定时间'
  },
  { 
    type: 'hover', 
    label: '悬停', 
    icon: Pause,
    category: 'control',
    description: '在当前位置悬停'
  },

  // 图像采集
  { 
    type: 'take_photo', 
    label: '拍照', 
    icon: Camera,
    category: 'imaging',
    description: '拍摄照片并保存'
  },
  { 
    type: 'start_video', 
    label: '开始录像', 
    icon: FileImage,
    category: 'imaging',
    description: '开始视频录制'
  },
  { 
    type: 'stop_video', 
    label: '停止录像', 
    icon: FileImage,
    category: 'imaging',
    description: '停止视频录制'
  },

  // AI分析
  { 
    type: 'ai_image_analysis', 
    label: 'AI图像分析', 
    icon: Brain,
    category: 'ai',
    description: '使用AI分析图像内容'
  },
  { 
    type: 'object_detection', 
    label: '物体检测', 
    icon: Eye,
    category: 'ai',
    description: '检测图像中的物体'
  },
  { 
    type: 'face_recognition', 
    label: '人脸识别', 
    icon: Eye,
    category: 'ai',
    description: '识别图像中的人脸'
  },
  { 
    type: 'text_recognition', 
    label: '文字识别', 
    icon: FileText,
    category: 'ai',
    description: '识别图像中的文字'
  },

  // 逻辑判断
  { 
    type: 'condition_branch', 
    label: '条件分支', 
    icon: GitBranch,
    category: 'logic',
    description: '根据条件执行不同分支'
  },
  { 
    type: 'if_else', 
    label: 'IF-ELSE判断', 
    icon: GitBranch,
    category: 'logic',
    description: 'IF-ELSE条件判断'
  },
  { 
    type: 'switch_case', 
    label: '多路分支', 
    icon: GitBranch,
    category: 'logic',
    description: 'Switch-Case多路分支'
  },
  { 
    type: 'loop', 
    label: '循环', 
    icon: Repeat,
    category: 'logic',
    description: '循环执行指定次数'
  },

  // 数据处理
  { 
    type: 'variable_set', 
    label: '设置变量', 
    icon: Variable,
    category: 'data',
    description: '设置变量值'
  },
  { 
    type: 'variable_get', 
    label: '获取变量', 
    icon: Variable,
    category: 'data',
    description: '获取变量值'
  },
  { 
    type: 'data_transform', 
    label: '数据转换', 
    icon: Code,
    category: 'data',
    description: '转换数据格式'
  },
  { 
    type: 'data_filter', 
    label: '数据过滤', 
    icon: Database,
    category: 'data',
    description: '过滤数据内容'
  },

  // 网络通信
  { 
    type: 'http_request', 
    label: 'HTTP请求', 
    icon: Network,
    category: 'network',
    description: '发送HTTP请求'
  },
  { 
    type: 'websocket_send', 
    label: 'WebSocket发送', 
    icon: Network,
    category: 'network',
    description: '通过WebSocket发送数据'
  },
  { 
    type: 'api_call', 
    label: 'API调用', 
    icon: Cpu,
    category: 'network',
    description: '调用外部API'
  },

  // 结果处理
  { 
    type: 'success_handler', 
    label: '成功处理', 
    icon: CheckCircle,
    category: 'result',
    description: '处理成功结果'
  },
  { 
    type: 'error_handler', 
    label: '错误处理', 
    icon: XCircle,
    category: 'result',
    description: '处理错误情况'
  },
  { 
    type: 'result_aggregator', 
    label: '结果聚合', 
    icon: Database,
    category: 'result',
    description: '聚合多个结果'
  },
];

const nodeCategories = [
  { key: 'all', label: '全部', icon: Workflow },
  { key: 'flow', label: '流程控制', icon: Circle },
  { key: 'basic', label: '基础控制', icon: Plane },
  { key: 'movement', label: '移动控制', icon: ArrowUp },
  { key: 'rotation', label: '旋转控制', icon: RotateCw },
  { key: 'tricks', label: '特技动作', icon: Zap },
  { key: 'detection', label: '检测任务', icon: Eye },
  { key: 'control', label: '时间控制', icon: Settings },
  { key: 'imaging', label: '图像采集', icon: Camera },
  { key: 'ai', label: 'AI分析', icon: Brain },
  { key: 'logic', label: '逻辑判断', icon: GitBranch },
  { key: 'data', label: '数据处理', icon: Database },
  { key: 'network', label: '网络通信', icon: Network },
  { key: 'result', label: '结果处理', icon: CheckCircle },
];

interface TelloWorkflowPanelProps {
  isConnected?: boolean;
  sendMessage?: (type: string, data?: any) => boolean;
}

const TelloWorkflowPanel: React.FC<TelloWorkflowPanelProps> = ({ isConnected = false, sendMessage: wsSend }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{ task: string; result: any; resultType?: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('log');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState('');
  const [isNodeLibraryVisible, setIsNodeLibraryVisible] = useState(false);
  const [workflowEngine, setWorkflowEngine] = useState<WorkflowEngine | null>(null);
  
  const { isConnected: wsConnected, lastMessage, sendMessage } = useWebSocket('ws://localhost:8080');
  const nodeTypes = useMemo(() => ({ statusNode: StatusNode }), []);
  
  // 模态框控制
  const { isOpen: isConfigOpen, onOpen: onConfigOpen, onClose: onConfigClose } = useDisclosure();
  const { isOpen: isManagerOpen, onOpen: onManagerOpen, onClose: onManagerClose } = useDisclosure();

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return telloFlowNodes;
    return telloFlowNodes.filter(node => node.category === selectedCategory);
  }, [selectedCategory]);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'log') {
          setLogs((prev) => [...prev, data.payload]);
        } else if (data.type === 'node_status_update') {
          const { nodeId, status } = data.payload;
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === nodeId) {
                node.data = { ...node.data, status };
              }
              return node;
            })
          );
        } else if (data.type === 'task_result') {
          setResults((prev) => [...prev, data.payload]);
        } else if (data.type === 'workflow_finished') {
          setIsRunning(false);
          toast.success(data.payload.message);
        } else if (data.type === 'workflow_started') {
          setIsRunning(true);
          toast.success('工作流开始执行');
        }
      } catch (e) {
        setLogs((prev) => [...prev, lastMessage.data]);
      }
    }
  }, [lastMessage, setNodes]);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const data = event.dataTransfer.getData('application/reactflow');
      
      if(typeof data === 'undefined' || !data) {
        return;
      }

      try {
        const { type, label } = JSON.parse(data);
        
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        const newNode = {
          id: getId(),
          type: 'statusNode',
          position,
          data: { 
            label: `${label}`, 
            status: 'idle',
            nodeType: type,
            parameters: getDefaultParameters(type)
          },
        };

        setNodes((nds) => nds.concat(newNode));
        
        // 清除拖拽数据，防止重复处理
        event.dataTransfer.clearData();
      } catch (error) {
        console.error('Error parsing drag data:', error);
      }
    },
    [setNodes]
  );

  // 获取节点默认参数
  const getDefaultParameters = (nodeType: string) => {
    const defaults: Record<string, any> = {
      takeoff: { height: 100, waitForStable: true },
      land: { safetyCheck: true, speed: 50 },
      move_forward: { distance: 50, speed: 50 },
      move_backward: { distance: 50, speed: 50 },
      move_left: { distance: 50, speed: 50 },
      move_right: { distance: 50, speed: 50 },
      move_up: { distance: 50, speed: 30 },
      move_down: { distance: 50, speed: 30 },
      rotate_cw: { angle: 90, speed: 60 },
      rotate_ccw: { angle: 90, speed: 60 },
      hover: { duration: 3, stabilize: true },
      wait: { duration: 1, description: '' },
      qr_scan: { timeout: 10, saveImage: true, continueOnFail: false },
      strawberry_detection: { confidence: 0.7, timeout: 15, saveResults: true },
      flip_forward: { safetyCheck: true, waitAfter: 2 },
      flip_backward: { safetyCheck: true, waitAfter: 2 },
      flip_left: { safetyCheck: true, waitAfter: 2 },
      flip_right: { safetyCheck: true, waitAfter: 2 },
      start: { workflowName: '', description: '', autoStart: false },
      end: { endAction: 'land', generateReport: true, saveLog: true },
      
      // 逻辑判断
      condition_branch: { 
        condition: 'battery > 50', 
        trueAction: 'continue', 
        falseAction: 'land',
        operator: '>', 
        value: 50,
        variable: 'battery'
      },
      if_else: { 
        condition: '', 
        trueLabel: '是', 
        falseLabel: '否',
        conditionType: 'battery'
      },
      loop: { 
        iterations: 3, 
        condition: '', 
        maxIterations: 10,
        breakCondition: ''
      },
      
      // 图像处理
      take_photo: { resolution: 'high', saveLocal: true, format: 'jpg' },
      record_video: { duration: 10, resolution: 'high', format: 'mp4' },
      image_analysis: { analysisType: 'object_detection', confidence: 0.7, model: 'yolo' },
      
      // AI分析
      ai_classification: { model: 'resnet50', confidence: 0.8 },
      ai_detection: { model: 'yolo', confidence: 0.7, maxDetections: 10 },
      ai_segmentation: { model: 'mask_rcnn', confidence: 0.8 },
      
      // 数据处理
      data_storage: { storageType: 'local', format: 'json' },
      data_transform: { inputFormat: 'json', outputFormat: 'csv' },
      data_filter: { filterType: 'threshold', keepMatching: true },
      
      // 网络通信
      http_request: { url: '', method: 'POST', timeout: 30 },
      websocket_send: { url: '', message: '', timeout: 10 },
      api_call: { endpoint: '', parameters: {}, retries: 3 },
      
      // 结果处理
      success_handler: { action: 'continue', message: '操作成功' },
      error_handler: { action: 'retry', maxRetries: 3, fallbackAction: 'skip' },
      result_aggregator: { aggregationType: 'merge', outputFormat: 'json' }
    };
    return defaults[nodeType] || {};
  };

  // 处理节点双击事件
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode({
      id: node.id,
      type: node.data.nodeType || 'custom',
      label: node.data.label,
      parameters: node.data.parameters || {}
    });
    onConfigOpen();
  }, [onConfigOpen]);

  // 保存节点配置
  const handleSaveNodeConfig = useCallback((config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === config.id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: config.label,
              parameters: config.parameters
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleRun = async () => {
    if (nodes.length === 0) {
      toast.error('请先添加工作流节点');
      return;
    }
    
    setIsRunning(true);
    setLogs([]);
    
    // 创建工作流引擎
    const workflowNodes: WorkflowNode[] = nodes
      .filter(node => node.type)
      .map(node => ({
        id: node.id,
        type: node.type!,
        data: node.data,
        position: node.position
      }));
    
    const engine = new WorkflowEngine(
      workflowNodes,
      edges,
      (message) => {
        setLogs(prev => [...prev, message]);
      },
      (context) => {
        // 更新执行状态
        console.log('工作流状态更新:', context);
      }
    );
    
    setWorkflowEngine(engine);
    
    try {
      await engine.execute();
      toast.success('工作流执行完成');
    } catch (error) {
      toast.error(`工作流执行失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    if (workflowEngine) {
      workflowEngine.stop();
    }
    setIsRunning(false);
    setLogs(prev => [...prev, `停止工作流执行 - ${new Date().toLocaleTimeString()}`]);
  };

  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error('工作流为空，无法保存');
      return;
    }

    const workflowName = currentWorkflowName || `Tello工作流_${new Date().toLocaleDateString()}`;
    const workflowData = {
      id: Date.now().toString(),
      name: workflowName,
      description: `包含 ${nodes.length} 个节点的 Tello 工作流`,
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length
    };
    
    // 保存到本地存储
    const savedWorkflows = JSON.parse(localStorage.getItem('tello_workflows') || '[]');
    savedWorkflows.push(workflowData);
    localStorage.setItem('tello_workflows', JSON.stringify(savedWorkflows));
    
    toast.success('工作流已保存');
    setLogs(prev => [...prev, `工作流已保存 - ${workflowData.name}`]);
  };

  // 加载工作流
  const handleLoadWorkflow = useCallback((workflow: any) => {
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    setCurrentWorkflowName(workflow.name);
    setLogs(prev => [...prev, `已加载工作流 - ${workflow.name}`]);
  }, [setNodes, setEdges]);

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setLogs(prev => [...prev, `清空工作流 - ${new Date().toLocaleTimeString()}`]);
    setResults([]);
  };

  const toggleNodeLibrary = () => {
    setIsNodeLibraryVisible(!isNodeLibraryVisible);
  };

  return (
    <div className={styles.editorContainer}>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#193059',
            color: '#E6F1FF',
            border: '1px solid #64FFDA',
          },
          success: {
            iconTheme: {
              primary: '#64FFDA',
              secondary: '#0A192F',
            },
          },
        }}
      />
      
      {/* 中间画布区域 */}
      <ReactFlowProvider>
        <div className={styles.workflowWrapper} onDrop={onDrop} onDragOver={onDragOver}>
          {/* 工具栏 */}
          <div className={styles.toolbar}>
            <button 
              className={`${styles.toolbarButton} ${isNodeLibraryVisible ? styles.active : ''}`}
              onClick={toggleNodeLibrary}
              title="切换节点库"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </button>
          </div>

          {/* 浮动节点库 */}
          <aside className={`${styles.taskNodeLibrary} ${isNodeLibraryVisible ? styles.visible : ''}`}>
            <h3>Tello 控制节点</h3>
            
            {/* 分类选择 */}
            <div className="mb-4">
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 bg-black/40 border border-cyan-400/30 rounded text-white text-sm"
              >
                {nodeCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 节点列表 */}
            <div className={styles.nodeList}>
              {filteredNodes.map((node) => {
                const IconComponent = node.icon;
                return (
                  <div
                    key={node.type}
                    className={styles.libraryNode}
                    onDragStart={(event) => onDragStart(event, node.type, node.label)}
                    draggable
                    title={node.description}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconComponent size={16} className="text-cyan-400" />
                      <span>{node.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className={styles.workflowCanvas}>
            <div style={{ height: '100%', position: 'relative' }}>
              {currentWorkflowName && (
                <div style={{ 
                  position: 'absolute', 
                  top: '10px', 
                  left: '10px', 
                  zIndex: 10,
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '12px'
                }}>
                  当前工作流: {currentWorkflowName}
                </div>
              )}
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeDoubleClick={onNodeDoubleClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
              />
            </div>
          </div>
        </div>
      </ReactFlowProvider>

      {/* 右侧控制面板 */}
      <aside className={styles.controlStatusPanel}>
        <div className={styles.controls}>
          <h4>控制面板</h4>
          <div className="mb-3 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span>连接状态:</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>WebSocket:</span>
              <span className={wsConnected ? 'text-green-400' : 'text-yellow-400'}>
                {wsConnected ? '已连接' : '断开'}
              </span>
            </div>
          </div>
          
          <button 
            className={`${styles.button} ${styles.runButton}`} 
            onClick={handleRun}
            disabled={!isConnected || isRunning}
          >
            <Play size={16} className="mr-2" />
            运行工作流
          </button>
          <button 
            className={`${styles.button} ${styles.stopButton}`} 
            onClick={handleStop}
            disabled={!isRunning}
          >
            <Square size={16} className="mr-2" />
            停止
          </button>
          <button 
            className={`${styles.button} ${styles.clearButton}`} 
            onClick={handleSave}
          >
            <Save size={16} className="mr-2" />
            保存工作流
          </button>
          <button 
            className={`${styles.button} ${styles.clearButton}`} 
            onClick={onManagerOpen}
          >
            <FolderOpen size={16} className="mr-2" />
            管理工作流
          </button>
          <button 
            className={`${styles.button} ${styles.clearButton}`} 
            onClick={handleClear}
          >
            <Trash2 size={16} className="mr-2" />
            清空
          </button>
          
          <div className="mt-3 text-xs text-white/60">
            节点数: {nodes.length} | 连接数: {edges.length}
          </div>
        </div>
        
        <div className={styles.monitoring}>
          <h4>执行监控</h4>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'log' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('log')}
            >
              执行日志
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'results' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('results')}
            >
              执行结果
            </button>
          </div>
          
          <div className={styles.contentContainer}>
            {activeTab === 'log' && (
              <div className={styles.logContent}>
                {logs.length === 0 ? (
                  <p>暂无日志信息</p>
                ) : (
                  logs.map((log, index) => (
                    <p key={index}>[{new Date().toLocaleTimeString()}] {log}</p>
                  ))
                )}
              </div>
            )}
            {activeTab === 'results' && (
              <div className={styles.resultsContent}>
                {results.length === 0 ? (
                  <p>暂无执行结果</p>
                ) : (
                  results.map((item, index) => (
                    <div key={index} className={styles.resultItem}>
                      <strong>{item.task}:</strong>
                      {item.resultType === 'image' ? (
                        <img src={item.result} alt={item.task} className={styles.resultImage} />
                      ) : (
                        <p>{JSON.stringify(item.result)}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 节点配置模态框 */}
      <NodeConfigModal
        isOpen={isConfigOpen}
        onClose={onConfigClose}
        nodeConfig={selectedNode}
        onSave={handleSaveNodeConfig}
      />

      {/* 工作流管理模态框 */}
      <WorkflowManagerModal
        isOpen={isManagerOpen}
        onClose={onManagerClose}
        onLoadWorkflow={handleLoadWorkflow}
      />
    </div>
  );
};

export default TelloWorkflowPanel;
