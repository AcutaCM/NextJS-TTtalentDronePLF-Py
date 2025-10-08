import React, { useRef, useState } from "react";
import { Button } from "@heroui/button";
import Meteors from "@/components/ui/meteors";

interface HelpPanelProps {
  onViewHelp: () => void;
}

const HelpPanel: React.FC<HelpPanelProps> = ({ onViewHelp }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

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
    
    // 计算旋转角度并添加边界限制
    const maxRotation = 12; // 最大旋转角度
    let rotateX = (y - centerY) / 10;
    let rotateY = (centerX - x) / 10;
    
    // 限制旋转角度范围
    rotateX = Math.max(-maxRotation, Math.min(maxRotation, rotateX));
    rotateY = Math.max(-maxRotation, Math.min(maxRotation, rotateY));
    
    setMousePosition({ x: rotateY, y: rotateX });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full h-full transition-transform duration-300 ease-out"
      style={{
        transform: `perspective(1000px) rotateX(${mousePosition.y}deg) rotateY(${mousePosition.x}deg) scale(${isHovered ? 1.05 : 1})`,
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        overflow: 'visible',
        margin: '10px', // 为倾斜效果预留空间
        width: 'calc(100% - 20px)',
        height: 'calc(100% - 20px)'
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 背景 */}
      <div className="absolute inset-0 rounded-[15px] overflow-hidden" style={{ transform: 'translateZ(20px)' }}>
        {/* 星空背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a23] via-[#1a1a3a] to-[#2a2a4a]"></div>
        
        {/* 流星效果 */}
        <div className="absolute inset-0">
          <Meteors number={20} />
        </div>
        
        {/* 背景图片 */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: "url('/images/background.svg')",
            transform: "translate(-311.63px, -162.79px) scale(2.16, 1.56)"
          }}
        ></div>
      </div>
      
      {/* 内容 */}
        <div className="relative p-6 h-full flex flex-col" style={{ transform: 'translateZ(40px)' }}>
        {/* 图标 */}
        <div className="mb-6">
          <div className="w-[54px] h-[54px] bg-white rounded-[12px] flex items-center justify-center">
            <svg className="w-[37px] h-[37px] text-[#0075FF]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-6h2v6zm0-8h-2V7h2v4z"/>
            </svg>
          </div>
        </div>
        
        {/* 文本 */}
        <div className="mb-8 flex-1">
          <h3 className="text-white font-bold text-[14px] leading-[20px] mb-2">
            需要帮助？
          </h3>
          <p className="text-white font-normal text-[12px] leading-[12px] opacity-90">
            请查看我们的帮助文档
          </p>
        </div>
        
        {/* 查看按钮 */}
        <div className="flex justify-center">
          <Button
            variant="faded"
            size="lg"
            radius="lg"
            className="w-[300px] h-[66px] bg-gradient-to-br from-[#060b28]/74 to-[#0a0e23]/71 backdrop-blur-[10px] border-0 text-white font-bold text-[16px] hover:opacity-80 transition-opacity"
            onPress={onViewHelp}
          >
            查看
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;