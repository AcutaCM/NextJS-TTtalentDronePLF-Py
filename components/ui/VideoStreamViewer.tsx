'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Camera, Wifi, WifiOff, Activity } from 'lucide-react';

interface DetectionResult {
  bbox: [number, number, number, number];
  confidence: number;
  class_id: number;
  class_name: string;
  center: [number, number];
  area: number;
  model_type: string;
  track_id?: string;
  timestamp: string;
  maturity_level?: string;
  maturity_confidence?: number;
  disease_type?: string;
  disease_severity?: string;
  disease_confidence?: number;
}

interface VideoStreamData {
  frame: string;
  fps: number;
  timestamp: string;
  detection_status: {
    maturity_enabled: boolean;
    disease_enabled: boolean;
    detection_active: boolean;
    detection_count: number;
  };
}

interface DetectionData {
  detections: DetectionResult[];
  summary: {
    total_objects: number;
    maturity_objects: number;
    disease_objects: number;
    avg_confidence: number;
  };
  timestamp: string;
}

interface VideoStreamViewerProps {
  isActive: boolean;
  onToggleStream: () => void;
  className?: string;
}

export default function VideoStreamViewer({ 
  isActive, 
  onToggleStream, 
  className = '' 
}: VideoStreamViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<string>('');
  const [fps, setFps] = useState(0);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [smoothedDetections, setSmoothedDetections] = useState<DetectionResult[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<Map<string, DetectionResult[]>>(new Map());
  const detectionBufferRef = useRef<DetectionResult[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);
  const [detectionSummary, setDetectionSummary] = useState({
    total_objects: 0,
    maturity_objects: 0,
    disease_objects: 0,
    avg_confidence: 0
  });
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // WebSocket连接管理
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      const ws = new WebSocket('ws://localhost:3003');
      
      ws.onopen = () => {
        console.log('✅ WebSocket连接已建立');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // 发送连接确认
        ws.send(JSON.stringify({
          type: 'heartbeat',
          data: { client_type: 'video_viewer' }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      };

      ws.onclose = () => {
        console.log('📴 WebSocket连接已关闭');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // 自动重连
        if (isActive) {
          setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket连接错误:', error);
        setConnectionStatus('disconnected');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      setConnectionStatus('disconnected');
    }
  }, [isActive]);

  // 检测结果平滑处理函数
  const smoothDetections = useCallback((newDetections: DetectionResult[]) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastUpdateTimeRef.current;
    
    // 限制更新频率，避免过于频繁的重绘
    if (timeDiff < 100) { // 最多每100ms更新一次
      return;
    }
    
    lastUpdateTimeRef.current = currentTime;
    
    // 使用动态置信度阈值过滤检测结果（与后端配置一致）
    const filteredDetections = newDetections.filter(det => {
      const threshold = det.model_type === 'disease' ? 0.25 : 0.2; // disease略高
      return det.confidence >= threshold;
    });
    
    // 对于有跟踪ID的检测，进行位置平滑
    const smoothed = filteredDetections.map(detection => {
      if (!detection.track_id) return detection;
      
      const trackKey = String(detection.track_id);
      const history = detectionHistory.get(trackKey) || [];
      history.push(detection);
      
      // 保持最近5帧的历史记录
      if (history.length > 5) {
        history.shift();
      }
      
      detectionHistory.set(trackKey, history);
      
      // 计算平均位置以平滑检测框
      if (history.length >= 2) {
        const avgBbox = history.reduce((acc, det) => {
          return [
            acc[0] + det.bbox[0] / history.length,
            acc[1] + det.bbox[1] / history.length,
            acc[2] + det.bbox[2] / history.length,
            acc[3] + det.bbox[3] / history.length
          ];
        }, [0, 0, 0, 0]);
        
        const avgCenter: [number, number] = [
          (avgBbox[0] + avgBbox[2]) / 2,
          (avgBbox[1] + avgBbox[3]) / 2
        ];
        
        return {
          ...detection,
          bbox: [
            Math.round(avgBbox[0]),
            Math.round(avgBbox[1]),
            Math.round(avgBbox[2]),
            Math.round(avgBbox[3])
          ] as [number, number, number, number],
          center: avgCenter
        };
      }
      
      return detection;
    });
    
    setSmoothedDetections(smoothed);
    setDetectionHistory(new Map(detectionHistory));
  }, [detectionHistory]);

  // 处理WebSocket消息
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'video_frame':
        const videoData: VideoStreamData = message.data;
        setCurrentFrame(videoData.frame);
        setFps(videoData.fps);
        break;
        
      case 'multi_model_detection':
        const detectionData: DetectionData = message.data;
        console.log('🔍 接收到检测数据:', {
          detections: detectionData.detections.length,
          summary: detectionData.summary,
          sample: detectionData.detections[0]
        });
        setDetectionResults(detectionData.detections);
        setDetectionSummary(detectionData.summary);
        // 应用平滑处理
        smoothDetections(detectionData.detections);
        break;
        
      case 'status_update':
        console.log('状态更新:', message.data);
        break;
        
      case 'connection_established':
        console.log('连接已建立:', message.data);
        break;
        
      default:
        // console.log('未处理的消息类型:', message.type);
        break;
    }
  }, [smoothDetections]);

  // 断开WebSocket连接
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // 组件挂载时连接WebSocket
  useEffect(() => {
    if (isActive) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isActive, connectWebSocket, disconnectWebSocket]);

  // 绘制视频帧和检测结果
  useEffect(() => {
    if (!currentFrame || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 设置画布尺寸
      canvas.width = img.width;
      canvas.height = img.height;
      
      // 绘制视频帧
      ctx.drawImage(img, 0, 0);
      
      // 使用平滑后的检测结果进行绘制，若为空则回退到原始检测结果
      const toDraw = smoothedDetections.length > 0 ? smoothedDetections : detectionResults;
      drawDetections(ctx, toDraw, img.width, img.height);

      // 调试覆盖层：显示检测数量与FPS
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(8, 8, 180, 38);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(`Detections: ${toDraw.length} (raw: ${detectionResults.length})`, 14, 24);
      ctx.fillText(`FPS: ${fps}`, 14, 40);
      ctx.restore();
    };
    
    img.src = currentFrame;
  }, [currentFrame, smoothedDetections, detectionResults, fps]);

  // 绘制检测框和标签
  const drawDetections = (
    ctx: CanvasRenderingContext2D, 
    detections: DetectionResult[], 
    width: number, 
    height: number
  ) => {
    // 设置抗锯齿和平滑绘制
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 辅助函数：HEX转RGB
    const hexToRgb = (hex: string) => {
      const sanitized = hex.replace('#', '');
      if (sanitized.length !== 6) return { r: 0, g: 255, b: 0 };
      const bigint = parseInt(sanitized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    };

    // 辅助函数：绘制圆角矩形
    const drawRoundedRect = (
      ctx: CanvasRenderingContext2D,
      x: number, y: number, w: number, h: number, r: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    
    detections.forEach((detection) => {
      const [x1, y1, x2, y2] = detection.bbox;
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;
      
      // 根据模型类型和置信度设置颜色和透明度
      let baseColor = '#00ff00'; // 默认绿色
      if (detection.model_type === 'maturity') {
        baseColor = '#ff6b35'; // 橙色用于成熟度
      } else if (detection.model_type === 'disease') {
        baseColor = '#ff3333'; // 红色用于病害
      }
      
      // 根据置信度调整透明度（0.6 ~ 1.0）
      const alpha = Math.max(0.6, Math.min(1, detection.confidence));
      const { r, g, b } = hexToRgb(baseColor);
      const rgbaColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      
      // 绘制检测框 - 使用更平滑的线条
      ctx.strokeStyle = rgbaColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeRect(x1, y1, boxWidth, boxHeight);
      
      // 绘制标签背景 - 添加圆角效果
      const label = `${detection.class_name} (${(detection.confidence * 100).toFixed(1)}%)`;
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 16;
      const padding = 4;
      
      // 绘制圆角矩形背景
      const bgX = x1;
      const bgY = y1 - textHeight - padding * 2;
      const bgWidth = textWidth + padding * 2;
      const bgHeight = textHeight + padding;
      
      ctx.fillStyle = rgbaColor;
      drawRoundedRect(ctx, bgX, bgY, bgWidth, bgHeight, 4);
      ctx.fill();
      
      // 绘制标签文字
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(label, x1 + padding, y1 - textHeight - padding);
      
      // 绘制中心点 - 更小更精致
      const [centerX, centerY] = detection.center;
      ctx.fillStyle = rgbaColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // 如果有跟踪ID，显示在右上角
      if (detection.track_id !== undefined) {
        const trackBgX = x2 - 25;
        const trackBgY = y1;
        const trackBgWidth = 20;
        const trackBgHeight = 16;
        
        ctx.fillStyle = rgbaColor;
        drawRoundedRect(ctx, trackBgX, trackBgY, trackBgWidth, trackBgHeight, 3);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${detection.track_id}`, trackBgX + trackBgWidth/2, trackBgY + trackBgHeight/2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
      }
    });
  };

  // 获取连接状态图标
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            实时检测视频流
          </CardTitle>
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? '运行中' : '已停止'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 控制按钮 */}
        <div className="flex items-center gap-2">
          <Button
            onClick={onToggleStream}
            variant={isActive ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isActive ? (
              <>
                <Square className="h-4 w-4" />
                停止视频流
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                启动视频流
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>FPS: {fps}</span>
            <span>连接: {connectionStatus === 'connected' ? '已连接' : '未连接'}</span>
          </div>
        </div>

        {/* 检测统计 */}
        {detectionSummary.total_objects > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-muted p-2 rounded text-center">
              <div className="text-lg font-bold">{detectionSummary.total_objects}</div>
              <div className="text-xs text-muted-foreground">总检测</div>
            </div>
            <div className="bg-orange-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-orange-600">{detectionSummary.maturity_objects}</div>
              <div className="text-xs text-muted-foreground">成熟度</div>
            </div>
            <div className="bg-red-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-red-600">{detectionSummary.disease_objects}</div>
              <div className="text-xs text-muted-foreground">病害</div>
            </div>
            <div className="bg-green-100 p-2 rounded text-center">
              <div className="text-lg font-bold text-green-600">
                {(detectionSummary.avg_confidence * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">平均置信度</div>
            </div>
          </div>
        )}

        {/* 视频显示区域 */}
        <div className="relative bg-black rounded-lg overflow-hidden min-h-[300px] flex items-center justify-center">
          {currentFrame ? (
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-[500px] object-contain"
              style={{ display: 'block' }}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>
                {isActive 
                  ? (connectionStatus === 'connected' ? '等待视频流...' : '连接中...') 
                  : '点击启动视频流'
                }
              </p>
            </div>
          )}
        </div>

        {/* 检测结果列表 */}
        {detectionResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">当前检测结果</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {detectionResults.map((detection, index) => (
                <div key={index} className="flex items-center justify-between text-xs bg-muted p-2 rounded">
                  <span className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={
                        detection.model_type === 'maturity' 
                          ? 'border-orange-500 text-orange-600' 
                          : 'border-red-500 text-red-600'
                      }
                    >
                      {detection.model_type === 'maturity' ? '成熟度' : '病害'}
                    </Badge>
                    {detection.class_name}
                  </span>
                  <span className="font-mono">
                    {(detection.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}