'use client';

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Button } from '@heroui/button';
import { Divider } from '@heroui/divider';
import { Chip } from '@heroui/chip';
import { Code } from '@heroui/code';
import { Tabs, Tab } from '@heroui/tabs';
import EnhancedModelSelector from './EnhancedModelSelector';

export default function ModelSelectorDemo() {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const handleModelChange = (modelName: string, modelType: string) => {
    setSelectedModel(modelName);
    setSelectedType(modelType);
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] 模型已切换: ${modelName} (${modelType})`;
    setLogs(prev => [logEntry, ...prev.slice(0, 9)]); // 保留最近10条日志
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题区域 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">
            YOLO模型选择器演示
          </h1>
          <p className="text-lg text-foreground/70">
            智能模型选择和实时切换界面展示
          </p>
        </div>

        {/* 功能特性卡片 */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
          <CardHeader>
            <h2 className="text-2xl font-semibold">✨ 主要功能特性</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>清晰展示所有可选模型列表</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>下拉菜单模型选择</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>一键应用模型按钮</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>无缝实时模型切换</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>当前模型状态显示</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <span className="text-success">✓</span>
                </div>
                <span>模型性能指标展示</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 当前状态显示 */}
        <Card className="bg-content1">
          <CardHeader>
            <h3 className="text-xl font-semibold">📊 当前状态</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">选中的模型</h4>
                {selectedModel ? (
                  <Chip color="primary" variant="flat" size="lg">
                    {selectedModel}
                  </Chip>
                ) : (
                  <span className="text-foreground/50">未选择模型</span>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">检测类型</h4>
                {selectedType ? (
                  <Chip color="secondary" variant="flat" size="lg">
                    {selectedType}
                  </Chip>
                ) : (
                  <span className="text-foreground/50">未选择类型</span>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* 演示界面 */}
        <Tabs aria-label="模型选择器演示" className="w-full">
          <Tab key="full" title="完整版界面">
            <Card>
              <CardBody className="p-6">
                <EnhancedModelSelector 
                  onModelChange={handleModelChange}
                  showUpload={true}
                  compactMode={false}
                />
              </CardBody>
            </Card>
          </Tab>
          
          <Tab key="compact" title="紧凑版界面">
            <Card>
              <CardBody className="p-6">
                <EnhancedModelSelector 
                  onModelChange={handleModelChange}
                  showUpload={false}
                  compactMode={true}
                />
              </CardBody>
            </Card>
          </Tab>

          <Tab key="logs" title="操作日志">
            <Card>
              <CardHeader className="flex justify-between">
                <h3 className="text-lg font-semibold">操作日志</h3>
                <Button 
                  size="sm" 
                  variant="flat" 
                  onPress={clearLogs}
                  isDisabled={logs.length === 0}
                >
                  清空日志
                </Button>
              </CardHeader>
              <CardBody>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-foreground/50">
                    <p>暂无操作日志</p>
                    <p className="text-sm mt-2">请在上方选择并应用模型来查看日志</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((log, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-content2 rounded-lg border border-divider"
                      >
                        <Code className="text-sm">{log}</Code>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </Tab>

          <Tab key="api" title="API接口">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">相关API接口</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">获取模型列表</h4>
                  <Code color="primary">GET /api/models/list</Code>
                  <p className="text-sm text-foreground/70 mt-1">
                    获取所有可用的YOLO模型文件列表
                  </p>
                </div>
                
                <Divider />
                
                <div>
                  <h4 className="font-medium mb-2">应用模型</h4>
                  <Code color="secondary">POST /api/models/apply</Code>
                  <p className="text-sm text-foreground/70 mt-1">
                    切换到指定的YOLO模型
                  </p>
                  <div className="mt-2 p-3 bg-content2 rounded-lg">
                    <Code className="text-xs">
{`{
  "name": "strawberry_yolov11.pt",
  "type": "maturity"
}`}
                    </Code>
                  </div>
                </div>
                
                <Divider />
                
                <div>
                  <h4 className="font-medium mb-2">启动检测</h4>
                  <Code color="success">POST /api/models/start-detection</Code>
                  <p className="text-sm text-foreground/70 mt-1">
                    启动实时检测服务
                  </p>
                </div>
                
                <Divider />
                
                <div>
                  <h4 className="font-medium mb-2">获取检测状态</h4>
                  <Code color="warning">GET /api/models/status</Code>
                  <p className="text-sm text-foreground/70 mt-1">
                    获取当前检测状态和性能指标
                  </p>
                </div>
                
                <Divider />
                
                <div>
                  <h4 className="font-medium mb-2">停止检测</h4>
                  <Code color="danger">POST /api/models/stop-detection</Code>
                  <p className="text-sm text-foreground/70 mt-1">
                    停止当前的检测服务
                  </p>
                </div>
              </CardBody>
            </Card>
          </Tab>
        </Tabs>

        {/* 使用说明 */}
        <Card className="bg-content1">
          <CardHeader>
            <h3 className="text-xl font-semibold">📖 使用说明</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 text-primary">1. 选择模型</h4>
                <p className="text-sm text-foreground/70">
                  从下拉菜单中选择要使用的YOLO模型文件。系统会显示模型的类型、大小和预估准确率。
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-secondary">2. 选择检测类型</h4>
                <p className="text-sm text-foreground/70">
                  根据检测需求选择相应的类型：成熟度检测、病害检测或通用检测。
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-success">3. 应用模型</h4>
                <p className="text-sm text-foreground/70">
                  点击"应用模型"按钮，系统将自动切换到选定的模型并启动实时检测。
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-warning">4. 监控状态</h4>
                <p className="text-sm text-foreground/70">
                  界面会实时显示当前使用的模型、检测状态、FPS和检测对象数量。
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}