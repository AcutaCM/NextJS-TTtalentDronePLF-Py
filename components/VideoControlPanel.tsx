import React, { useState, useRef, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Slider } from "@nextui-org/react";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { Progress } from "@heroui/progress";

interface VideoControlPanelProps {
  isConnected: boolean;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTakeScreenshot: () => void;
  onToggleFullscreen: () => void;
  videoStream?: MediaStream;
}

const VideoControlPanel: React.FC<VideoControlPanelProps> = ({
  isConnected,
  isRecording,
  onStartRecording,
  onStopRecording,
  onTakeScreenshot,
  onToggleFullscreen,
  videoStream,
}) => {
  const [showGrid, setShowGrid] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [timelapse, setTimelapse] = useState(false);
  const [timelapseInterval, setTimelapseInterval] = useState(5);
  const [videoQuality, setVideoQuality] = useState("720p");
  const [brightness, setBrightness] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timelapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const videoQualities = [
    { key: "480p", label: "480p (标清)" },
    { key: "720p", label: "720p (高清)" },
    { key: "1080p", label: "1080p (全高清)" },
    { key: "4k", label: "4K (超高清)" },
  ];

  // 录制计时器
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // 延时摄影
  useEffect(() => {
    if (timelapse && isConnected) {
      timelapseTimerRef.current = setInterval(() => {
        onTakeScreenshot();
      }, timelapseInterval * 1000);
    } else {
      if (timelapseTimerRef.current) {
        clearInterval(timelapseTimerRef.current);
        timelapseTimerRef.current = null;
      }
    }

    return () => {
      if (timelapseTimerRef.current) {
        clearInterval(timelapseTimerRef.current);
      }
    };
  }, [timelapse, timelapseInterval, isConnected, onTakeScreenshot]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStorageColor = () => {
    if (storageUsed < 70) return "success";
    if (storageUsed < 90) return "warning";
    return "danger";
  };

  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    onToggleFullscreen();
  };

  const handleRecordingToggle = () => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  return (
    <Card className="h-full bg-background/60 backdrop-blur-sm border border-divider">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between w-full">
          <div>
            <h3 className="text-foreground font-bold text-lg flex items-center gap-2">
              <i className="fas fa-video text-primary"></i>
              视频控制
            </h3>
            <p className="text-foreground/70 text-sm">Video Control</p>
          </div>
          <div className="flex items-center gap-2">
            {isRecording && (
              <Chip color="danger" variant="flat" size="sm" className="animate-pulse">
                <i className="fas fa-circle text-red-500 mr-1"></i>
                录制中 {formatDuration(recordingDuration)}
              </Chip>
            )}
            {timelapse && (
              <Chip color="warning" variant="flat" size="sm">
                <i className="fas fa-clock text-yellow-500 mr-1"></i>
                延时摄影
              </Chip>
            )}
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        {/* 主要控制按钮 */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            color={isRecording ? "danger" : "primary"}
            variant={isRecording ? "solid" : "flat"}
            onPress={handleRecordingToggle}
            isDisabled={!isConnected}
            startContent={
              <i className={isRecording ? "fas fa-stop" : "fas fa-video"}></i>
            }
            className="h-12"
          >
            {isRecording ? "停止录制" : "开始录制"}
          </Button>
          
          <Button
            color="secondary"
            variant="flat"
            onPress={onTakeScreenshot}
            isDisabled={!isConnected}
            startContent={<i className="fas fa-camera"></i>}
            className="h-12"
          >
            截图
          </Button>
        </div>

        {/* 视频选项 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">显示网格</span>
            <Switch
              isSelected={showGrid}
              onValueChange={setShowGrid}
              size="sm"
              color="primary"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">显示叠加信息</span>
            <Switch
              isSelected={showOverlay}
              onValueChange={setShowOverlay}
              size="sm"
              color="primary"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">全屏模式</span>
            <Switch
              isSelected={isFullscreen}
              onValueChange={handleFullscreenToggle}
              size="sm"
              color="primary"
            />
          </div>
        </div>

        <Divider />

        {/* 延时摄影 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-foreground text-sm">延时摄影</span>
            <Switch
              isSelected={timelapse}
              onValueChange={setTimelapse}
              size="sm"
              color="warning"
              isDisabled={!isConnected}
            />
          </div>
          
          {timelapse && (
            <div className="space-y-2">
              <span className="text-foreground/80 text-xs">拍摄间隔: {timelapseInterval}秒</span>
              <Slider
                size="sm"
                step={1}
                minValue={1}
                maxValue={60}
                value={timelapseInterval}
                onChange={(value) => setTimelapseInterval(value as number)}
                className="max-w-full"
                color="warning"
              />
            </div>
          )}
        </div>

        <Divider />

        {/* 视频质量 */}
        <div className="space-y-3">
          <Select
            label="视频质量"
            selectedKeys={[videoQuality]}
            onSelectionChange={(keys) => {
              const selected = Array.from(keys)[0] as string;
              setVideoQuality(selected);
            }}
            size="sm"
          >
            {videoQualities.map((quality) => (
              <SelectItem key={quality.key}>
                {quality.label}
              </SelectItem>
            ))}
          </Select>
        </div>

        <Divider />

        {/* 图像调整 */}
        <div className="space-y-3">
          <h4 className="text-foreground font-semibold text-sm">图像调整</h4>
          
          <div className="space-y-2">
            <span className="text-foreground/80 text-xs">亮度: {brightness}%</span>
            <Slider
              size="sm"
              step={1}
              minValue={0}
              maxValue={100}
              value={brightness}
              onChange={(value) => setBrightness(value as number)}
              className="max-w-full"
              color="primary"
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-foreground/80 text-xs">对比度: {contrast}%</span>
            <Slider
              size="sm"
              step={1}
              minValue={0}
              maxValue={100}
              value={contrast}
              onChange={(value) => setContrast(value as number)}
              className="max-w-full"
              color="primary"
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-foreground/80 text-xs">饱和度: {saturation}%</span>
            <Slider
              size="sm"
              step={1}
              minValue={0}
              maxValue={100}
              value={saturation}
              onChange={(value) => setSaturation(value as number)}
              className="max-w-full"
              color="primary"
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-foreground/80 text-xs">缩放: {zoom}%</span>
            <Slider
              size="sm"
              step={10}
              minValue={50}
              maxValue={200}
              value={zoom}
              onChange={(value) => setZoom(value as number)}
              className="max-w-full"
              color="secondary"
            />
          </div>
        </div>

        <Divider />

        {/* 存储信息 */}
        <div className="space-y-3">
          <h4 className="text-foreground font-semibold text-sm">存储信息</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-foreground/80">存储使用率</span>
              <span className="text-foreground">{storageUsed}%</span>
            </div>
            <Progress
              size="sm"
              value={storageUsed}
              color={getStorageColor()}
              className="max-w-full"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 bg-content2 rounded">
              <div className="text-foreground/60">录制时长</div>
              <div className="text-foreground font-mono">{formatDuration(recordingDuration)}</div>
            </div>
            <div className="text-center p-2 bg-content2 rounded">
              <div className="text-foreground/60">文件大小</div>
              <div className="text-foreground font-mono">0 MB</div>
            </div>
          </div>
        </div>

        {/* 快捷键提示 */}
        <div className="text-xs text-foreground/60 space-y-1">
          <div className="font-semibold">快捷键:</div>
          <div>Space - 开始/停止录制</div>
          <div>S - 截图</div>
          <div>F - 全屏切换</div>
          <div>G - 显示/隐藏网格</div>
        </div>
      </CardBody>
    </Card>
  );
};

export default VideoControlPanel;