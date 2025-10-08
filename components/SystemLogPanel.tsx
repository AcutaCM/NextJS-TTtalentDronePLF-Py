import React, { useState, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import AnimatedList from './ui/AnimatedList';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug' | 'success';
  category: string;
  message: string;
  details?: string;
}

interface SystemLogPanelProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => void;
  maxLogEntries?: number;
}

const SystemLogPanel: React.FC<SystemLogPanelProps> = ({
  logs,
  onClearLogs,
  onExportLogs,
  maxLogEntries = 1000,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logLevels = [
    { key: "all", label: "全部" },
    { key: "info", label: "信息" },
    { key: "warning", label: "警告" },
    { key: "error", label: "错误" },
    { key: "debug", label: "调试" },
    { key: "success", label: "成功" },
  ];

  const categories = [
    { key: "all", label: "全部" },
    { key: "connection", label: "连接" },
    { key: "flight", label: "飞行" },
    { key: "detection", label: "检测" },
    { key: "analysis", label: "分析" },
    { key: "system", label: "系统" },
    { key: "api", label: "API" },
  ];

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const levelMatch = filterLevel === "all" || log.level === filterLevel;
    const categoryMatch = filterCategory === "all" || log.category === filterCategory;
    const searchMatch = searchTerm === "" || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return levelMatch && categoryMatch && searchMatch;
  });

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && !isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'info':
        return 'text-blue-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-white';
    }
  };

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'success':
        return 'fas fa-check-circle';
      case 'info':
        return 'fas fa-info-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'error':
        return 'fas fa-times-circle';
      case 'debug':
        return 'fas fa-bug';
      default:
        return 'fas fa-circle';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getLogStats = () => {
    const stats = {
      total: logs.length,
      info: logs.filter(log => log.level === 'info').length,
      warning: logs.filter(log => log.level === 'warning').length,
      error: logs.filter(log => log.level === 'error').length,
      success: logs.filter(log => log.level === 'success').length,
      debug: logs.filter(log => log.level === 'debug').length,
    };
    return stats;
  };

  const stats = getLogStats();

  return (
    <Card className="h-full bg-black/40 border border-white/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <i className="fas fa-terminal text-green-400"></i>
                系统日志
              </h3>
              <p className="text-white/70 text-sm">System Logs</p>
            </div>
            <div className="flex items-center gap-2">
              <Chip color="default" variant="flat" size="sm">
                {filteredLogs.length}/{logs.length}
              </Chip>
              <Button
                size="sm"
                color={isPaused ? "warning" : "primary"}
                variant="flat"
                onPress={() => setIsPaused(!isPaused)}
                startContent={
                  <i className={isPaused ? "fas fa-play" : "fas fa-pause"}></i>
                }
              >
                {isPaused ? "继续" : "暂停"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <Divider className="bg-white/20" />
      <CardBody className="space-y-4 p-0">
        {/* 控制面板 */}
        <div className="p-4 space-y-3">
          {/* 过滤器 */}
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="日志级别"
              selectedKeys={[filterLevel]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setFilterLevel(selected);
              }}
              size="sm"
            >
              {logLevels.map((level) => (
                <SelectItem key={level.key}>
                  {level.label}
                </SelectItem>
              ))}
            </Select>
            
            <Select
              label="分类"
              selectedKeys={[filterCategory]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setFilterCategory(selected);
              }}
              size="sm"
            >
              {categories.map((category) => (
                <SelectItem key={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          
          {/* 搜索 */}
          <Input
            placeholder="搜索日志..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            size="sm"
            startContent={<i className="fas fa-search text-white/60"></i>}
            isClearable
          />
          
          {/* 选项和操作 */}
          <div className="flex items-center justify-between">
            <Switch
              isSelected={autoScroll}
              onValueChange={setAutoScroll}
              size="sm"
              color="primary"
            >
              <span className="text-white text-sm">自动滚动</span>
            </Switch>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                color="primary"
                variant="flat"
                onPress={onExportLogs}
                startContent={<i className="fas fa-download"></i>}
              >
                导出
              </Button>
              
              <Button
                size="sm"
                color="danger"
                variant="flat"
                onPress={onClearLogs}
                startContent={<i className="fas fa-trash"></i>}
              >
                清空
              </Button>
            </div>
          </div>
          
          {/* 统计信息 */}
          <div className="flex flex-wrap gap-2">
            <Chip color="default" variant="flat" size="sm">
              总计: {stats.total}
            </Chip>
            {stats.success > 0 && (
              <Chip color="success" variant="flat" size="sm">
                成功: {stats.success}
              </Chip>
            )}
            {stats.info > 0 && (
              <Chip color="primary" variant="flat" size="sm">
                信息: {stats.info}
              </Chip>
            )}
            {stats.warning > 0 && (
              <Chip color="warning" variant="flat" size="sm">
                警告: {stats.warning}
              </Chip>
            )}
            {stats.error > 0 && (
              <Chip color="danger" variant="flat" size="sm">
                错误: {stats.error}
              </Chip>
            )}
            {stats.debug > 0 && (
              <Chip color="default" variant="flat" size="sm">
                调试: {stats.debug}
              </Chip>
            )}
          </div>
        </div>
        
        <Divider className="bg-white/20" />
        
        {/* 日志内容 */}
        <div 
          ref={logContainerRef}
          className="flex-1 font-mono text-sm max-h-96"
          style={{ minHeight: '200px' }}
        >
          <AnimatedList
            items={filteredLogs}
            renderItem={(log) => (
              <div className="flex items-start gap-2 p-2 rounded hover:bg-white/5 transition-colors">
                <span className="text-white/60 text-xs whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                
                <i className={`${getLogLevelIcon(log.level)} ${getLogLevelColor(log.level)} text-xs mt-0.5`}></i>
                
                <span className="text-white/80 text-xs uppercase font-bold min-w-[60px]">
                  [{log.category}]
                </span>
                
                <div className="flex-1">
                  <span className={`${getLogLevelColor(log.level)} text-sm`}>
                    {log.message}
                  </span>
                  {log.details && (
                    <div className="text-white/60 text-xs mt-1 pl-2 border-l border-white/20">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            )}
            maxHeight="384px"
            itemHeight={60}
            showGradients={true}
            enableArrowNavigation={false}
            className="h-full overflow-y-auto p-4 space-y-1"
            emptyState={
              <div className="text-white/60 text-center py-8">
                <i className="fas fa-inbox text-2xl mb-2"></i>
                <p>暂无日志记录</p>
              </div>
            }
          />
        </div>
      </CardBody>
    </Card>
  );
};

export default SystemLogPanel;