import React, { useRef, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Switch } from "@heroui/switch";
import { Slider } from "@nextui-org/react";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";

interface SimulationPanelProps {
  isConnected?: boolean;
  simulationActive?: boolean;
  onStartSimulation?: (config: SimulationConfig) => void;
  onStopSimulation?: () => void;
  simulationStats?: SimulationStats;
  sendMessage: (type: string, data?: any) => boolean;
}

interface SimulationConfig {
  mode: string;
  speed: number;
  accuracy: number;
  enableNoise: boolean;
  dataCount: number;
  autoGenerate: boolean;
}

interface SimulationStats {
  generatedSamples: number;
  detectionRate: number;
  averageAccuracy: number;
  processingTime: number;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({
  isConnected = false,
  simulationActive = false,
  onStartSimulation,
  onStopSimulation,
  simulationStats = {
    generatedSamples: 0,
    detectionRate: 0,
    averageAccuracy: 0,
    processingTime: 0,
  },
  sendMessage,
}) => {
  const [mode, setMode] = useState("strawberry_detection");
  const [speed, setSpeed] = useState(1.0);
  const [accuracy, setAccuracy] = useState(0.85);
  const [enableNoise, setEnableNoise] = useState(false);
  const [dataCount, setDataCount] = useState(100);
  const [autoGenerate, setAutoGenerate] = useState(true);

  // 图片上传模拟分析相关状态
  const [uploading, setUploading] = useState(false);
  const [selectedName, setSelectedName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const extractBase64 = (dataUrl: string) => {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex >= 0) return dataUrl.substring(commaIndex + 1);
    return dataUrl;
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSelectedName(file.name);
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          const base64 = extractBase64(dataUrl);
          // 发送到后端进行YOLO/AI分析；后端会广播 simulation_started 和 simulation_analysis_complete
          sendMessage('analyze_uploaded_frame', {
            image_data: base64,
            image_name: file.name,
            file_mode: true
          });
        } catch (err) {
          console.error('处理选择文件失败', err);
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        console.error('读取文件失败');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('选择文件异常', error);
      setUploading(false);
    }
  };

  const simulationModes = [
    { key: "strawberry_detection", label: "草莓检测模拟" },
    { key: "flight_path", label: "飞行路径模拟" },
    { key: "challenge_card", label: "挑战卡识别模拟" },
    { key: "ai_analysis", label: "AI分析模拟" },
    { key: "full_system", label: "完整系统模拟" },
  ];

  const handleStartSimulation = () => {
    const config: SimulationConfig = {
      mode,
      speed,
      accuracy,
      enableNoise,
      dataCount,
      autoGenerate,
    };
    onStartSimulation?.(config);
  };

  return (
    <Card className="h-full bg-black/40 border border-white/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <i className="fas fa-flask text-cyan-400"></i>
            模拟检测功能
          </h3>
          <p className="text-white/70 text-sm">Simulation Detection</p>
        </div>
      </CardHeader>
      <Divider className="bg-white/20" />
      <CardBody className="space-y-4">
        {/* 上传图片模拟分析 */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium mb-2 block">
            上传图片并执行 YOLO/AI 模拟分析
          </label>
          <div className="flex items-center gap-3">
            <Button
              className="bg-blue-600/80 hover:bg-blue-600 text-white"
              onPress={handlePickFile}
              isDisabled={uploading}
              startContent={<i className="fas fa-upload" />}
            >
              {uploading ? '正在上传分析...' : '上传图片模拟分析'}
            </Button>
            {selectedName ? (
              <span className="text-sm text-white/70">已选择: {selectedName}</span>
            ) : null}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <p className="text-white/50 text-xs">提示：后端会在开始与完成时分别推送 simulation_started 与 simulation_analysis_complete 日志和处理帧。</p>
        </div>

        {/* 新增：模拟QR码扫描 */}
        <div className="space-y-2">
          <label className="text-white text-sm font-medium mb-2 block">
            模拟 QR 码扫描事件
          </label>
          <Button
            className="bg-purple-600/80 hover:bg-purple-600 text-white"
            onPress={() => {
              const randomPlantId = `PLANT_${Math.floor(Math.random() * 100) + 1}`;
              sendMessage('qr_detected', {
                id: `qr-scan-${Date.now()}`,
                plantId: randomPlantId,
                size: '5x5',
                // A simple 1x1 white pixel base64 image for testing
                qrImage: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
              });
            }}
            startContent={<i className="fas fa-qrcode" />}
          >
            模拟二维码扫描
          </Button>
          <p className="text-white/50 text-xs">提示：这将直接触发一个 qr_detected 事件，用于测试 QRScanPanel。</p>
        </div>

        <Divider className="bg-white/10" />

        {/* 模拟模式选择 */}
        <Select
          label="模拟模式"
          placeholder="选择模拟模式"
          selectedKeys={[mode]}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            setMode(selected);
          }}
          isDisabled={simulationActive}
          className="w-full"
        >
          {simulationModes.map((simMode) => (
            <SelectItem key={simMode.key}>
              {simMode.label}
            </SelectItem>
          ))}
        </Select>

        {/* 模拟参数配置 */}
        <div className="space-y-4">
          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              模拟速度: {speed.toFixed(1)}x
            </label>
            <Slider
              value={speed}
              onChange={(value) => setSpeed(Array.isArray(value) ? value[0] : value)}
              minValue={0.1}
              maxValue={5.0}
              step={0.1}
              isDisabled={simulationActive}
              className="w-full"
              color="primary"
            />
          </div>

          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              检测精度: {(accuracy * 100).toFixed(0)}%
            </label>
            <Slider
              value={accuracy}
              onChange={(value) => setAccuracy(Array.isArray(value) ? value[0] : value)}
              minValue={0.5}
              maxValue={1.0}
              step={0.05}
              isDisabled={simulationActive}
              className="w-full"
              color="success"
            />
          </div>

          <div>
            <label className="text-white text-sm font-medium mb-2 block">
              数据样本数: {dataCount}
            </label>
            <Slider
              value={dataCount}
              onChange={(value) => setDataCount(Array.isArray(value) ? value[0] : value)}
              minValue={10}
              maxValue={1000}
              step={10}
              isDisabled={simulationActive}
              className="w-full"
              color="warning"
            />
          </div>
        </div>

        {/* 模拟选项 */}
        <div className="space-y-3">
          <Switch
            isSelected={enableNoise}
            onValueChange={setEnableNoise}
            isDisabled={simulationActive}
            color="primary"
          >
            <span className="text-white text-sm">启用噪声干扰</span>
          </Switch>

          <Switch
            isSelected={autoGenerate}
            onValueChange={setAutoGenerate}
            isDisabled={simulationActive}
            color="primary"
          >
            <span className="text-white text-sm">自动生成数据</span>
          </Switch>
        </div>

        {/* 控制按钮 */}
        <div className="space-y-2">
          <Button
            className="w-full bg-cyan-600/80 hover:bg-cyan-600 text-white"
            onPress={handleStartSimulation}
            isDisabled={simulationActive}
            startContent={<i className="fas fa-play"></i>}
          >
            开始模拟
          </Button>
          
          <Button
            className="w-full bg-red-600/80 hover:bg-red-600 text-white"
            onPress={() => onStopSimulation?.()}
            isDisabled={!simulationActive}
            startContent={<i className="fas fa-stop"></i>}
          >
            停止模拟
          </Button>
        </div>

        {/* 模拟状态 */}
        {simulationActive && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">模拟状态:</span>
              <Chip color="primary" variant="flat">
                <i className="fas fa-cog fa-spin mr-1"></i>
                运行中
              </Chip>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/80">
                <span>处理进度</span>
                <span>{Math.round((simulationStats.generatedSamples / dataCount) * 100)}%</span>
              </div>
              <Progress
                value={(simulationStats.generatedSamples / dataCount) * 100}
                color="primary"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 模拟统计 */}
        <div className="space-y-3">
          <h4 className="text-white font-medium text-sm flex items-center gap-2">
            <i className="fas fa-chart-bar text-cyan-400"></i>
            模拟统计
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/10 rounded-lg p-2 text-center">
              <div className="text-white/60">生成样本</div>
              <div className="text-white font-bold text-lg">{simulationStats.generatedSamples}</div>
            </div>
            
            <div className="bg-cyan-500/20 rounded-lg p-2 text-center">
              <div className="text-cyan-300">检测率</div>
              <div className="text-cyan-400 font-bold text-lg">{simulationStats.detectionRate.toFixed(1)}%</div>
            </div>
            
            <div className="bg-green-500/20 rounded-lg p-2 text-center">
              <div className="text-green-300">平均精度</div>
              <div className="text-green-400 font-bold text-lg">{simulationStats.averageAccuracy.toFixed(2)}</div>
            </div>
            
            <div className="bg-blue-500/20 rounded-lg p-2 text-center">
              <div className="text-blue-300">处理时间</div>
              <div className="text-blue-400 font-bold text-lg">{simulationStats.processingTime.toFixed(1)}s</div>
            </div>
          </div>
        </div>

        {/* 模拟模式说明 */}
        <div className="mt-4">
          <h4 className="text-white font-medium text-sm mb-2">
            <i className="fas fa-info-circle mr-2 text-cyan-400"></i>
            模拟模式说明:
          </h4>
          <ul className="text-xs text-white/70 space-y-1 pl-4">
            <li>• <span className="text-red-400">草莓检测</span>: 模拟草莓成熟度识别</li>
            <li>• <span className="text-blue-400">飞行路径</span>: 模拟无人机飞行轨迹</li>
            <li>• <span className="text-green-400">挑战卡</span>: 模拟挑战卡识别过程</li>
            <li>• <span className="text-purple-400">AI分析</span>: 模拟AI图像分析</li>
            <li>• <span className="text-orange-400">完整系统</span>: 模拟整个系统流程</li>
          </ul>
        </div>

        {/* 模拟提示 */}
        <div className="mt-4">
          <h4 className="text-white font-medium text-sm mb-2">
            <i className="fas fa-lightbulb mr-2 text-yellow-400"></i>
            模拟提示:
          </h4>
          <ul className="text-xs text-white/70 space-y-1 pl-4">
            <li>• 模拟功能用于测试和演示</li>
            <li>• 可以在没有真实无人机的情况下测试系统</li>
            <li>• 噪声干扰可以模拟真实环境的不确定性</li>
            <li>• 调整参数以获得不同的模拟效果</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
};

export default SimulationPanel;