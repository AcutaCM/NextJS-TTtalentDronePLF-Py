'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Chip } from '@heroui/chip';
import { Progress } from '@heroui/progress';
import { Divider } from '@heroui/divider';
import { Badge } from '@heroui/badge';
import { Tooltip } from '@heroui/tooltip';
import { Upload, Play, Square, Eye, Zap } from 'lucide-react';

type ModelItem = {
  name: string;
  size: number;
  mtime: number;
};

type DetectionStatus = {
  isActive: boolean;
  modelName: string;
  detectionType: string;
  fps: number;
  objectCount: number;
};

export default function ModelManagerPanel({ className }: { className?: string }) {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>({
    isActive: false,
    modelName: '',
    detectionType: '',
    fps: 0,
    objectCount: 0
  });
  const [applyingModel, setApplyingModel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    try {
      const res = await fetch('/api/models/list', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) setModels(data.models);
    } catch (error) {
      console.error('Failed to refresh models:', error);
    }
  }

  // 获取检测状态
  async function refreshDetectionStatus() {
    try {
      const res = await fetch('/api/models/status', { cache: 'no-store' });
      const data = await res.json();
      if (data.ok) {
        setDetectionStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to get detection status:', error);
    }
  }

  useEffect(() => {
    refresh();
    refreshDetectionStatus();
    
    // 定期更新检测状态
    const interval = setInterval(refreshDetectionStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.pt')) {
      setMessage('仅支持 .pt 文件');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name);
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/models/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✅ 上传并验证通过：${data.name}`);
        await refresh();
      } else {
        setMessage(`❌ 上传失败：${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      setMessage(`❌ 上传错误：${err.message || String(err)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function applyModel(name: string, detectionType: string) {
    setMessage(null);
    setApplyingModel(name);
    try {
      // 1. 应用模型
      const applyRes = await fetch('/api/models/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type: detectionType })
      });
      const applyData = await applyRes.json();
      
      if (!applyData.ok) {
        throw new Error(applyData.error || '模型应用失败');
      }

      // 2. 启动视频流和检测
      const startRes = await fetch('/api/models/start-detection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName: name, detectionType })
      });
      const startData = await startRes.json();
      
      if (!startData.ok) {
        throw new Error(startData.error || '检测启动失败');
      }

      setMessage(`🚀 检测已启动：${name} (${detectionType})`);
      await refreshDetectionStatus();
      
    } catch (err: any) {
      setMessage(`❌ 应用错误：${err.message || String(err)}`);
    } finally {
      setApplyingModel(null);
    }
  }

  async function stopDetection() {
    try {
      const res = await fetch('/api/models/stop-detection', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMessage('🛑 检测已停止');
        await refreshDetectionStatus();
      } else {
        setMessage(`❌ 停止失败：${data.error || '未知错误'}`);
      }
    } catch (err: any) {
      setMessage(`❌ 停止错误：${err.message || String(err)}`);
    }
  }

  const getModelTypeIcon = (name: string) => {
    if (name.includes('disease') || name.includes('病害')) return '🦠';
    if (name.includes('best') || name.includes('成熟') || name.includes('maturity')) return '🍓';
    return '🎯';
  };

  const getModelTypeLabel = (name: string) => {
    if (name.includes('disease') || name.includes('病害')) return '病害检测';
    if (name.includes('best') || name.includes('成熟') || name.includes('maturity')) return '成熟度检测';
    return '通用检测';
  };

  return (
    <Card className="bg-background/60 backdrop-blur-sm border border-divider w-full h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">YOLO 模型管理</h3>
              <p className="text-sm text-foreground/70">实时检测模型部署</p>
            </div>
          </div>
          <Button
            color="primary"
            variant="flat"
            size="sm"
            isLoading={uploading}
            onPress={() => fileInputRef.current?.click()}
            startContent={!uploading && <Upload className="w-4 h-4" />}
          >
            {uploading ? '上传中...' : '上传模型'}
          </Button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".pt" 
            className="hidden" 
            onChange={onUpload} 
            disabled={uploading} 
          />
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        {/* 检测状态显示 */}
        {detectionStatus.isActive && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-success">检测进行中</span>
              </div>
              <Button
                color="danger"
                variant="flat"
                size="sm"
                onPress={stopDetection}
                startContent={<Square className="w-3 h-3" />}
              >
                停止
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground/70">模型：</span>
                <span className="font-medium">{detectionStatus.modelName}</span>
              </div>
              <div>
                <span className="text-foreground/70">类型：</span>
                <span className="font-medium">{detectionStatus.detectionType}</span>
              </div>
              <div>
                <span className="text-foreground/70">FPS：</span>
                <span className="font-medium">{detectionStatus.fps}</span>
              </div>
              <div>
                <span className="text-foreground/70">检测数：</span>
                <span className="font-medium">{detectionStatus.objectCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* 消息显示 */}
        {message && (
          <div className="mb-4 p-3 bg-content2 rounded-lg">
            <p className="text-sm text-foreground">{message}</p>
          </div>
        )}

        <Divider className="mb-4" />

        {/* 模型列表 */}
        <div className="space-y-3">
          {models.length === 0 ? (
            <div className="text-center py-8 text-foreground/50">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无模型，请上传 .pt 文件</p>
            </div>
          ) : (
            models.map(model => (
              <div key={model.name} className="p-4 bg-content1 rounded-lg border border-divider">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getModelTypeIcon(model.name)}</span>
                    <div>
                      <h4 className="font-medium text-foreground">{model.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-foreground/70">
                        <span>{(model.size / (1024*1024)).toFixed(2)} MB</span>
                        <span>•</span>
                        <Chip size="sm" variant="flat" color="secondary">
                          {getModelTypeLabel(model.name)}
                        </Chip>
                      </div>
                    </div>
                  </div>
                  
                  {detectionStatus.isActive && detectionStatus.modelName === model.name ? (
                    <Badge content="运行中" color="success" variant="flat">
                      <Button
                        color="success"
                        variant="flat"
                        size="sm"
                        isDisabled
                        startContent={<Eye className="w-4 h-4" />}
                      >
                        检测中
                      </Button>
                    </Badge>
                  ) : (
                    <Tooltip content="启动实时检测">
                      <Button
                        color="primary"
                        variant="solid"
                        size="sm"
                        isLoading={applyingModel === model.name}
                        onPress={() => applyModel(model.name, getModelTypeLabel(model.name))}
                        startContent={!applyingModel && <Play className="w-4 h-4" />}
                      >
                        {applyingModel === model.name ? '启动中...' : '应用'}
                      </Button>
                    </Tooltip>
                  )}
                </div>
                
                {/* 模型详细信息 */}
                <div className="text-xs text-foreground/60">
                  <p>点击"应用"将自动启动Tello视频流并开始实时检测</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}