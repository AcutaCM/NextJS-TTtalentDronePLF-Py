import React from 'react';
import ChatbotChat from './ChatbotChat';

interface ChatDockProps {
  title?: string;
}

const ChatDock: React.FC<ChatDockProps> = ({ title = 'AI 助手' }) => {
  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-slate-900/60 border border-white/10 rounded-[16px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-white/5">
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-white/60 text-xs"></div>
      </div>
      <div className="flex-1 min-h-0 p-2">
        <div className="w-full h-full min-h-0 flex flex-col">
          {/* 嵌入本地 ChatbotChat 组件 */}
          <ChatbotChat />
        </div>
      </div>
    </div>
  );
};

export default ChatDock; 