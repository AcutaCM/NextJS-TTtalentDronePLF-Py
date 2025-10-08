import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { Switch } from "@heroui/switch";
import { Progress } from "@heroui/progress";
import { Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";

interface AIAnalysisPanelProps {
  isConnected: boolean;
  analysisActive: boolean;
  onStartAnalysis: (config: AnalysisConfig) => void;
  onStopAnalysis: () => void;
  onTestAI: () => void;
  analysisProgress?: number;
  analysisResults?: AnalysisResults;
}

interface AnalysisConfig {
  analysisType: string;
  prompt: string;
  autoSave: boolean;
  realTimeMode: boolean;
  confidenceThreshold: number;
}

interface AnalysisResults {
  totalAnalyzed: number;
  successRate: number;
  averageConfidence: number;
  lastAnalysisTime: string;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
  isConnected,
  analysisActive,
  onStartAnalysis,
  onStopAnalysis,
  onTestAI,
  analysisProgress = 0,
  analysisResults = {
    totalAnalyzed: 0,
    successRate: 0,
    averageConfidence: 0,
    lastAnalysisTime: "--",
  },
}) => {
  const [analysisType, setAnalysisType] = useState("strawberry_analysis");
  const [prompt, setPrompt] = useState("分析图像中的草莓成熟度，识别成熟、半成熟和未成熟的草莓，并提供详细的分析报告。");
  const [autoSave, setAutoSave] = useState(true);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);

  const analysisTypes = [
    { key: "strawberry_analysis", label: "草莓成熟度分析" },
    { key: "plant_health", label: "植物健康检测" },
    { key: "pest_detection", label: "病虫害识别" },
    { key: "growth_monitoring", label: "生长监测" },
    { key: "custom_analysis", label: "自定义分析" },
  ];

  const handleStartAnalysis = () => {
    const config: AnalysisConfig = {
      analysisType,
      prompt,
      autoSave,
      realTimeMode,
      confidenceThreshold,
    };
    onStartAnalysis(config);
  };

  return (
    <Card className="h-full bg-background/60 border border-divider">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <h3 className="text-foreground font-bold text-lg flex items-center gap-2">
            <i className="fas fa-brain text-secondary"></i>
            AI 分析任务
          </h3>
          <p className="text-foreground/70 text-sm">AI Analysis Tasks</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        {/* 分析类型选择 */}
        <Select
          label="分析类型"
          placeholder="选择分析类型"
          selectedKeys={[analysisType]}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0] as string;
            setAnalysisType(selected);
          }}
          isDisabled={analysisActive}
          className="w-full"
        >
          {analysisTypes.map((type) => (
            <SelectItem key={type.key}>
              {type.label}
            </SelectItem>
          ))}
        </Select>

        {/* 分析提示词 */}
        <Textarea
          label="分析提示词"
          placeholder="输入AI分析的具体要求..."
          value={prompt}
          onValueChange={setPrompt}
          isDisabled={analysisActive}
          minRows={3}
          maxRows={5}
          description="描述您希望AI如何分析图像"
        />

        {/* 配置选项 */}
        <div className="space-y-3">
          <Switch
            isSelected={autoSave}
            onValueChange={setAutoSave}
            isDisabled={analysisActive}
            color="primary"
          >
            <span className="text-foreground text-sm">自动保存分析结果</span>
          </Switch>

          <Switch
            isSelected={realTimeMode}
            onValueChange={setRealTimeMode}
            isDisabled={analysisActive}
            color="primary"
          >
            <span className="text-foreground text-sm">实时分析模式</span>
          </Switch>
        </div>

        {/* 控制按钮 */}
        <div className="space-y-2">
          <Button
            color="secondary"
            variant="bordered"
            className="w-full"
            onPress={handleStartAnalysis}
            isDisabled={!isConnected || analysisActive || !prompt.trim()}
            startContent={<i className="fas fa-play"></i>}
          >
            开始 AI 分析
          </Button>
          
          <Button
            color="danger"
            variant="bordered"
            className="w-full"
            onPress={onStopAnalysis}
            isDisabled={!analysisActive}
            startContent={<i className="fas fa-stop"></i>}
          >
            停止分析
          </Button>
          
          <Button
            color="primary"
            variant="bordered"
            className="w-full"
            onPress={onTestAI}
            isDisabled={!isConnected || analysisActive}
            startContent={<i className="fas fa-flask"></i>}
          >
            测试 AI
          </Button>
        </div>

        {/* 分析状态 */}
        {analysisActive && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-foreground/80 text-sm">分析状态:</span>
              <Chip color="secondary" variant="flat">
                <i className="fas fa-cog fa-spin mr-1"></i>
                分析中
              </Chip>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-foreground/80">
                <span>分析进度</span>
                <span>{Math.round(analysisProgress)}%</span>
              </div>
              <Progress
                value={analysisProgress}
                color="secondary"
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* 分析统计 */}
        <div className="space-y-3">
          <h4 className="text-foreground font-medium text-sm flex items-center gap-2">
            <i className="fas fa-chart-line text-secondary"></i>
            分析统计
          </h4>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-content2 rounded-lg p-2 text-center">
              <div className="text-foreground/60">已分析</div>
              <div className="text-foreground font-bold text-lg">{analysisResults.totalAnalyzed}</div>
            </div>
            
            <div className="bg-secondary/20 rounded-lg p-2 text-center">
              <div className="text-secondary">成功率</div>
              <div className="text-secondary font-bold text-lg">{analysisResults.successRate.toFixed(1)}%</div>
            </div>
            
            <div className="bg-primary/20 rounded-lg p-2 text-center">
              <div className="text-primary">平均置信度</div>
              <div className="text-primary font-bold text-lg">{analysisResults.averageConfidence.toFixed(2)}</div>
            </div>
            
            <div className="bg-success/20 rounded-lg p-2 text-center">
              <div className="text-success">最后分析</div>
              <div className="text-success font-bold text-xs">{analysisResults.lastAnalysisTime}</div>
            </div>
          </div>
        </div>

        {/* AI 分析说明 */}
        <div className="mt-4">
          <h4 className="text-foreground font-medium text-sm mb-2">
            <i className="fas fa-info-circle mr-2 text-secondary"></i>
            AI 分析功能:
          </h4>
          <ul className="text-xs text-foreground/70 space-y-1 pl-4">
            <li>• 智能图像识别和分析</li>
            <li>• 多种预设分析模板</li>
            <li>• 自定义分析提示词</li>
            <li>• 实时或批量分析模式</li>
            <li>• 详细的分析报告生成</li>
            <li>• 结果自动保存和导出</li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
};

export default AIAnalysisPanel;