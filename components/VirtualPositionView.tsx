import React from 'react';
import { Card, CardBody } from '@nextui-org/react';
import AnimatedList from './ui/AnimatedList';

// 消息项组件
type MessageItemProps = {
  status: 'waiting' | 'success';
  title: string;
  description: string;
};

const MessageItem: React.FC<MessageItemProps> = ({ status, title, description }) => (
  <div className={`flex items-center p-[2%] rounded-lg mb-[3%] ${status === 'success' ? 'bg-green-700/20' : 'bg-gray-700/30'}`}>
    <div className={`w-[1.5rem] h-[1.5rem] rounded-full flex items-center justify-center mr-[4%] ${status === 'success' ? 'bg-green-500' : 'bg-gray-500'}`}>
      {status === 'success' ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
    </div>
    <div className="flex-grow">
      <p className="text-white font-semibold text-[0.875rem]">{title}</p>
      <p className="text-gray-400 text-[0.75rem]">{description}</p>
    </div>
    <button className="text-gray-400 hover:text-white">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
);

// 与useDroneControl中的结构保持一致的最小接口
interface MissionPositionPayload {
  current_pad?: number | string;
  coords?: { x: number; y: number; z: number };
  target_pad?: number | string;
  progress?: number | null;
  note?: string | null;
  timestamp?: string;
}

interface MissionMessage {
  id: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp?: string;
}

interface VirtualPositionViewProps {
  position?: MissionPositionPayload | null;
  messages?: MissionMessage[];
  pendingTasks?: MissionMessage[]; // 新增：待执行任务列表
}

export default function VirtualPositionView({ position, messages = [] }: VirtualPositionViewProps) {
  // 进度用于在两点之间绘制无人机当前位置
  const progress = Math.max(0, Math.min(1, (position?.progress ?? 0) as number));
  const leftPercent = 25 + 50 * progress; // Left从25%到75%

  const currentPad = position?.current_pad ?? '-';
  const targetPad = position?.target_pad ?? '-';
  const coords = position?.coords ? `[${position.coords.x}, ${position.coords.y}, ${position.coords.z}]` : '[-, -, -]';

  return (
    <Card className="w-full h-full bg-[#10182b] border-0 rounded-[21px] p-[2%]">
      <CardBody className="p-0 flex flex-row gap-4">
        {/* Left Side - Map View */}
        <div className="w-2/3 h-full bg-[#0a0e1b] rounded-[20px] p-[4%] relative">
          <div className="text-white mb-[6%]">
            <h2 className="font-bold text-[1.125rem]">无人机位置视图</h2>
            <p className="text-[0.875rem] text-gray-400">POSITION</p>
          </div>
          <div className="relative w-full h-4/5">
            {/* 固定的两个PAD点：1 与 6 */}
            <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-[12%] h-[12%] min-w-[48px] min-h-[48px] bg-gray-700 border-2 border-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-[1.125rem]">1</span>
              </div>
            </div>
            <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2">
              <div className="w-[12%] h-[12%] min-w-[48px] min-h-[48px] bg-gray-700 border-2 border-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-[1.125rem]">6</span>
              </div>
            </div>
            {/* 连线 */}
            <svg className="absolute w-full h-full top-0 left-0">
              <line x1="25%" y1="50%" x2="75%" y2="50%" stroke="#4A5568" strokeWidth="2" strokeDasharray="5,5" />
            </svg>
            {/* 无人机当前位置（根据progress渲染） */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${leftPercent}%` }}
            >
              <div className="w-[12px] h-[12px] rounded-full bg-orange-400 border border-orange-200 shadow-lg" title={`PAD${currentPad} -> PAD${targetPad}`}></div>
            </div>
          </div>
          <div className="absolute bottom-[4%] left-[4%] text-white text-[0.75rem]">
            <p>当前位置：卡 {String(currentPad)}</p>
            <p>目标位置：卡 {String(targetPad)}</p>
            <p>坐标信息：{coords}</p>
            {position?.timestamp ? <p>时间：{position.timestamp}</p> : null}
          </div>
        </div>

        {/* Right Side - Message List */}
        <div className="w-1/3 h-full flex flex-col">
          <h3 className="text-white font-semibold mb-[3%] text-[1rem]">消息列表：</h3>
          <div className="w-full border-t border-gray-700 mb-[4%]"></div>
          <div className="flex-grow">
            <AnimatedList
              items={messages}
              renderItem={(msg) => (
                <MessageItem
                  status={msg.level === 'success' ? 'success' : 'waiting'}
                  title={msg.message}
                  description={msg.timestamp || ''}
                />
              )}
              maxHeight="100%"
              itemHeight={80}
              showGradients={true}
              enableArrowNavigation={false}
              emptyState={
                <div className="text-gray-400 text-center py-4">
                  <i className="fas fa-inbox text-xl mb-2 block"></i>
                  <p className="text-[0.8rem]">暂无任务消息</p>
                </div>
              }
            />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}