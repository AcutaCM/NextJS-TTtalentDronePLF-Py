import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { Textarea } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { useDisclosure } from "@heroui/use-disclosure";
import { Chip } from "@heroui/chip";

interface ConfigurationPanelProps {
  isConnected: boolean;
  onSaveConfig: (config: AIConfig) => void;
  onTestAI: () => void;
  onLoadConfig: () => void;
  onExportConfig: () => void;
  currentConfig?: AIConfig;
}

interface AIConfig {
  apiKey: string;
  appId: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableLogging: boolean;
  autoRetry: boolean;
  retryCount: number;
  timeout: number;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  isConnected,
  onSaveConfig,
  onTestAI,
  onLoadConfig,
  onExportConfig,
  currentConfig,
}) => {
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || "");
  const [appId, setAppId] = useState(currentConfig?.appId || "");
  const [model, setModel] = useState(currentConfig?.model || "gpt-4-vision-preview");
  const [temperature, setTemperature] = useState(currentConfig?.temperature?.toString() || "0.7");
  const [maxTokens, setMaxTokens] = useState(currentConfig?.maxTokens?.toString() || "1000");
  const [systemPrompt, setSystemPrompt] = useState(
    currentConfig?.systemPrompt || 
    "你是一个专业的农业AI助手，专门分析草莓的成熟度。请严格遵守以下要求：\n\n1. 必须使用中文回复，绝对不要使用英文或其他语言\n2. 仔细观察图像中的草莓，根据颜色、形状和大小判断其成熟程度\n3. 提供详细的分析结果和建议\n4. 回复必须专业、准确、易懂\n\n重要提醒：无论什么情况下都必须用中文回复！"
  );
  const [enableLogging, setEnableLogging] = useState(currentConfig?.enableLogging ?? true);
  const [autoRetry, setAutoRetry] = useState(currentConfig?.autoRetry ?? true);
  const [retryCount, setRetryCount] = useState(currentConfig?.retryCount?.toString() || "3");
  const [timeout, setTimeout] = useState(currentConfig?.timeout?.toString() || "30");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const { isOpen: isConfigModalOpen, onOpen: onConfigModalOpen, onClose: onConfigModalClose } = useDisclosure();

  const models = [
    { key: "gpt-4-vision-preview", label: "GPT-4 Vision Preview" },
    { key: "gpt-4", label: "GPT-4" },
    { key: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { key: "claude-3-opus", label: "Claude 3 Opus" },
    { key: "claude-3-sonnet", label: "Claude 3 Sonnet" },
    { key: "gemini-pro-vision", label: "Gemini Pro Vision" },
  ];

  const handleSaveConfig = () => {
    const config: AIConfig = {
      apiKey,
      appId,
      model,
      temperature: parseFloat(temperature) || 0.7,
      maxTokens: parseInt(maxTokens) || 1000,
      systemPrompt,
      enableLogging,
      autoRetry,
      retryCount: parseInt(retryCount) || 3,
      timeout: parseInt(timeout) || 30,
    };
    onSaveConfig(config);
    onConfigModalClose();
  };

  const handleTestAI = async () => {
    setTestStatus("testing");
    setTestMessage("正在测试AI连接...");
    
    try {
      await onTestAI();
      setTestStatus("success");
      setTestMessage("AI测试成功！");
    } catch (error) {
      setTestStatus("error");
      setTestMessage("AI测试失败，请检查配置。");
    }
    
    window.setTimeout(() => {
      setTestStatus("idle");
      setTestMessage("");
    }, 3000);
  };

  const isValidTemperature = parseFloat(temperature) >= 0 && parseFloat(temperature) <= 2;
  const isValidMaxTokens = parseInt(maxTokens) >= 1 && parseInt(maxTokens) <= 4000;
  const isValidRetryCount = parseInt(retryCount) >= 0 && parseInt(retryCount) <= 10;
  const isValidTimeout = parseInt(timeout) >= 5 && parseInt(timeout) <= 300;
  const isFormValid = apiKey.trim() && appId.trim() && systemPrompt.trim() && 
                     isValidTemperature && isValidMaxTokens && isValidRetryCount && isValidTimeout;

  return (
    <>
      <Card className="h-full bg-black/40 border border-white/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col w-full">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <i className="fas fa-cogs text-blue-400"></i>
              配置管理
            </h3>
            <p className="text-white/70 text-sm">Configuration Management</p>
          </div>
        </CardHeader>
        <Divider className="bg-white/20" />
        <CardBody className="space-y-4">
          {/* AI配置 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-brain text-purple-400"></i>
              AI 配置
            </h4>
            
            <div className="space-y-2">
              <Button
                className="w-full bg-purple-600/80 hover:bg-purple-600 text-white"
                onPress={onConfigModalOpen}
                isDisabled={!isConnected}
                startContent={<i className="fas fa-edit"></i>}
              >
                AI 配置
              </Button>
              
              <Button
                className="w-full bg-blue-600/80 hover:bg-blue-600 text-white"
                onPress={handleTestAI}
                isDisabled={!isConnected || testStatus === "testing"}
                startContent={
                  testStatus === "testing" ? 
                  <i className="fas fa-spinner fa-spin"></i> : 
                  <i className="fas fa-flask"></i>
                }
              >
                {testStatus === "testing" ? "测试中..." : "测试 AI"}
              </Button>
            </div>
            
            {/* 测试状态显示 */}
            {testStatus !== "idle" && (
              <div className="flex items-center justify-between">
                <span className="text-white/80 text-sm">测试状态:</span>
                <Chip 
                  color={testStatus === "success" ? "success" : testStatus === "error" ? "danger" : "primary"}
                  variant="flat"
                  size="sm"
                >
                  {testMessage}
                </Chip>
              </div>
            )}
          </div>

          {/* 配置文件管理 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-file-alt text-green-400"></i>
              配置文件
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="bg-green-600/80 hover:bg-green-600 text-white"
                onPress={onLoadConfig}
                isDisabled={!isConnected}
                startContent={<i className="fas fa-upload"></i>}
                size="sm"
              >
                加载配置
              </Button>
              
              <Button
                className="bg-orange-600/80 hover:bg-orange-600 text-white"
                onPress={onExportConfig}
                isDisabled={!isConnected}
                startContent={<i className="fas fa-download"></i>}
                size="sm"
              >
                导出配置
              </Button>
            </div>
          </div>

          {/* 当前配置状态 */}
          {currentConfig && (
            <div className="space-y-3">
              <h4 className="text-white font-medium text-sm flex items-center gap-2">
                <i className="fas fa-info-circle text-blue-400"></i>
                当前配置
              </h4>
              
              <div className="bg-white/10 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/60">模型:</span>
                  <span className="text-white">{currentConfig.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">温度:</span>
                  <span className="text-white">{currentConfig.temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">最大令牌:</span>
                  <span className="text-white">{currentConfig.maxTokens}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">自动重试:</span>
                  <span className="text-white">{currentConfig.autoRetry ? "是" : "否"}</span>
                </div>
              </div>
            </div>
          )}

          {/* 配置说明 */}
          <div className="mt-4">
            <h4 className="text-white font-medium text-sm mb-2">
              <i className="fas fa-lightbulb mr-2 text-yellow-400"></i>
              配置说明:
            </h4>
            <ul className="text-xs text-white/70 space-y-1 pl-4">
              <li>• API Key: AI服务的访问密钥</li>
              <li>• 应用ID: 应用程序标识符</li>
              <li>• 模型: 选择合适的AI模型</li>
              <li>• 温度: 控制输出的随机性(0-2)</li>
              <li>• 系统提示: 定义AI的行为和角色</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* AI配置模态框 */}
      <Modal isOpen={isConfigModalOpen} onClose={onConfigModalClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold">AI 配置</h3>
            <p className="text-sm text-gray-500">配置AI服务参数</p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 基础配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">基础配置</h4>
                
                <Input
                  label="API Key"
                  placeholder="输入您的API密钥"
                  value={apiKey}
                  onValueChange={setApiKey}
                  type="password"
                  description="AI服务的访问密钥"
                  isRequired
                />
                
                <Input
                  label="应用 ID"
                  placeholder="输入应用程序ID"
                  value={appId}
                  onValueChange={setAppId}
                  description="应用程序标识符"
                  isRequired
                />
                
                <Select
                  label="AI 模型"
                  selectedKeys={[model]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setModel(selected);
                  }}
                  description="选择要使用的AI模型"
                >
                  {models.map((mdl) => (
                    <SelectItem key={mdl.key}>
                      {mdl.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              
              {/* 高级配置 */}
              <div className="space-y-4">
                <h4 className="font-medium text-lg">高级配置</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="温度"
                    placeholder="0.0-2.0"
                    value={temperature}
                    onValueChange={setTemperature}
                    color={isValidTemperature ? "default" : "danger"}
                    description="控制输出随机性"
                  />
                  
                  <Input
                    label="最大令牌数"
                    placeholder="1-4000"
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    color={isValidMaxTokens ? "default" : "danger"}
                    description="最大输出长度"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="重试次数"
                    placeholder="0-10"
                    value={retryCount}
                    onValueChange={setRetryCount}
                    color={isValidRetryCount ? "default" : "danger"}
                    description="失败时重试次数"
                  />
                  
                  <Input
                    label="超时时间 (秒)"
                    placeholder="5-300"
                    value={timeout}
                    onValueChange={setTimeout}
                    color={isValidTimeout ? "default" : "danger"}
                    description="请求超时时间"
                  />
                </div>
                
                <Textarea
                  label="系统提示词"
                  placeholder="输入系统提示词..."
                  value={systemPrompt}
                  onValueChange={setSystemPrompt}
                  minRows={4}
                  maxRows={8}
                  description="定义AI的行为和角色"
                  isRequired
                />
                
                <div className="space-y-3">
                  <Switch
                    isSelected={enableLogging}
                    onValueChange={setEnableLogging}
                    color="primary"
                  >
                    <span className="text-sm">启用日志记录</span>
                  </Switch>
                  
                  <Switch
                    isSelected={autoRetry}
                    onValueChange={setAutoRetry}
                    color="primary"
                  >
                    <span className="text-sm">启用自动重试</span>
                  </Switch>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onConfigModalClose}>
              取消
            </Button>
            <Button 
              color="primary" 
              onPress={handleSaveConfig}
              isDisabled={!isFormValid}
            >
              保存配置
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ConfigurationPanel;