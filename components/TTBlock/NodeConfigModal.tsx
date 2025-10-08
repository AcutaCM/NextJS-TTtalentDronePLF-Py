import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea, Select, SelectItem, Switch, Slider } from "@heroui/react";
import { BlockNodeDefinition, BlockNodeParameter } from './blockNodes';

interface NodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeConfig: {
    id: string;
    type: string;
    label: string;
    parameters: Record<string, any>;
  } | null;
  onSave: (config: any) => void;
  nodeDefinition?: BlockNodeDefinition;
}

const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  nodeConfig, 
  onSave,
  nodeDefinition
}) => {
  const [localConfig, setLocalConfig] = useState<Record<string, any>>({});
  const [nodeLabel, setNodeLabel] = useState('');

  // 初始化配置
  useEffect(() => {
    if (nodeConfig) {
      setLocalConfig(nodeConfig.parameters || {});
      setNodeLabel(nodeConfig.label || '');
    } else {
      setLocalConfig({});
      setNodeLabel('');
    }
  }, [nodeConfig]);

  const handleSave = () => {
    if (nodeConfig) {
      onSave({
        id: nodeConfig.id,
        label: nodeLabel,
        parameters: localConfig
      });
      onClose();
    }
  };

  const handleParameterChange = (name: string, value: any) => {
    setLocalConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!nodeConfig || !nodeDefinition) {
    return null;
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="2xl"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: nodeDefinition.color }}></div>
            <span>配置节点: {nodeDefinition.label}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* 节点标签 */}
            <div>
              <label className="block text-sm font-medium mb-2">节点标签</label>
              <Input
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                placeholder="输入节点标签"
              />
            </div>

            {/* 参数配置 */}
            {nodeDefinition.parameters && nodeDefinition.parameters.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-4">参数配置</h3>
                <div className="space-y-4">
                  {nodeDefinition.parameters.map((param) => (
                    <div key={param.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium">
                          {param.label}
                          {param.description && (
                            <span className="ml-2 text-xs text-gray-500" title={param.description}>
                              (i)
                            </span>
                          )}
                        </label>
                      </div>
                      
                      {param.type === 'text' && (
                        <Input
                          value={localConfig[param.name] ?? param.defaultValue ?? ''}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          placeholder={param.description}
                        />
                      )}
                      
                      {param.type === 'number' && (
                        <Input
                          type="number"
                          value={localConfig[param.name] ?? param.defaultValue ?? ''}
                          onChange={(e) => handleParameterChange(param.name, Number(e.target.value))}
                          min={param.min}
                          max={param.max}
                          placeholder={param.description}
                        />
                      )}
                      
                      {param.type === 'boolean' && (
                        <Switch
                          isSelected={localConfig[param.name] ?? param.defaultValue ?? false}
                          onValueChange={(value) => handleParameterChange(param.name, value)}
                        >
                          {param.description}
                        </Switch>
                      )}
                      
                      {param.type === 'select' && param.options && (
                        <Select
                          selectedKeys={[String(localConfig[param.name] ?? param.defaultValue ?? '')]}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as string;
                            handleParameterChange(param.name, value);
                          }}
                        >
                          {param.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </Select>
                      )}
                      
                      {param.type === 'slider' && (
                        <div className="space-y-2">
                          <Slider
                            size="sm"
                            step={param.step ?? 1}
                            maxValue={param.max ?? 100}
                            minValue={param.min ?? 0}
                            value={localConfig[param.name] ?? param.defaultValue ?? 0}
                            onChange={(value) => handleParameterChange(param.name, value)}
                            className="max-w-md"
                          />
                          <div className="text-sm text-gray-500">
                            当前值: {localConfig[param.name] ?? param.defaultValue ?? 0}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!nodeDefinition.parameters || nodeDefinition.parameters.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                该节点没有可配置的参数
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose}>
            取消
          </Button>
          <Button color="primary" onPress={handleSave}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default NodeConfigModal;