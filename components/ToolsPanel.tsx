import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Switch } from "@heroui/switch";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { useDisclosure } from "@heroui/use-disclosure";

interface ToolsPanelProps {
  isConnected: boolean;
  onGenerateQR: (config: QRConfig) => void;
  onResetQR: () => void;
  onCalibrateCamera: () => void;
  onResetSystem: () => void;
  onOpenWorkflowEditor?: () => void;
}

interface QRConfig {
  content: string;
  size: number;
  errorCorrection: string;
  border: number;
  format: string;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  isConnected,
  onGenerateQR,
  onResetQR,
  onCalibrateCamera,
  onResetSystem,
  onOpenWorkflowEditor,
}) => {
  const [qrContent, setQrContent] = useState("Tello Drone Challenge Card");
  const [qrSize, setQrSize] = useState("200");
  const [errorCorrection, setErrorCorrection] = useState("M");
  const [border, setBorder] = useState("4");
  const [format, setFormat] = useState("PNG");
  const [includeText, setIncludeText] = useState(true);
  
  const { isOpen: isQRModalOpen, onOpen: onQRModalOpen, onClose: onQRModalClose } = useDisclosure();
  const { isOpen: isResetModalOpen, onOpen: onResetModalOpen, onClose: onResetModalClose } = useDisclosure();

  const errorCorrectionLevels = [
    { key: "L", label: "L (低 ~7%)" },
    { key: "M", label: "M (中 ~15%)" },
    { key: "Q", label: "Q (四分之一 ~25%)" },
    { key: "H", label: "H (高 ~30%)" },
  ];

  const formats = [
    { key: "PNG", label: "PNG" },
    { key: "JPG", label: "JPG" },
    { key: "SVG", label: "SVG" },
  ];

  const handleGenerateQR = () => {
    const config: QRConfig = {
      content: qrContent,
      size: parseInt(qrSize) || 200,
      errorCorrection,
      border: parseInt(border) || 4,
      format,
    };
    onGenerateQR(config);
    onQRModalClose();
  };

  const handleResetSystem = () => {
    onResetSystem();
    onResetModalClose();
  };

  const isValidQRSize = parseInt(qrSize) >= 50 && parseInt(qrSize) <= 1000;
  const isValidBorder = parseInt(border) >= 0 && parseInt(border) <= 20;
  const isQRFormValid = qrContent.trim() && isValidQRSize && isValidBorder;

  return (
    <>
      <Card className="h-full bg-black/40 border border-white/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col w-full">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <i className="fas fa-tools text-yellow-400"></i>
              工具
            </h3>
            <p className="text-white/70 text-sm">Tools</p>
          </div>
        </CardHeader>
        <Divider className="bg-white/20" />
        <CardBody className="space-y-4">
          {/* 工作流工具 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-project-diagram text-purple-400"></i>
              工作流工具
            </h4>
            
            <button
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg border-0 cursor-pointer transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
              style={{
                backgroundColor: '#9333ea',
                color: 'white',
                opacity: '1',
                cursor: 'pointer',
                border: 'none'
              }}
              onClick={() => {
                console.log('Tello工作流面板按钮被点击');
                if (onOpenWorkflowEditor) {
                  onOpenWorkflowEditor();
                } else {
                  console.error('onOpenWorkflowEditor 函数未定义');
                }
              }}
              type="button"
            >
              <i className="fas fa-play"></i>
              打开工作流编辑器
            </button>
          </div>

          {/* 二维码工具 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-qrcode text-blue-400"></i>
              二维码工具
            </h4>
            
            <div className="space-y-2">
              <Button
                className="w-full bg-blue-600/80 hover:bg-blue-600 text-white"
                onPress={onQRModalOpen}
                isDisabled={!isConnected}
                startContent={<i className="fas fa-plus"></i>}
              >
                生成二维码
              </Button>
              
              <Button
                className="w-full bg-orange-600/80 hover:bg-orange-600 text-white"
                onPress={onResetQR}
                isDisabled={!isConnected}
                startContent={<i className="fas fa-undo"></i>}
              >
                重置二维码
              </Button>
            </div>
          </div>

          {/* 相机工具 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-camera text-green-400"></i>
              相机工具
            </h4>
            
            <Button
              className="w-full bg-green-600/80 hover:bg-green-600 text-white"
              onPress={onCalibrateCamera}
              isDisabled={!isConnected}
              startContent={<i className="fas fa-crosshairs"></i>}
            >
              相机校准
            </Button>
          </div>

          {/* 系统工具 */}
          <div className="space-y-3">
            <h4 className="text-white font-medium text-sm flex items-center gap-2">
              <i className="fas fa-cog text-red-400"></i>
              系统工具
            </h4>
            
            <Button
              className="w-full bg-red-600/80 hover:bg-red-600 text-white"
              onPress={onResetModalOpen}
              isDisabled={!isConnected}
              startContent={<i className="fas fa-power-off"></i>}
            >
              系统重置
            </Button>
          </div>

          {/* 工具说明 */}
          <div className="mt-4">
            <h4 className="text-white font-medium text-sm mb-2">
              <i className="fas fa-info-circle mr-2 text-yellow-400"></i>
              工具说明:
            </h4>
            <ul className="text-xs text-white/70 space-y-1 pl-4">
              <li>• 积木编程：可视化任务编排</li>
              <li>• 二维码生成：创建挑战卡识别码</li>
              <li>• 相机校准：优化图像识别精度</li>
              <li>• 系统重置：恢复默认设置</li>
              <li>• 部分操作需要连接无人机</li>
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* 二维码生成模态框 */}
      <Modal isOpen={isQRModalOpen} onClose={onQRModalClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold">生成二维码</h3>
            <p className="text-sm text-gray-500">配置二维码参数</p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="二维码内容"
                placeholder="输入要编码的内容"
                value={qrContent}
                onValueChange={setQrContent}
                description="将被编码到二维码中的文本内容"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="尺寸 (像素)"
                  placeholder="50-1000"
                  value={qrSize}
                  onValueChange={setQrSize}
                  color={isValidQRSize ? "default" : "danger"}
                  description="二维码图像尺寸"
                />
                
                <Input
                  label="边框宽度"
                  placeholder="0-20"
                  value={border}
                  onValueChange={setBorder}
                  color={isValidBorder ? "default" : "danger"}
                  description="二维码周围的边框"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="容错级别"
                  selectedKeys={[errorCorrection]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setErrorCorrection(selected);
                  }}
                >
                  {errorCorrectionLevels.map((level) => (
                    <SelectItem key={level.key}>
                      {level.label}
                    </SelectItem>
                  ))}
                </Select>
                
                <Select
                  label="输出格式"
                  selectedKeys={[format]}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0] as string;
                    setFormat(selected);
                  }}
                >
                  {formats.map((fmt) => (
                    <SelectItem key={fmt.key}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              
              <Switch
                isSelected={includeText}
                onValueChange={setIncludeText}
                color="primary"
              >
                <span className="text-sm">在二维码下方包含文本</span>
              </Switch>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onQRModalClose}>
              取消
            </Button>
            <Button 
              color="primary" 
              onPress={handleGenerateQR}
              isDisabled={!isQRFormValid}
            >
              生成二维码
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 系统重置确认模态框 */}
      <Modal isOpen={isResetModalOpen} onClose={onResetModalClose}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-red-600">系统重置</h3>
            <p className="text-sm text-gray-500">此操作将重置所有设置</p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-exclamation-triangle text-red-500 mt-1 mr-3"></i>
                  <div>
                    <h4 className="text-red-800 font-medium">警告</h4>
                    <p className="text-red-700 text-sm mt-1">
                      系统重置将执行以下操作：
                    </p>
                    <ul className="text-red-700 text-sm mt-2 space-y-1">
                      <li>• 重置所有配置参数</li>
                      <li>• 清除缓存数据</li>
                      <li>• 断开无人机连接</li>
                      <li>• 恢复默认设置</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm">
                此操作不可撤销，请确认您要继续。
              </p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="default" variant="light" onPress={onResetModalClose}>
              取消
            </Button>
            <Button color="danger" onPress={handleResetSystem}>
              确认重置
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ToolsPanel;