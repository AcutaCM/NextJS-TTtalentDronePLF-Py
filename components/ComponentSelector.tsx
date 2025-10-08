"use client";

import React, { useState } from 'react';
import { Card, CardBody } from '@heroui/card';
import { Button } from '@heroui/button';
import { Badge } from '@heroui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface ComponentInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'control' | 'analysis' | 'info' | 'video';
}

interface ComponentSelectorProps {
  isVisible: boolean;
  onSelectComponent: (componentId: string) => void;
  onClose: () => void;
  selectedComponents: string[];
}

const AVAILABLE_COMPONENTS: ComponentInfo[] = [
  {
    id: 'drone-control-panel',
    name: 'Tello 无人机控制面板',
    description: '完整的 Tello 无人机控制和状态管理',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
      </svg>
    )
  },
  {
    id: 'tello-intelligent-agent',
    name: 'Tello 智能代理',
    description: '基于自然语言的 Tello 无人机智能控制系统',
    category: 'ai',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    id: 'connection-control',
    name: '连接控制面板',
    description: '管理无人机连接状态',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    )
  },
  {
    id: 'mission-panel',
    name: '任务控制面板',
    description: '控制无人机任务执行',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  {
    id: 'detection-control',
    name: '检测控制面板',
    description: '控制AI检测功能',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  {
    id: 'help-panel',
    name: '帮助面板',
    description: '显示帮助信息和指南',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'video-stream',
    name: '视频流',
    description: '显示无人机视频流',
    category: 'video',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'strawberry-detection',
    name: '草莓检测卡片',
    description: '草莓识别和分析',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  {
    id: 'manual-control',
    name: '手动控制面板',
    description: '手动控制无人机',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    )
  },
  {
    id: 'qr-scan',
    name: 'QR扫描面板',
    description: 'QR码扫描和识别',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    )
  },
  {
    id: 'virtual-position',
    name: '虚拟位置视图',
    description: '显示无人机位置信息',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'ai-analysis-report',
    name: 'AI分析报告',
    description: 'AI分析结果和报告',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'battery-status',
    name: '电池状态面板',
    description: '显示电池状态信息',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <path d="m23 13-2-2 2-2" />
      </svg>
    )
  },
  {
    id: 'app-info',
    name: '应用信息面板',
    description: '显示应用版本和信息',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'challenge-cruise',
    name: '挑战巡航面板',
    description: '挑战卡识别和巡航控制',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    id: 'ai-analysis-panel',
    name: 'AI分析面板',
    description: 'AI分析任务控制和配置',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    id: 'tools-panel',
    name: '工具面板',
    description: '二维码生成和系统工具',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'configuration-panel',
    name: '配置面板',
    description: 'AI配置和系统设置',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
      </svg>
    )
  },
  {
    id: 'simulation-panel',
    name: '模拟面板',
    description: '模拟检测和测试功能',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v14a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
      </svg>
    )
  },
  {
    id: 'status-info-panel',
    name: '状态信息面板',
    description: '系统状态和运行信息',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    id: 'system-log-panel',
    name: '系统日志面板',
    description: '系统日志查看和管理',
    category: 'info',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    id: 'video-control-panel',
    name: '视频控制面板',
    description: '视频录制和控制功能',
    category: 'video',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'report-panel',
    name: '报告面板',
    description: '报告生成和管理',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  // 新增：YOLO 模型管理面板
  {
    id: 'yolo-model-manager',
    name: 'YOLO 模型管理面板',
    description: '上传/管理/应用 YOLO 模型到 Tello 检测',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4l6 4v8l-6 4-6-4V8l6-4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9h4M10 13h4" />
      </svg>
    )
  },
  // 新增：智能模型选择器
  {
    id: 'enhanced-model-selector',
    name: '智能模型选择器',
    description: '直观的YOLO模型选择和实时切换界面',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
      </svg>
    )
  },
  // 新增：紧凑模型选择器
  {
    id: 'compact-model-selector',
    name: '紧凑模型选择器',
    description: '简洁的模型快速切换工具栏',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="12" r="2" fill="currentColor" opacity="0.3" />
      </svg>
    )
  },
  // 新增：AI 聊天助手
  {
    id: 'chat-panel',
    name: 'AI 聊天助手',
    description: '与本地 AI 对话，咨询任务与分析',
    category: 'analysis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h6m-6 4h4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 01-4 4H7l-4 4V7a4 4 0 014-4h10a4 4 0 014 4v8z" />
      </svg>
    )
  },
  // 新增：工作流面板},

  {
    id: 'tello-workflow-panel',
    name: 'Tello工作流面板',
    description: '可视化编排和执行无人机任务',
    category: 'control',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  }
];

const CATEGORY_COLORS = {
  control: 'bg-blue-500/20 border-blue-400/30 text-blue-400',
  analysis: 'bg-green-500/20 border-green-400/30 text-green-400',
  info: 'bg-purple-500/20 border-purple-400/30 text-purple-400',
  video: 'bg-orange-500/20 border-orange-400/30 text-orange-400'
};

const CATEGORY_NAMES = {
  control: '控制',
  analysis: '分析',
  info: '信息',
  video: '视频'
};

const ComponentSelector: React.FC<ComponentSelectorProps> = ({
  isVisible,
  onSelectComponent,
  onClose,
  selectedComponents
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number; id: string } | null>(null);
  
  const handleCardClick = (componentId: string, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setClickPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: componentId
    });
    
    // 清除点击效果
    setTimeout(() => setClickPosition(null), 600);
    
    onSelectComponent(componentId);
  };

  const filteredComponents = selectedCategory === 'all' 
    ? AVAILABLE_COMPONENTS 
    : AVAILABLE_COMPONENTS.filter(comp => comp.category === selectedCategory);

  const categories = ['all', ...Array.from(new Set(AVAILABLE_COMPONENTS.map(comp => comp.category)))];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full h-full bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardBody className="p-6">
                {/* 标题栏 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">组件选择器</h2>
                    <p className="text-white/70 text-sm">选择要添加到布局中的组件</p>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    className="text-white/70 hover:text-white"
                    onPress={onClose}
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>

                {/* 分类筛选 */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      size="sm"
                      variant={selectedCategory === category ? "solid" : "bordered"}
                      className={`
                        min-w-fit whitespace-nowrap
                        ${selectedCategory === category 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'bg-white/5 text-white/70 border-white/20 hover:bg-white/10'
                        }
                      `}
                      onPress={() => setSelectedCategory(category)}
                    >
                      {category === 'all' ? '全部' : CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}
                    </Button>
                  ))}
                </div>

                {/* 组件网格 */}
                <div className="max-h-[50vh] overflow-y-auto">
                  {filteredComponents.length === 0 ? (
                    <div className="text-white/60 text-center py-8">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                      </svg>
                      <p>没有找到匹配的组件</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                      {filteredComponents.map((component, index) => {
                        const isSelected = selectedComponents.includes(component.id);
                        const isHovered = hoveredCard === component.id;
                        return (
                          <motion.div
                            key={component.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            className="relative cursor-pointer group"
                            onClick={(e) => handleCardClick(component.id, e)}
                            onMouseEnter={() => setHoveredCard(component.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMousePosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top
                              });
                            }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              transform: isHovered ? 'perspective(1000px) rotateX(2deg) rotateY(2deg)' : 'none',
                              transition: 'transform 0.3s ease'
                            }}
                          >
                            {/* 聚光灯效果 */}
                            {isHovered && (
                              <div
                                className="absolute inset-0 rounded-lg pointer-events-none"
                                style={{
                                  background: `radial-gradient(300px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.15), transparent 40%)`,
                                  zIndex: 1
                                }}
                              />
                            )}
                            
                            {/* 边框发光效果 */}
                            {isHovered && (
                              <div
                                className="absolute inset-0 rounded-lg pointer-events-none"
                                style={{
                                  background: `linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.4) 50%, transparent)`,
                                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                  maskComposite: 'xor',
                                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                  WebkitMaskComposite: 'xor',
                                  padding: '1px',
                                  zIndex: 2
                                }}
                              />
                            )}
                            
                            {/* 粒子效果 */}
                             {isHovered && (
                               <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                                 {[...Array(8)].map((_, i) => (
                                   <motion.div
                                     key={i}
                                     className="absolute w-1 h-1 bg-blue-400 rounded-full"
                                     initial={{
                                       x: Math.random() * 100 + '%',
                                       y: Math.random() * 100 + '%',
                                       opacity: 0
                                     }}
                                     animate={{
                                       x: [null, Math.random() * 100 + '%'],
                                       y: [null, Math.random() * 100 + '%'],
                                       opacity: [0, 1, 0]
                                     }}
                                     transition={{
                                       duration: 2 + Math.random() * 2,
                                       repeat: Infinity,
                                       delay: i * 0.2
                                     }}
                                   />
                                 ))}
                               </div>
                             )}
                             
                             {/* 点击波纹效果 */}
                             {clickPosition && clickPosition.id === component.id && (
                               <motion.div
                                 className="absolute pointer-events-none rounded-full bg-blue-400/30"
                                 style={{
                                   left: clickPosition.x - 25,
                                   top: clickPosition.y - 25,
                                   width: 50,
                                   height: 50,
                                   zIndex: 4
                                 }}
                                 initial={{ scale: 0, opacity: 0.8 }}
                                 animate={{ scale: 4, opacity: 0 }}
                                 transition={{ duration: 0.6, ease: "easeOut" }}
                               />
                             )}
                            
                            <Card 
                              className={`
                                relative transition-all duration-300 h-full overflow-hidden
                                ${isSelected 
                                  ? 'bg-blue-500/20 border-blue-400/50 shadow-lg shadow-blue-500/20' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }
                                ${isHovered ? 'border-blue-400/30 shadow-lg shadow-blue-500/20' : ''}
                              `}
                              style={{ zIndex: 3 }}
                            >
                              <CardBody className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`
                                    p-2 rounded-lg flex-shrink-0
                                    ${CATEGORY_COLORS[component.category]}
                                  `}>
                                    {component.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-medium text-sm mb-1 truncate">
                                      {component.name}
                                    </h3>
                                    <p className="text-white/60 text-xs leading-relaxed">
                                      {component.description}
                                    </p>
                                    <Badge 
                                      size="sm" 
                                      className={`mt-2 ${CATEGORY_COLORS[component.category]}`}
                                    >
                                      {CATEGORY_NAMES[component.category]}
                                    </Badge>
                                  </div>
                                </div>
                                {isSelected && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute top-2 right-2"
                                  >
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  </motion.div>
                                )}
                              </CardBody>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 底部操作栏 */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                  <div className="text-white/60 text-sm">
                    已选择 {selectedComponents.length} 个组件
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="bordered"
                      className="bg-white/5 text-white/70 border-white/20 hover:bg-white/10"
                      onPress={onClose}
                    >
                      取消
                    </Button>
                    <Button
                      className="bg-blue-500 text-white hover:bg-blue-600"
                      onPress={onClose}
                    >
                      完成
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ComponentSelector;