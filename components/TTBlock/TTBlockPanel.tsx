'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Controls,
  Background,
  MiniMap,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Badge } from "@heroui/badge";
import { Tabs, Tab } from "@heroui/tabs";
import { ScrollShadow } from "@heroui/scroll-shadow";
import toast, { Toaster } from 'react-hot-toast';
import { useDisclosure } from "@heroui/use-disclosure";
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
import BlockNode from './BlockNode';
import { TTBlockEngine } from './TTBlockEngine';
import NodeConfigModal from './NodeConfigModal';
import { ttBlockNodes, nodeCategories } from './blockNodes';



interface TTBlockPanelProps {
  isConnected?: boolean;
  sendMessage?: (type: string, data?: any) => boolean;
}

const TTBlockPanel: React.FC<TTBlockPanelProps> = ({ isConnected = false, sendMessage: wsSend }) => {
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
  const [nodeDefinition, setNodeDefinition] = useState<any>(null);
  
  const nodeTypes = useMemo(() => ({ 
    blockNode: (props: any) => (
      <BlockNode 
        {...props} 
        onNodeDoubleClick={(event, node) => {
          const nodeType = node.data.nodeType;
          const definition = ttBlockNodes.find(n => n.type === nodeType);
          setSelectedNode({
            id: node.id,
            type: nodeType,
            label: node.data.label,
            parameters: node.data.parameters || {}
          });
          setNodeDefinition(definition);
          onConfigOpen();
        }} 
      />
    )
  }), []);

  // 模态框控制
  const { isOpen: isConfigOpen, onOpen: onConfigOpen, onClose: onConfigClose } = useDisclosure();
  const { isOpen: isManagerOpen, onOpen: onManagerOpen, onClose: onManagerClose } = useDisclosure();

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return ttBlockNodes;
    return ttBlockNodes.filter(node => node.category === selectedCategory);
  }, [selectedCategory]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
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
          id: `node_${Date.now()}`,
          type: 'blockNode',
          position,
          data: { 
            label: `${label}`, 
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

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = 'move';
  };

  // 获取节点默认参数
  const getDefaultParameters = useCallback((nodeType: string) => {
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
  }, []);

  const handleRun = async () => {
    if (nodes.length === 0) {
      toast.error('请先添加积木节点');
      return;
    }
    
    setIsRunning(true);
    setLogs([]);
    
    // 创建执行引擎并执行
    const engine = new TTBlockEngine(
      nodes as any,
      edges as any,
      (message) => {
        setLogs(prev => [...prev, message]);
      },
      (context) => {
        // 更新执行状态
        console.log('程序状态更新:', context);
      },
      wsSend
    );
    
    try {
      await engine.execute();
      toast.success('程序执行完成');
    } catch (error) {
      toast.error(`程序执行失败: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, `停止程序执行 - ${new Date().toLocaleTimeString()}`]);
  };

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

  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error('程序为空，无法保存');
      return;
    }

    const programName = currentWorkflowName || `TT程序_${new Date().toLocaleDateString()}`;
    const programData = {
      id: Date.now().toString(),
      name: programName,
      description: `包含 ${nodes.length} 个节点的 TT 程序`,
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length
    };
    
    // 保存到本地存储
    const savedPrograms = JSON.parse(localStorage.getItem('tt_programs') || '[]');
    savedPrograms.push(programData);
    localStorage.setItem('tt_programs', JSON.stringify(savedPrograms));
    
    toast.success('程序已保存');
    setLogs(prev => [...prev, `程序已保存 - ${programData.name}`]);
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    setLogs(prev => [...prev, `清空程序 - ${new Date().toLocaleTimeString()}`]);
    setResults([]);
  };

  const toggleNodeLibrary = () => {
    setIsNodeLibraryVisible(!isNodeLibraryVisible);
  };

  return (
    <div className="flex h-full bg-background">
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
      
      {/* 左侧节点库 */}
      <div className={`w-64 bg-content2 border-r border-divider transition-all duration-300 ${isNodeLibraryVisible ? '' : '-ml-64'}`}>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-4 text-foreground">TT积木库</h3>
          
          {/* 分类选择 */}
          <div className="mb-4">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-black/40 border border-cyan-400/30 rounded text-white text-sm"
              aria-label="选择节点分类"
              title="选择节点分类"
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
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filteredNodes.map((node) => {
              const IconComponent = node.icon;
              return (
                <div
                  key={node.type}
                  className="p-3 bg-content3 rounded-lg cursor-move hover:bg-content4 transition-colors flex items-center gap-2"
                  onDragStart={(event) => onDragStart(event, node.type, node.label)}
                  draggable
                  title={node.description}
                >
                  <IconComponent size={16} className="text-cyan-400" />
                  <span className="text-foreground text-sm">{node.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 中间画布区域 */}
      <ReactFlowProvider>
        <div className="flex-1 flex flex-col">
          {/* 工具栏 */}
          <div className="h-12 bg-content1 border-b border-divider flex items-center px-4 gap-2">
            <button 
              className={`p-2 rounded ${isNodeLibraryVisible ? 'bg-primary/20 text-primary' : 'hover:bg-content3'}`}
              onClick={toggleNodeLibrary}
              title="切换节点库"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </button>
            
            <Divider orientation="vertical" className="h-6 mx-2" />
            
            <button 
              className={`p-2 rounded flex items-center gap-1 ${isRunning ? 'bg-danger/20 text-danger' : 'hover:bg-content3'}`}
              onClick={isRunning ? handleStop : handleRun}
              disabled={!isConnected}
            >
              {isRunning ? <Square size={16} /> : <Play size={16} />}
              <span className="text-sm">{isRunning ? '停止' : '运行'}</span>
            </button>
            
            <button 
              className="p-2 rounded hover:bg-content3 flex items-center gap-1"
              onClick={handleSave}
            >
              <Save size={16} />
              <span className="text-sm">保存</span>
            </button>
            
            <button 
              className="p-2 rounded hover:bg-content3 flex items-center gap-1"
              onClick={onManagerOpen}
            >
              <FolderOpen size={16} />
              <span className="text-sm">管理</span>
            </button>
            
            <button 
              className="p-2 rounded hover:bg-content3 flex items-center gap-1"
              onClick={handleClear}
            >
              <Trash2 size={16} />
              <span className="text-sm">清空</span>
            </button>
            
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-foreground/70">节点: {nodes.length}</span>
              <span className="text-foreground/70">连接: {edges.length}</span>
            </div>
          </div>

          {/* 画布区域 */}
          <div 
            className="flex-1 bg-content1 relative"
            onDrop={onDrop}
            onDragOver={onDragOver}
          >
            {currentWorkflowName && (
              <div className="absolute top-4 left-4 z-10 bg-black/70 text-white px-3 py-1 rounded text-sm">
                当前程序: {currentWorkflowName}
              </div>
            )}
            
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              className="w-full h-full"
            >
              <Controls />
              <MiniMap />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>
      </ReactFlowProvider>

      {/* 右侧控制面板 */}
      <div className="w-80 bg-content2 border-l border-divider flex flex-col">
        <div className="p-4 border-b border-divider">
          <h4 className="text-lg font-semibold text-foreground">控制面板</h4>
          <div className="mt-2 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <span>连接状态:</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col">
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={(key) => setActiveTab(key as string)}
            className="flex-1 flex flex-col"
          >
            <Tab 
              key="log" 
              title="执行日志"
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 p-4 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-foreground/50 text-center py-4">暂无日志信息</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="text-sm p-2 bg-content3 rounded">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
            <Tab 
              key="results" 
              title="执行结果"
              className="flex-1 flex flex-col"
            >
              <div className="flex-1 p-4 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-foreground/50 text-center py-4">暂无执行结果</p>
                ) : (
                  <div className="space-y-2">
                    {results.map((item, index) => (
                      <div key={index} className="p-2 bg-content3 rounded">
                        <strong className="text-foreground">{item.task}:</strong>
                        <p className="text-sm mt-1">{JSON.stringify(item.result)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
      
      {/* 节点配置模态框 */}
      <NodeConfigModal
        isOpen={isConfigOpen}
        onClose={onConfigClose}
        nodeConfig={selectedNode}
        onSave={handleSaveNodeConfig}
        nodeDefinition={nodeDefinition}
      />
    </div>
  );
};

export default TTBlockPanel;