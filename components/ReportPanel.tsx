import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";
import { DatePicker, CheckboxGroup, Checkbox } from "@nextui-org/react";
import AnimatedList from './ui/AnimatedList';

interface ReportData {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
  size: string;
  format: string;
}

interface ReportPanelProps {
  onGenerateReport: (config: ReportConfig) => void;
  onExportReport: (reportId: string, format: string) => void;
  onDeleteReport: (reportId: string) => void;
  reports: ReportData[];
  isGenerating: boolean;
  generationProgress: number;
}

interface ReportConfig {
  type: string;
  format: string;
  includeImages: boolean;
  includeCharts: boolean;
  includeRawData: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  sections: string[];
  title: string;
  description: string;
  template: string;
}

const ReportPanel: React.FC<ReportPanelProps> = ({
  onGenerateReport,
  onExportReport,
  onDeleteReport,
  reports,
  isGenerating,
  generationProgress,
}) => {
  const [reportType, setReportType] = useState("comprehensive");
  const [reportFormat, setReportFormat] = useState("pdf");
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [includeImages, setIncludeImages] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [selectedSections, setSelectedSections] = useState(["summary", "detection", "analysis"]);
  const [reportTemplate, setReportTemplate] = useState("standard");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const reportTypes = [
    { key: "comprehensive", label: "综合报告" },
    { key: "detection", label: "检测报告" },
    { key: "analysis", label: "分析报告" },
    { key: "flight", label: "飞行报告" },
    { key: "performance", label: "性能报告" },
    { key: "custom", label: "自定义报告" },
  ];

  const reportFormats = [
    { key: "pdf", label: "PDF" },
    { key: "html", label: "HTML" },
    { key: "docx", label: "Word" },
    { key: "xlsx", label: "Excel" },
    { key: "json", label: "JSON" },
    { key: "csv", label: "CSV" },
  ];

  const reportSections = [
    { key: "summary", label: "执行摘要" },
    { key: "detection", label: "检测结果" },
    { key: "analysis", label: "AI分析" },
    { key: "flight", label: "飞行数据" },
    { key: "images", label: "图像记录" },
    { key: "statistics", label: "统计数据" },
    { key: "recommendations", label: "建议" },
    { key: "appendix", label: "附录" },
  ];

  const reportTemplates = [
    { key: "standard", label: "标准模板" },
    { key: "detailed", label: "详细模板" },
    { key: "summary", label: "摘要模板" },
    { key: "scientific", label: "科研模板" },
    { key: "business", label: "商业模板" },
  ];

  const handleGenerateReport = () => {
    const config: ReportConfig = {
      type: reportType,
      format: reportFormat,
      includeImages,
      includeCharts,
      includeRawData,
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      sections: selectedSections,
      title: reportTitle || `${reportTypes.find(t => t.key === reportType)?.label} - ${new Date().toLocaleDateString()}`,
      description: reportDescription,
      template: reportTemplate,
    };
    
    onGenerateReport(config);
  };

  const getReportStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'generating':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getReportStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'fas fa-check-circle';
      case 'generating':
        return 'fas fa-spinner fa-spin';
      case 'failed':
        return 'fas fa-exclamation-circle';
      default:
        return 'fas fa-file';
    }
  };

  const formatFileSize = (size: string) => {
    return size || '0 KB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <Card className="h-full bg-black/40 border border-white/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <i className="fas fa-file-alt text-purple-400"></i>
              报告生成
            </h3>
            <p className="text-white/70 text-sm">Report Generation</p>
          </div>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Chip color="warning" variant="flat" size="sm" className="animate-pulse">
                <i className="fas fa-cog fa-spin text-yellow-500 mr-1"></i>
                生成中 {generationProgress}%
              </Chip>
            )}
            <Chip color="default" variant="flat" size="sm">
              {reports.length} 个报告
            </Chip>
          </div>
        </div>
      </CardHeader>
      <Divider className="bg-white/20" />
      <CardBody className="space-y-4">
        {/* 报告配置 */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">报告配置</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="报告类型"
              selectedKeys={[reportType]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setReportType(selected);
              }}
              size="sm"
            >
              {reportTypes.map((type) => (
                <SelectItem key={type.key}>
                  {type.label}
                </SelectItem>
              ))}
            </Select>
            
            <Select
              label="输出格式"
              selectedKeys={[reportFormat]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setReportFormat(selected);
              }}
              size="sm"
            >
              {reportFormats.map((format) => (
                <SelectItem key={format.key}>
                  {format.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          <Input
            label="报告标题"
            placeholder="输入报告标题..."
            value={reportTitle}
            onValueChange={setReportTitle}
            size="sm"
          />
          
          <Textarea
            label="报告描述"
            placeholder="输入报告描述..."
            value={reportDescription}
            onValueChange={setReportDescription}
            size="sm"
            minRows={2}
            maxRows={4}
          />
          
          <Select
            label="报告模板"
            selectedKeys={[reportTemplate]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              setReportTemplate(selected);
            }}
            size="sm"
          >
            {reportTemplates.map((template) => (
              <SelectItem key={template.key}>
                {template.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        <Divider className="bg-white/20" />

        {/* 包含内容 */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">包含内容</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">包含图像</span>
              <Switch
                isSelected={includeImages}
                onValueChange={setIncludeImages}
                size="sm"
                color="primary"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">包含图表</span>
              <Switch
                isSelected={includeCharts}
                onValueChange={setIncludeCharts}
                size="sm"
                color="primary"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-white text-sm">包含原始数据</span>
              <Switch
                isSelected={includeRawData}
                onValueChange={setIncludeRawData}
                size="sm"
                color="primary"
              />
            </div>
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 报告章节 */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">报告章节</h4>
          
          <CheckboxGroup
            value={selectedSections}
            onValueChange={setSelectedSections}
            size="sm"
          >
            <div className="grid grid-cols-2 gap-1">
              {reportSections.map((section) => (
                <Checkbox key={section.key} value={section.key}>
                  <span className="text-white text-sm">{section.label}</span>
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        </div>

        <Divider className="bg-white/20" />

        {/* 自动化选项 */}
        <div className="space-y-3">
          <h4 className="text-white font-semibold text-sm">自动化选项</h4>
          
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">任务完成后自动生成</span>
            <Switch
              isSelected={autoGenerate}
              onValueChange={setAutoGenerate}
              size="sm"
              color="secondary"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">定时生成报告</span>
            <Switch
              isSelected={scheduleEnabled}
              onValueChange={setScheduleEnabled}
              size="sm"
              color="secondary"
            />
          </div>
        </div>

        <Divider className="bg-white/20" />

        {/* 生成按钮 */}
        <div className="space-y-3">
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">生成进度</span>
                <span className="text-white">{generationProgress}%</span>
              </div>
              <Progress
                size="sm"
                value={generationProgress}
                color="warning"
                className="max-w-full"
              />
            </div>
          )}
          
          <Button
            color="primary"
            variant="solid"
            onPress={handleGenerateReport}
            isDisabled={isGenerating || selectedSections.length === 0}
            startContent={<i className="fas fa-file-export"></i>}
            className="w-full h-12"
          >
            {isGenerating ? "生成中..." : "生成报告"}
          </Button>
        </div>

        <Divider className="bg-white/20" />

        {/* 历史报告 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold text-sm">历史报告</h4>
            <Button
              size="sm"
              color="danger"
              variant="flat"
              onPress={() => {
                reports.forEach(report => {
                  if (report.status === 'completed') {
                    onDeleteReport(report.id);
                  }
                });
              }}
              startContent={<i className="fas fa-trash"></i>}
            >
              清空
            </Button>
          </div>
          
          <div className="max-h-64">
            <AnimatedList
              items={reports}
              renderItem={(report) => (
                <div className="p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors mx-1 my-1">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`${getReportStatusIcon(report.status)} text-sm`}></i>
                        <span className="text-white font-medium text-sm">{report.title}</span>
                        <Chip
                          color={getReportStatusColor(report.status)}
                          variant="flat"
                          size="sm"
                        >
                          {report.status === 'completed' ? '已完成' : 
                           report.status === 'generating' ? '生成中' : '失败'}
                        </Chip>
                      </div>
                      
                      <div className="text-white/60 text-xs space-y-1">
                        <div>类型: {report.type} | 格式: {report.format.toUpperCase()}</div>
                        <div>大小: {formatFileSize(report.size)} | 创建: {formatDate(report.createdAt)}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 ml-2">
                      {report.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => onExportReport(report.id, report.format)}
                            isIconOnly
                          >
                            <i className="fas fa-download"></i>
                          </Button>
                          
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            onPress={() => onDeleteReport(report.id)}
                            isIconOnly
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              onItemSelect={(report) => {
                if (report.status === 'completed') {
                  onExportReport(report.id, report.format);
                }
              }}
              maxHeight="16rem"
              itemHeight={100}
              showGradients={true}
              enableArrowNavigation={true}
              emptyState={
                <div className="text-white/60 text-center py-4">
                  <i className="fas fa-inbox text-xl mb-2 block"></i>
                  <p className="text-sm">暂无报告</p>
                </div>
              }
            />
          </div>
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-white/60 space-y-1">
          <div className="font-semibold">提示:</div>
          <div>• PDF格式适合打印和分享</div>
          <div>• HTML格式支持交互式图表</div>
          <div>• Excel格式便于数据分析</div>
          <div>• 包含原始数据会增加文件大小</div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ReportPanel;