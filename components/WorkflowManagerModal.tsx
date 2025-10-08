'use client';

import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { ScrollShadow } from "@heroui/scroll-shadow";
import { Divider } from "@heroui/divider";
import toast from 'react-hot-toast';

interface SavedWorkflow {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
}

interface WorkflowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadWorkflow: (workflow: SavedWorkflow) => void;
}

const WorkflowManagerModal: React.FC<WorkflowManagerModalProps> = ({
  isOpen,
  onClose,
  onLoadWorkflow
}) => {
  const [savedWorkflows, setSavedWorkflows] = useState<SavedWorkflow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<SavedWorkflow | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedWorkflows();
    }
  }, [isOpen]);

  const loadSavedWorkflows = () => {
    try {
      const saved = localStorage.getItem('tello_workflows');
      if (saved) {
        const workflows = JSON.parse(saved);
        setSavedWorkflows(workflows);
      }
    } catch (error) {
      console.error('加载工作流失败:', error);
      toast.error('加载保存的工作流失败');
    }
  };

  const deleteWorkflow = (workflowId: string) => {
    try {
      const updatedWorkflows = savedWorkflows.filter(w => w.id !== workflowId);
      setSavedWorkflows(updatedWorkflows);
      localStorage.setItem('tello_workflows', JSON.stringify(updatedWorkflows));
      toast.success('工作流已删除');
    } catch (error) {
      console.error('删除工作流失败:', error);
      toast.error('删除工作流失败');
    }
  };

  const handleLoadWorkflow = (workflow: SavedWorkflow) => {
    onLoadWorkflow(workflow);
    onClose();
    toast.success(`已加载工作流: ${workflow.name}`);
  };

  const exportWorkflow = (workflow: SavedWorkflow) => {
    try {
      const dataStr = JSON.stringify(workflow, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workflow.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('工作流已导出');
    } catch (error) {
      console.error('导出工作流失败:', error);
      toast.error('导出工作流失败');
    }
  };

  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string);
        workflow.id = Date.now().toString();
        workflow.timestamp = new Date().toISOString();
        
        const updatedWorkflows = [...savedWorkflows, workflow];
        setSavedWorkflows(updatedWorkflows);
        localStorage.setItem('tello_workflows', JSON.stringify(updatedWorkflows));
        toast.success('工作流导入成功');
      } catch (error) {
        console.error('导入工作流失败:', error);
        toast.error('导入工作流失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const filteredWorkflows = savedWorkflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (workflow.description && workflow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-xl font-bold">工作流管理器</h3>
          <p className="text-sm text-gray-500">管理已保存的 Tello 工作流</p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* 搜索和操作栏 */}
            <div className="flex gap-2">
              <Input
                placeholder="搜索工作流..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                startContent={<i className="fas fa-search text-gray-400"></i>}
              />
              <Button
                color="primary"
                variant="bordered"
                onPress={() => document.getElementById('import-input')?.click()}
                startContent={<i className="fas fa-upload"></i>}
              >
                导入
              </Button>
              <input
                id="import-input"
                type="file"
                accept=".json"
                onChange={importWorkflow}
                style={{ display: 'none' }}
              />
            </div>

            {/* 工作流列表 */}
            <ScrollShadow className="h-96">
              {filteredWorkflows.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-folder-open text-4xl mb-4"></i>
                  <p>暂无保存的工作流</p>
                  <p className="text-sm">创建并保存工作流后，它们将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredWorkflows.map((workflow) => (
                    <Card 
                      key={workflow.id} 
                      className={`cursor-pointer transition-all ${
                        selectedWorkflow?.id === workflow.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-gray-50'
                      }`}
                      isPressable
                      onPress={() => setSelectedWorkflow(workflow)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start w-full">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{workflow.name}</h4>
                            {workflow.description && (
                              <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              color="primary"
                              onPress={() => handleLoadWorkflow(workflow)}
                              startContent={<i className="fas fa-play"></i>}
                            >
                              加载
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              color="secondary"
                              onPress={() => exportWorkflow(workflow)}
                              startContent={<i className="fas fa-download"></i>}
                            >
                              导出
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => deleteWorkflow(workflow.id)}
                              startContent={<i className="fas fa-trash"></i>}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <i className="fas fa-circle-nodes"></i>
                            <span>{workflow.nodeCount} 个节点</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <i className="fas fa-link"></i>
                            <span>{workflow.edgeCount} 个连接</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <i className="fas fa-clock"></i>
                            <span>{new Date(workflow.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                        
                        {/* 节点预览 */}
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {workflow.nodes.slice(0, 8).map((node, index) => (
                              <Chip key={index} size="sm" variant="flat" color="primary">
                                {node.data.label}
                              </Chip>
                            ))}
                            {workflow.nodes.length > 8 && (
                              <Chip size="sm" variant="flat" color="default">
                                +{workflow.nodes.length - 8} 更多
                              </Chip>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollShadow>

            {/* 选中工作流的详细信息 */}
            {selectedWorkflow && (
              <>
                <Divider />
                <div className="space-y-2">
                  <h5 className="font-semibold">工作流详情</h5>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div><strong>名称:</strong> {selectedWorkflow.name}</div>
                      <div><strong>创建时间:</strong> {new Date(selectedWorkflow.timestamp).toLocaleString()}</div>
                      <div><strong>节点数量:</strong> {selectedWorkflow.nodeCount}</div>
                      <div><strong>连接数量:</strong> {selectedWorkflow.edgeCount}</div>
                    </div>
                    {selectedWorkflow.description && (
                      <div className="mt-2">
                        <strong>描述:</strong> {selectedWorkflow.description}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            关闭
          </Button>
          {selectedWorkflow && (
            <Button 
              color="primary" 
              onPress={() => handleLoadWorkflow(selectedWorkflow)}
              startContent={<i className="fas fa-play"></i>}
            >
              加载选中的工作流
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default WorkflowManagerModal;