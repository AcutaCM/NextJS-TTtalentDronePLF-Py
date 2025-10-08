"use client";

import { Card, CardBody } from "@nextui-org/react";
import { Chip } from "@nextui-org/react";
import AnimatedList from './ui/AnimatedList';

interface DronePositionPanelProps {
  currentPosition?: string;
  coordinates?: [number, number, number];
  messages?: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    description: string;
    timestamp: Date;
  }>;
}

export default function DronePositionPanel({
  currentPosition = "卡1",
  coordinates = [12, 100, 20],
  messages = [
    {
      id: '1',
      type: 'info',
      title: '正在停留',
      description: 'NOW WAITING',
      timestamp: new Date()
    },
    {
      id: '2', 
      type: 'success',
      title: '找到PAD1上方',
      description: 'MISSON PAD 1 FOUNDED',
      timestamp: new Date()
    },
    {
      id: '3',
      type: 'success', 
      title: '飞向PAD1',
      description: 'FLYING TO MISSION PAD 1',
      timestamp: new Date()
    }
  ]
}: DronePositionPanelProps) {
  
  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          iconBg: 'bg-green-500/20',
          iconColor: 'text-green-400',
          titleColor: 'text-green-300',
          descColor: 'text-green-400/80'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/20', 
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-300',
          descColor: 'text-blue-400/80'
        };
    }
  };

  const getIcon = (type: string) => {
    if (type === 'success') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    );
  };

  return (
    <Card className="w-[356px] h-[332px] bg-slate-900/60 backdrop-blur border border-slate-600/40">
      <CardBody className="p-4 space-y-4">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl" />
        
        {/* 标题 */}
        <div className="relative z-10">
          <h3 className="text-sm font-semibold text-white mb-1">无人机位置视图</h3>
          <p className="text-xs text-slate-400 font-medium tracking-wider">POSITION</p>
        </div>

        {/* 位置可视化区域 */}
        <div className="relative z-10 bg-slate-800/50 rounded-2xl p-4 border border-slate-600/30">
          <div className="flex items-center justify-between mb-3">
            {/* 起点 */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-400">1</span>
              </div>
            </div>
            
            {/* 连接线 */}
            <div className="flex-1 mx-3">
              <div className="h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 relative">
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* 终点 */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-slate-600/50 border-2 border-slate-500 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-400">6</span>
              </div>
            </div>
          </div>
          
          {/* 当前位置信息 */}
          <div className="text-xs text-slate-300">
            <div>当前位置：{currentPosition}</div>
            <div className="text-slate-400">坐标信息：[{coordinates.join(',')}]</div>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="relative z-10">
          <div className="flex items-center mb-3">
            <h4 className="text-xs font-medium text-slate-300">消息列表：</h4>
            <div className="flex-1 ml-2 h-px bg-gradient-to-r from-slate-600 to-transparent opacity-40" />
          </div>
          
          <AnimatedList
            items={messages.slice(0, 3)}
            renderItem={(message) => {
              const styles = getAlertStyles(message.type);
              return (
                <div
                  className={`${styles.bg} ${styles.border} border rounded-2xl p-3 flex items-start gap-3 mx-1 my-1`}
                >
                  <div className={`${styles.iconBg} ${styles.iconColor} w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getIcon(message.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-medium ${styles.titleColor} mb-0.5`}>
                      {message.title}
                    </div>
                    <div className={`text-xs ${styles.descColor}`}>
                      {message.description}
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-300 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              );
            }}
            maxHeight="128px"
            itemHeight={70}
            showGradients={true}
            enableArrowNavigation={false}
            emptyState={
              <div className="text-xs text-slate-400 text-center py-4">
                暂无消息
              </div>
            }
          />
        </div>
      </CardBody>
    </Card>
  );
}