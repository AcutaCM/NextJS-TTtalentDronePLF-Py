"use client";

import React from "react";
import Image from "next/image";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { SearchIcon, BellIcon, SettingsIcon } from "@/components/icons";
import LayoutToggle from "@/components/LayoutToggle";
import ComponentSelectorButton from "@/components/ComponentSelectorButton";
import AuthButtons from "@/components/AuthButtons";
import { useLayout } from "@/contexts/LayoutContext";
import { useDrone } from "@/contexts/DroneContext";
import { useLayout as useLayoutContext } from "@/contexts/LayoutContext";
import { useRouter } from "next/navigation";

// 添加搜索结果类型
interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'component' | 'setting' | 'mission' | 'drone';
  action: () => void;
}

interface DroneStatusProps {
  aiStatus: string;
  droneConnected: boolean;
  missionStatus: string;
  cruiseStatus: string;
  connectionStatus?: 'disconnected' | 'connecting' | 'connected' | 'error';
  aiConfigured?: boolean;
}

// 单个状态项组件 - iOS 16 风格
const StatusItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  variant: 'cruise' | 'mission' | 'drone' | 'ai';
  status?: 'normal' | 'active' | 'warning' | 'error' | 'connecting';
}> = ({ icon, label, variant, status = 'normal' }) => {
  // 根据状态确定样式
  const getStatusStyles = () => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 border-green-400/40 text-green-100';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-400/40 text-yellow-100';
      case 'error':
        return 'bg-red-500/20 border-red-400/40 text-red-100';
      case 'connecting':
        return 'bg-blue-500/20 border-blue-400/40 text-blue-100 animate-pulse';
      default:
        return 'bg-white/10 border-white/20 text-white/90';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-[6px] rounded-[12px] backdrop-blur-md transition-all duration-300 hover:bg-white/15 hover:border-white/30 ${getStatusStyles()}`}>
      <div className="w-4 h-4">
        {icon}
      </div>
      <span className="text-[11px] font-medium whitespace-nowrap tracking-wide">{label}</span>
    </div>
  );
};

const DroneStatus: React.FC<DroneStatusProps> = ({
  aiStatus,
  droneConnected,
  missionStatus,
  cruiseStatus,
  connectionStatus,
  aiConfigured,
}) => {
  // 根据状态确定图标和样式
  const getCruiseStatus = () => {
    if (cruiseStatus.includes('飞行中') || cruiseStatus.includes('起飞')) return 'active';
    if (cruiseStatus.includes('降落')) return 'warning';
    return 'normal';
  };

  const getMissionStatus = () => {
    if (missionStatus.includes('执行中')) return 'active';
    if (missionStatus.includes('准备中')) return 'connecting';
    if (missionStatus.includes('失败')) return 'error';
    if (missionStatus.includes('已完成')) return 'active';
    return 'normal';
  };

  const getDroneStatus = () => {
    switch (connectionStatus) {
      case 'connected': return 'active';
      case 'connecting': return 'connecting';
      case 'error': return 'error';
      default: return 'normal';
    }
  };

  const getAIStatus = () => {
    if (aiStatus.includes('在线')) return 'active';
    if (aiStatus.includes('连接中')) return 'connecting';
    if (aiStatus.includes('错误')) return 'error';
    return 'normal';
  };

  return (
    <div className="flex items-center gap-3">
      {/* 巡航状态 */}
      <StatusItem
        variant="cruise"
        status={getCruiseStatus()}
        icon={
          <svg viewBox="0 0 17 17" className="w-full h-full fill-current">
            <path d="M2 8.5L8.5 2L15 8.5L8.5 15L2 8.5Z" opacity="0.8"/>
            <circle cx="8.5" cy="8.5" r="2" fill="currentColor"/>
          </svg>
        }
        label={cruiseStatus}
      />
      
      {/* 任务状态 */}
      <StatusItem
        variant="mission"
        status={getMissionStatus()}
        icon={
          <svg viewBox="0 0 17 17" className="w-full h-full fill-current">
            <rect x="3" y="3" width="11" height="11" rx="2" opacity="0.6"/>
            <path d="M6 8.5L8 10.5L11 7.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        }
        label={missionStatus}
      />
      
      {/* 无人机连接状态 */}
      <StatusItem
        variant="drone"
        status={getDroneStatus()}
        icon={
          <svg viewBox="0 0 17 17" className="w-full h-full fill-current">
            <circle cx="8.5" cy="8.5" r="6" opacity="0.6"/>
            <rect x="7" y="7" width="3" height="3" rx="0.5"/>
            <path d="M5 5L12 12M12 5L5 12" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
          </svg>
        }
        label={`无人机：${droneConnected ? "已连接" : "未连接"}`}
      />
      
      {/* AI状态 */}
      <StatusItem
        variant="ai"
        status={getAIStatus()}
        icon={
          <svg viewBox="0 0 17 17" className="w-full h-full fill-current">
            <circle cx="8.5" cy="8.5" r="6" opacity="0.6"/>
            <circle cx="6" cy="7" r="1" fill="currentColor"/>
            <circle cx="11" cy="7" r="1" fill="currentColor"/>
            <path d="M6 11Q8.5 13 11 11" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        }
        label={aiStatus}
      />
    </div>
  );
};

const TopNavbar: React.FC = () => {
  const { isEditMode, hasUnsavedChanges, saveLayouts, visibleComponents, toggleComponentVisibility } = useLayout();
  const { droneState, getStatusText, connectToDrone, disconnectFromDrone } = useDrone();
  const router = useRouter();
  
  // 确保路由在客户端正确挂载
  const [isClient, setIsClient] = React.useState(false);
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 搜索状态
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = React.useState(false);

  const statusText = getStatusText();
  
  // 搜索处理函数
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim()) {
      setIsSearching(true);
      setShowSearchResults(true);
      
      // 模拟搜索过程
      setTimeout(() => {
        // 生成搜索结果
        const results: SearchResult[] = [];
        const query = value.toLowerCase();
        
        // 组件搜索
        const components = [
          { id: 'connection-control', name: '连接控制面板', desc: '管理无人机连接状态' },
          { id: 'mission-panel', name: '任务面板', desc: '创建和管理飞行任务' },
          { id: 'detection-control', name: '检测控制面板', desc: '控制AI视觉检测功能' },
          { id: 'video-stream', name: '视频流面板', desc: '查看实时视频流' },
          { id: 'strawberry-detection', name: '草莓检测卡片', desc: '查看草莓检测结果' },
          { id: 'manual-control', name: '手动控制面板', desc: '手动控制无人机' },
          { id: 'ai-analysis-report', name: 'AI分析报告', desc: '查看AI分析结果' },
          { id: 'challenge-cruise', name: '挑战巡航面板', desc: '执行预设巡航任务' },
          { id: 'ai-analysis-panel', name: 'AI分析面板', desc: '配置和启动AI分析' },
          { id: 'tools-panel', name: '工具面板', desc: '系统工具和QR码生成' },
          { id: 'configuration-panel', name: '配置面板', desc: 'AI和系统配置管理' },
          { id: 'simulation-panel', name: '模拟面板', desc: '模拟飞行环境' },
          { id: 'status-info-panel', name: '状态信息面板', desc: '系统状态和统计数据' },
          { id: 'system-log-panel', name: '系统日志面板', desc: '查看系统日志信息' },
          { id: 'video-control-panel', name: '视频控制面板', desc: '视频录制和截图控制' },
          { id: 'report-panel', name: '报告面板', desc: '生成和管理分析报告' },
          { id: 'chat-panel', name: '聊天面板', desc: '与AI助手交互' },
          { id: 'drone-control-panel', name: '无人机控制面板', desc: 'Tello无人机专用控制' },
          { id: 'tello-workflow-panel', name: 'Tello工作流面板', desc: '可视化编排Tello无人机任务流程' },
        ];
        
        components.forEach(comp => {
          if (comp.name.toLowerCase().includes(query) || comp.desc.toLowerCase().includes(query)) {
            results.push({
              id: comp.id,
              title: comp.name,
              description: comp.desc,
              type: 'component',
              action: () => {
                toggleComponentVisibility(comp.id);
                setSearchQuery("");
                setShowSearchResults(false);
              }
            });
          }
        });
        
        // 设置搜索
        const settingsItems = [
          { id: 'settings-account', name: '账户设置', desc: '管理账户信息和系统偏好', path: '/settings' },
          { id: 'settings-profile', name: '个人信息', desc: '更新个人资料和头像', path: '/settings?tab=profile' },
          { id: 'settings-security', name: '安全设置', desc: '修改密码和安全选项', path: '/settings?tab=security' },
          { id: 'settings-preferences', name: '系统偏好', desc: '自定义界面和功能设置', path: '/settings?tab=preferences' },
        ];
        
        settingsItems.forEach(item => {
          if (item.name.includes(query) || item.desc.includes(query)) {
            results.push({
              id: item.id,
              title: item.name,
              description: item.desc,
              type: 'setting',
              action: () => {
                if (isClient) {
                  router.push(item.path);
                }
                setSearchQuery("");
                setShowSearchResults(false);
              }
            });
          }
        });
        
        // 任务相关搜索
        const missionItems = [
          { id: 'mission-create', name: '创建任务', desc: '新建飞行任务', action: () => console.log('创建新任务') },
          { id: 'mission-list', name: '任务列表', desc: '查看所有飞行任务', action: () => console.log('查看任务列表') },
          { id: 'mission-history', name: '历史任务', desc: '查看已完成的任务', action: () => console.log('查看历史任务') },
        ];
        
        missionItems.forEach(item => {
          if (item.name.includes(query) || item.desc.includes(query)) {
            results.push({
              id: item.id,
              title: item.name,
              description: item.desc,
              type: 'mission',
              action: () => {
                item.action();
                setSearchQuery("");
                setShowSearchResults(false);
              }
            });
          }
        });
        
        // 无人机相关搜索
        const droneItems = [
          { id: 'drone-status', name: '无人机状态', desc: '查看无人机连接和状态信息', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
          { id: 'drone-connect', name: '连接无人机', desc: '建立与无人机的连接', action: () => {
            connectToDrone();
            // 显示连接状态提示
            console.log('正在连接无人机...');
          } },
          { id: 'drone-disconnect', name: '断开连接', desc: '断开与无人机的连接', action: () => {
            disconnectFromDrone();
            // 显示断开状态提示
            console.log('正在断开无人机连接...');
          } },
          { id: 'drone-calibrate', name: '校准无人机', desc: '执行无人机校准程序', action: () => console.log('校准无人机') },
        ];
        
        droneItems.forEach(item => {
          if (item.name.includes(query) || item.desc.includes(query)) {
            results.push({
              id: item.id,
              title: item.name,
              description: item.desc,
              type: 'drone',
              action: () => {
                item.action();
                setSearchQuery("");
                setShowSearchResults(false);
              }
            });
          }
        });
        
        // 帮助和系统信息搜索
        const helpItems = [
          { id: 'help-docs', name: '使用文档', desc: '查看系统使用说明', action: () => window.open('/help', '_blank') },
          { id: 'help-tutorials', name: '视频教程', desc: '观看操作视频教程', action: () => window.open('/tutorials', '_blank') },
          { id: 'help-faq', name: '常见问题', desc: '查看常见问题解答', action: () => window.open('/faq', '_blank') },
          { id: 'system-info', name: '系统信息', desc: '查看系统版本和配置', action: () => console.log('显示系统信息') },
          { id: 'system-logs', name: '系统日志', desc: '查看详细系统日志', action: () => console.log('显示系统日志') },
        ];
        
        helpItems.forEach(item => {
          if (item.name.includes(query) || item.desc.includes(query)) {
            results.push({
              id: item.id,
              title: item.name,
              description: item.desc,
              type: 'setting', // 使用设置类型图标
              action: () => {
                item.action();
                setSearchQuery("");
                setShowSearchResults(false);
              }
            });
          }
        });
        
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  };
  
  // 失去焦点时隐藏搜索结果
  const handleSearchBlur = () => {
    // 延迟隐藏，以便点击结果时不会立即消失
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };
  
  // 获得焦点时显示搜索结果
  const handleSearchFocus = () => {
    if (searchQuery.trim() && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  return (
    <div className="w-full h-[51px] flex items-center justify-between px-6 bg-transparent mt-4 relative">
      {/* 左侧 Logo 区域 */}
      <div className="flex items-center gap-2">
        <Image src="/logo.svg" alt="TTtalentDev Logo" width={61} height={47} />
        <div>
          <div className="text-white text-base font-normal leading-6">
            TTtalentDev无人机作业平台
          </div>
          <div className="text-white text-sm font-normal leading-tight">
            DRONE PLF
          </div>
        </div>
      </div>
      
      {/* 中间 无人机状态 */}
      <DroneStatus
        aiStatus={statusText.ai}
        droneConnected={droneState.isConnected}
        missionStatus={statusText.mission}
        cruiseStatus={statusText.cruise}
        connectionStatus={droneState.connectionStatus}
        aiConfigured={droneState.aiApiConfigured}
      />
      
      {/* 右侧 用户操作区域 */}
      <div className="flex items-center gap-4">
        {/* 搜索框 */}
        <div className="w-[250px] relative mr-2">
          <Input
            placeholder="搜索组件、任务或设置..."
            size="sm"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            startContent={
              isSearching ? (
                <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              ) : (
                <SearchIcon className="w-4 h-4 text-gray-600" />
              )
            }
            classNames={{
              base: "h-[35px]",
              mainWrapper: "h-full",
              input: "text-xs text-gray-200 placeholder:text-gray-500",
              inputWrapper: "h-full bg-[#0F1535] border-[0.5px] border-white/30 rounded-[15px] hover:border-white/50 focus-within:border-blue-400/70",
            }}
          />
          
          {/* 搜索结果下拉框 */}
          {showSearchResults && (
            <div 
              className="absolute top-full left-0 right-0 mt-2 bg-[#0F1535] border border-white/20 rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()} // 防止失去焦点
            >
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/10 last:border-b-0 transition-colors"
                    onClick={result.action}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        result.type === 'component' ? 'bg-blue-500/20' :
                        result.type === 'setting' ? 'bg-purple-500/20' :
                        result.type === 'mission' ? 'bg-green-500/20' :
                        'bg-yellow-500/20'
                      }`}>
                        {result.type === 'component' && (
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        )}
                        {result.type === 'setting' && (
                          <SettingsIcon className="w-4 h-4 text-purple-400" />
                        )}
                        {result.type === 'mission' && (
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                        {result.type === 'drone' && (
                          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white text-sm font-medium truncate">{result.title}</div>
                        <div className="text-white/60 text-xs truncate">{result.description}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-center">
                  <div className="text-white/60 text-sm">未找到相关结果</div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 用户认证区域 */}
        <AuthButtons />
        
        {/* 设置图标 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="w-6 h-6 min-w-6 opacity-33"
          onPress={() => isClient && router.push('/settings')}
        >
          <SettingsIcon className="w-4 h-4 text-white" />
        </Button>
        
        {/* 通知图标 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="w-6 h-6 min-w-6 opacity-33"
        >
          <BellIcon className="w-4 h-4 text-white" />
        </Button>

        {/* Dify 图标按钮 */}
        <Button
          isIconOnly
          size="sm"
          variant="light"
          className="w-6 h-6 min-w-6 opacity-80 hover:opacity-100"
          onPress={() => { if (isClient) window.open('http://localhost', '_blank', 'noopener,noreferrer'); }}
          aria-label="Open Dify"
        >
          <Image src="/dify-logo.svg?v=1" alt="Dify" width={20} height={20} className="w-5 h-5" />
        </Button>
        
        {/* 组件选择器按钮 */}
        <ComponentSelectorButton />
        
        {/* 布局编辑图标 */}
        <LayoutToggle />

        {/* 应用更改按钮 - 仅在编辑模式且有未保存更改时显示 */}
        {isEditMode && hasUnsavedChanges && (
          <Button
            size="sm"
            color="success"
            variant="solid"
            onPress={saveLayouts}
            className="font-medium text-white shadow-lg shadow-green-500/30 animate-in fade-in zoom-in-90"
          >
            应用更改
          </Button>
        )}
      </div>
    </div>
  );
};

export default TopNavbar;