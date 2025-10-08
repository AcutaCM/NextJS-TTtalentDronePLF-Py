"use client";

import { Card, CardBody } from "@heroui/card";
import { useState, useRef, useEffect } from "react";

interface StrawberryDetectionCardProps {
  detectedCount?: number;
  latestDetection?: {
    name: string;
    location: string;
    timestamp: string;
    maturity?: string;
  };
  maturityStats?: {
    ripe: number;
    halfRipe: number;
    unripe: number;
  };
}

export default function StrawberryDetectionCard({
  detectedCount = 25,
  latestDetection = {
    name: "成熟草莓",
    location: "南区[34,100,0]",
    timestamp: "Today, 16:36",
    maturity: "成熟"
  },
  maturityStats = {
    ripe: 15,
    halfRipe: 8,
    unripe: 2
  }
}: StrawberryDetectionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 边界检测 - 确保鼠标在卡片范围内
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      return;
    }
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const mouseX = x - centerX;
    const mouseY = y - centerY;
    
    const maxRotation = 12; // 最大旋转角度限制
    const rotateAmplitude = 14;
    let rotateXValue = (mouseY / (rect.height / 2)) * -rotateAmplitude;
    let rotateYValue = (mouseX / (rect.width / 2)) * rotateAmplitude;
    
    // 限制旋转角度范围
    rotateXValue = Math.max(-maxRotation, Math.min(maxRotation, rotateXValue));
    rotateYValue = Math.max(-maxRotation, Math.min(maxRotation, rotateYValue));
    
    setRotateX(rotateXValue);
    setRotateY(rotateYValue);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setScale(1.05);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setScale(1);
  };
  return (
    <div
      ref={cardRef}
      className="perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out',
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        overflow: 'visible',
        margin: '10px', // 为倾斜效果预留空间
        width: 'calc(100% - 20px)',
        height: 'calc(100% - 20px)'
      }}
    >
      <Card className="w-full h-full bg-background/60 backdrop-blur-[120px] border border-divider shadow-2xl">
        <CardBody className="p-0 relative overflow-hidden">
        {/* 主要内容区域 */}
        <div className="absolute top-[10%] left-[6%] w-[88%] h-[43%]">
          {/* 检测数量卡片 */}
          <div className="relative w-full h-full bg-primary rounded-[20px] backdrop-blur-[120px]">
            {/* 阴影装饰 */}
            <div className="absolute top-[-25%] right-[40%] w-[44%] h-[206%] opacity-10">
              <div className="w-full h-full bg-gradient-to-br from-primary-foreground to-transparent rounded-full blur-[60px]" />
            </div>
            
            {/* 文本内容 */}
            <div className="relative z-10">
              <h3 className="absolute top-[12%] left-[5%] text-primary-foreground/80 font-medium text-[0.75rem] leading-tight tracking-[-0.02em]">
                已检测草莓数量
              </h3>
              <div className="absolute top-[35%] left-[5%] text-primary-foreground font-bold text-[2.5rem] leading-tight">
                {detectedCount}
              </div>
              
              {/* 更多按钮 */}
              <div className="absolute top-[15%] right-[3.8%] w-[5.4%] h-[23%] flex items-center justify-center text-primary-foreground">
                <svg className="w-[1rem] h-[0.25rem]" viewBox="0 0 16 4" fill="none">
                  <path d="M2 2C2 0.9 1.1 0 0 0V4C1.1 4 2 3.1 2 2ZM8 2C8 0.9 7.1 0 6 0V4C7.1 4 8 3.1 8 2ZM14 2C14 0.9 13.1 0 12 0V4C13.1 4 14 3.1 14 2Z" fill="currentColor"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* NEWEST 标签 */}
        <div className="absolute top-[61%] left-[6%]">
          <span className="text-foreground/60 font-normal text-[0.625rem] leading-tight">
            NEWEST
          </span>
        </div>
        
        {/* 最新检测信息 */}
        <div className="absolute top-[71%] left-[6%] w-[88%] h-[18%]">
          {/* 图标 */}
          <div className="absolute top-[2%] left-0 w-[9.5%] h-[98%]">
            <div className="w-full h-full rounded-full bg-foreground/[0.08]" />
          </div>
          
          {/* 文本信息 */}
          <div className="absolute top-0 left-[14.5%] w-[85.5%] h-full">
            <div className="text-foreground font-medium text-[0.875rem] leading-tight">
              {latestDetection.name}
            </div>
            <div className="absolute top-[51%] left-0 text-foreground/60 font-normal text-[0.875rem] leading-tight">
              {latestDetection.timestamp}
            </div>
            <div className="absolute top-[21%] right-0 text-foreground font-bold text-[0.875rem] leading-tight text-right">
              {latestDetection.location}
            </div>
          </div>
        </div>
        
        {/* 成熟度统计 - 新增区域 */}
        <div className="absolute bottom-[2%] left-[6%] w-[88%] h-[8%] flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-danger"></div>
              <span className="text-danger">成熟: {maturityStats.ripe}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning"></div>
              <span className="text-warning">半熟: {maturityStats.halfRipe}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-success">未熟: {maturityStats.unripe}</span>
            </div>
          </div>
        </div>
        </CardBody>
      </Card>
    </div>
  );
}