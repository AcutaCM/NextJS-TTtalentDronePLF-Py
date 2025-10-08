'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Select, SelectItem } from '@heroui/select';
import { Chip } from '@heroui/chip';
import { Progress } from '@heroui/progress';
import { Divider } from '@heroui/divider';
import { Badge } from '@heroui/badge';
import { Tooltip } from '@heroui/tooltip';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal';
import { useDisclosure } from '@heroui/use-disclosure';
import { 
  Upload, 
  Play, 
  Square, 
  Eye, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';

type ModelItem = {
  name: string;
  size: number;
  mtime: number;
  type?: 'maturity' | 'disease' | 'general';
  accuracy?: number;
  description?: string;
};

type DetectionStatus = {
  isActive: boolean;
  modelName: string;
  detectionType: string;
  fps: number;
  objectCount: number;
  confidence: number;
};

type ModelSelectorProps = {
  className?: string;
  onModelChange?: (modelName: string, modelType: string) => void;
  showUpload?: boolean;
  compactMode?: boolean;
};

export default function EnhancedModelSelector({ 
  className, 
  onModelChange,
  showUpload = true,
  compactMode = false 
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    isActive: false,
    modelName: '',
    detectionType: '',
    fps: 0,
    objectCount: 0,
    confidence: 0
  });
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 模型类型配置
  const modelTypes = [
    { key: 'maturity', label: '成熟度检测', icon: '🍓', color: 'success' as const },
    { key: 'disease', label: '病害检测', icon: '🦠', color: 'warning' as const },
    { key: 'general', label: '通用检测', icon: '🎯', color: 'primary' as const }
  ];

  // 获取模型列表
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models/list', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        const enhancedModels = data.models.map((model: ModelItem) => ({
          ...model,
          type: getModelType(model.name),
          accuracy: getModelAccuracy(model.name),
          description: getModelDescription(model.name)
        }));
        setModels(enhancedModels);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      showMessage('获取模型列表失败', 'error');
    }
  }, []);

  // 获取检测状态
  const fetchDetectionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/models/status', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setDetectionStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to get detection status:', error);
    }
  }, []);

  useEffect(() => {
    fetchModels();
    fetchDetectionStatus();
    
    const interval = setInterval(fetchDetectionStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchModels, fetchDetectionStatus]);

  // 显示消息
  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 5000);
  };

  // 获取模型类型
  const getModelType = (name: string): 'maturity' | 'disease' | 'general' => {
    if (name.includes('disease') || name.includes('病害')) return 'disease';
    if (name.includes('best') || name.includes('成熟') || name.includes('maturity') || name.includes('strawberry')) return 'maturity';
    return 'general';
  };

  // 获取模型准确率（模拟数据）
  const getModelAccuracy = (name: string): number => {
    if (name.includes('best')) return 95.2;
    if (name.includes('strawberry')) return 92.8;
    if (name.includes('disease')) return 89.5;
    return 87.0;
  };

  // 获取模型描述
  const getModelDescription = (name: string): string => {
    if (name.includes('strawberry')) return '专门用于草莓成熟度检测的优化模型';
    if (name.includes('disease')) return '植物病害识别和分类模型';
    if (name.includes('best')) return '高精度通用检测模型';
    return '标准YOLO检测模型';
  };

  // 获取模型类型信息
  const getModelTypeInfo = (type: string) => {
    return modelTypes.find(t => t.key === type) || modelTypes[2];
  };

  // 应用模型
  const applyModel = async () => {
    if (!selectedModel || !selectedType) {
      showMessage('请选择模型和检测类型', 'error');
      return;
    }

    setIsApplying(true);
    try {
      // 1. 应用模型
      const applyRes = await fetch('/api/models/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedModel, type: selectedType })
      });
      const applyData = await applyRes.json();
      
      if (!applyData.ok) {
        throw new Error(applyData.error || '模型应用失败');
      }

      // 2. 启动检测
      const startRes = await fetch('/api/models/start-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName: selectedModel, detectionType: selectedType })
      });
      const startData = await startRes.json();
      
      if (!startData.ok) {
        throw new Error(startData.error || '检测启动失败');
      }

      showMessage(`🚀 模型已成功应用并启动检测：${selectedModel}`, 'success');
      onModelChange?.(selectedModel, selectedType);
      await fetchDetectionStatus();
      
    } catch (err: any) {
      showMessage(`应用失败：${err.message}`, 'error');
    } finally {
      setIsApplying(false);
    }
  };

  // 停止检测
  const stopDetection = async () => {
    try {
      const res = await fetch('/api/models/stop-detection', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        showMessage('检测已停止', 'success');
        await fetchDetectionStatus();
      } else {
        showMessage(`停止失败：${data.error}`, 'error');
      }
    } catch (err: any) {
      showMessage(`停止错误：${err.message}`, 'error');
    }
  };

  // 渲染紧凑模式
  if (compactMode) {
    return (
      <Card className={`bg-background/60 backdrop-blur-sm border border-divider ${className}`}>
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <Select
              label="选择模型"
              placeholder="请选择YOLO模型"
              selectedKeys={selectedModel ? [selectedModel] : []}
              onSelectionChange={(keys) => setSelectedModel(Array.from(keys)[0] as string)}
              className="flex-1"
              size="sm"
            >
              {models.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex items-center gap-2">
                    <span>{getModelTypeInfo(model.type!).icon}</span>
                    <span>{model.name}</span>
                    <Chip size="sm" color={getModelTypeInfo(model.type!).color} variant="flat">
                      {model.accuracy}%
                    </Chip>
                  </div>
                </SelectItem>
              ))}
            </Select>
            
            <Select
              label="检测类型"
              placeholder="选择类型"
              selectedKeys={selectedType ? [selectedType] : []}
              onSelectionChange={(keys) => setSelectedType(Array.from(keys)[0] as string)}
              className="w-40"
              size="sm"
            >
              {modelTypes.map((type) => (
                <SelectItem key={type.key} value={type.key}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>

            <Button
              color="primary"
              size="sm"
              isLoading={isApplying}
              isDisabled={!selectedModel || !selectedType || detectionStatus.isActive}
              onPress={applyModel}
              startContent={!isApplying && <Play className="w-4 h-4" />}
            >
              {isApplying ? '应用中...' : '应用模型'}
            </Button>

            {detectionStatus.isActive && (
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={stopDetection}
                startContent={<Square className="w-3 h-3" />}
              >
                停止
              </Button>
            )}
          </div>

          {/* 当前状态显示 */}
          {detectionStatus.isActive && (
            <div className="mt-3 p-2 bg-success/10 border border-success/20 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span className="font-medium">正在使用：{detectionStatus.modelName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground/70">
                  <span>FPS: {detectionStatus.fps}</span>
                  <span>检测: {detectionStatus.objectCount}</span>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  // 渲染完整模式
  return (
    <Card className={`bg-background/60 backdrop-blur-sm border border-divider ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">智能模型选择器</h3>
              <p className="text-sm text-foreground/70">选择并应用YOLO检测模型</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="刷新模型列表">
              <Button
                isIconOnly
                variant="flat"
                size="sm"
                onPress={fetchModels}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </Tooltip>
            {showUpload && (
              <Button
                color="primary"
                variant="flat"
                size="sm"
                onPress={onOpen}
                startContent={<Upload className="w-4 h-4" />}
              >
                上传模型
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        {/* 当前检测状态 */}
        {detectionStatus.isActive && (
          <div className="mb-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
                <span className="font-medium text-success">检测进行中</span>
                <Badge content="运行中" color="success" variant="flat" />
              </div>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={stopDetection}
                startContent={<Square className="w-3 h-3" />}
              >
                停止检测
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-foreground/70 text-xs">当前模型</span>
                <span className="font-medium">{detectionStatus.modelName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-foreground/70 text-xs">检测类型</span>
                <span className="font-medium">{detectionStatus.detectionType}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-foreground/70 text-xs">帧率</span>
                <span className="font-medium">{detectionStatus.fps} FPS</span>
              </div>
              <div className="flex flex-col">
                <span className="text-foreground/70 text-xs">检测对象</span>
                <span className="font-medium">{detectionStatus.objectCount}</span>
              </div>
            </div>

            {detectionStatus.confidence > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>检测置信度</span>
                  <span>{(detectionStatus.confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress 
                  value={detectionStatus.confidence * 100} 
                  color="success" 
                  size="sm"
                />
              </div>
            )}
          </div>
        )}

        {/* 消息显示 */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg border ${
            messageType === 'success' ? 'bg-success/10 border-success/20 text-success' :
            messageType === 'error' ? 'bg-danger/10 border-danger/20 text-danger' :
            'bg-primary/10 border-primary/20 text-primary'
          }`}>
            <div className="flex items-center gap-2">
              {messageType === 'success' && <CheckCircle className="w-4 h-4" />}
              {messageType === 'error' && <AlertCircle className="w-4 h-4" />}
              {messageType === 'info' && <Info className="w-4 h-4" />}
              <p className="text-sm">{message}</p>
            </div>
          </div>
        )}

        <Divider className="mb-4" />

        {/* 模型选择区域 */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="选择YOLO模型"
              placeholder="请选择要应用的模型"
              selectedKeys={selectedModel ? [selectedModel] : []}
              onSelectionChange={(keys) => setSelectedModel(Array.from(keys)[0] as string)}
              description="选择已上传的YOLO模型文件"
            >
              {models.map((model) => (
                <SelectItem key={model.name} value={model.name}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span>{getModelTypeInfo(model.type!).icon}</span>
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-foreground/60">
                          {(model.size / (1024*1024)).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <Chip size="sm" color={getModelTypeInfo(model.type!).color} variant="flat">
                      {model.accuracy}%
                    </Chip>
                  </div>
                </SelectItem>
              ))}
            </Select>

            <Select
              label="检测类型"
              placeholder="选择检测类型"
              selectedKeys={selectedType ? [selectedType] : []}
              onSelectionChange={(keys) => setSelectedType(Array.from(keys)[0] as string)}
              description="选择要执行的检测任务类型"
            >
              {modelTypes.map((type) => (
                <SelectItem key={type.key} value={type.key}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* 选中模型的详细信息 */}
          {selectedModel && (
            <div className="p-4 bg-content1 rounded-lg border border-divider">
              {(() => {
                const model = models.find(m => m.name === selectedModel);
                if (!model) return null;
                const typeInfo = getModelTypeInfo(model.type!);
                
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <h4 className="font-medium text-foreground">{model.name}</h4>
                        <p className="text-sm text-foreground/70">{model.description}</p>
                      </div>
                      <div className="ml-auto">
                        <Chip color={typeInfo.color} variant="flat">
                          准确率 {model.accuracy}%
                        </Chip>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-foreground/70">文件大小：</span>
                        <span className="font-medium">{(model.size / (1024*1024)).toFixed(2)} MB</span>
                      </div>
                      <div>
                        <span className="text-foreground/70">模型类型：</span>
                        <span className="font-medium">{typeInfo.label}</span>
                      </div>
                      <div>
                        <span className="text-foreground/70">上传时间：</span>
                        <span className="font-medium">{new Date(model.mtime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 应用按钮 */}
          <div className="flex justify-center pt-2">
            <Button
              color="primary"
              size="lg"
              isLoading={isApplying}
              isDisabled={!selectedModel || !selectedType || detectionStatus.isActive}
              onPress={applyModel}
              startContent={!isApplying && <Play className="w-5 h-5" />}
              className="px-8"
            >
              {isApplying ? '正在应用模型...' : '应用模型并启动检测'}
            </Button>
          </div>

          {/* 提示信息 */}
          <div className="text-center text-sm text-foreground/60">
            <p>点击"应用模型"将自动切换到选定的YOLO模型并启动实时检测</p>
            <p>检测过程将在Tello无人机视频流上实时进行</p>
          </div>
        </div>
      </CardBody>

      {/* 上传模型模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>
            <h3 className="text-xl font-bold">上传YOLO模型</h3>
          </ModalHeader>
          <ModalBody>
            <div className="text-center py-8">
              <Upload className="w-16 h-16 mx-auto mb-4 text-foreground/50" />
              <p className="text-lg font-medium mb-2">拖拽或点击上传模型文件</p>
              <p className="text-sm text-foreground/70 mb-4">支持 .pt 格式的YOLO模型文件</p>
              <Button color="primary" variant="flat">
                选择文件
              </Button>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              取消
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}