'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';

// 组件布局数据类型
export interface ComponentLayout {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  scale?: number;
}

// 布局上下文类型
interface LayoutContextType {
  isEditMode: boolean;
  setEditMode: (enabled: boolean) => void;
  layouts: Record<string, ComponentLayout>;
  updateLayout: (id: string, layout: Partial<ComponentLayout>, isUserModification?: boolean) => void;
  saveLayouts: () => void;
  loadLayouts: () => void;
  resetLayouts: () => void;
  visibleComponents: string[];
  setVisibleComponents: (components: string[]) => void;
  toggleComponentVisibility: (componentId: string) => void;
  isComponentVisible: (componentId: string) => boolean;
  userModifiedComponents: Set<string>;
  applyTemplateLayout: (templateLayout: Record<string, ComponentLayout>) => void;
  hasUnsavedChanges: boolean;
  showComponentSelector: boolean;
  setShowComponentSelector: (show: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

// 默认布局配置 - 基于Figma设计文件的组件位置
const DEFAULT_LAYOUTS: Record<string, ComponentLayout> = {
  // 连接控制面板 - 左上角
  'connection-control': {
    id: 'connection-control',
    position: { x: 50, y: 100 },
    size: { width: 380, height: 280 },
  },
  // 挑战卡任务面板 - 中上
  'mission-panel': {
    id: 'mission-panel',
    position: { x: 460, y: 100 },
    size: { width: 380, height: 320 },
  },
  // 检测控制面板 - 右上
  'detection-control': {
    id: 'detection-control',
    position: { x: 870, y: 100 },
    size: { width: 380, height: 280 },
  },
  // 帮助面板 - 右上角
  'help-panel': {
    id: 'help-panel',
    position: { x: 1280, y: 100 },
    size: { width: 350, height: 300 },
  },
  // 视频流面板 - 中央主要区域
  'video-stream': {
    id: 'video-stream',
    position: { x: 460, y: 450 },
    size: { width: 790, height: 450 },
  },
  // 草莓检测 - 左下
  'strawberry-detection': {
    id: 'strawberry-detection',
    position: { x: 50, y: 450 },
    size: { width: 380, height: 200 },
  },
  // 手动控制 - 左下方
  'manual-control': {
    id: 'manual-control',
    position: { x: 50, y: 680 },
    size: { width: 380, height: 220 },
  },
  // QR 扫描 - 右下角小组件
  'qr-scan': {
    id: 'qr-scan',
    position: { x: 1280, y: 450 },
    size: { width: 350, height: 180 },
  },
  // Tello 智能代理 - 中央右侧
  'tello-intelligent-agent': {
    id: 'tello-intelligent-agent',
    position: { x: 1300, y: 100 },
    size: { width: 600, height: 800 },
  },
  // 虚拟位置视图 - 底部中央
  'virtual-position': {
    id: 'virtual-position',
    position: { x: 460, y: 930 },
    size: { width: 790, height: 250 },
  },
  // AI分析报告 - 右侧中部
  'ai-analysis-report': {
    id: 'ai-analysis-report',
    position: { x: 1280, y: 660 },
    size: { width: 350, height: 400 },
  },
  // 新增：YOLO 模型管理面板 - 右侧靠上
  'yolo-model-manager': {
    id: 'yolo-model-manager',
    position: { x: 1280, y: 1080 },
    size: { width: 350, height: 300 },
    scale: 1,
  },
  // 电池状态 - 右下
  'battery-status': {
    id: 'battery-status',
    position: { x: 1280, y: 1090 },
    size: { width: 350, height: 200 },
  },
  // 应用信息 - 最右下
  'app-info': {
    id: 'app-info',
    position: { x: 1280, y: 1320 },
    size: { width: 350, height: 150 },
  },
  // 新增：聊天面板 - 右下角浮动
  'chat-panel': {
    id: 'chat-panel',
    position: { x: 1680, y: 980 },
    size: { width: 420, height: 560 },
  },
};

// 兼容老版本 key 的迁移映射
const KEY_MIGRATIONS: Record<string, string> = {
  'mission-pad': 'mission-panel',
};

const STORAGE_KEY = 'drone-analyzer-layouts';
const VISIBILITY_STORAGE_KEY = 'drone-analyzer-visible-components';
const USER_MODIFIED_KEY = 'drone-analyzer-user-modified-components';

// 默认可见组件列表 - 针对DJI Tello无人机优化
const DEFAULT_VISIBLE_COMPONENTS = [
  // DJI Tello 核心控制组件
  'connection-control',        // 连接控制 - 必需
  'video-stream',             // 视频流 - 核心功能
  'manual-control',           // 手动控制 - 基础飞行
  'battery-status',           // 电池状态 - 重要监控
  
  // 基础检测和AI功能
  'detection-control',        // 检测控制 - AI分析
  'qr-scan',                 // QR扫描 - 实用功能
  'ai-analysis-report',       // AI分析报告 - 核心AI功能
  'yolo-model-manager',       // YOLO 模型管理面板
  'chat-panel',              // AI聊天面板 - 智能交互
  
  // 系统信息
  'app-info',                // 应用信息
  'help-panel'               // 帮助面板
];

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [layouts, setLayouts] = useState<Record<string, ComponentLayout>>(DEFAULT_LAYOUTS);
  const [isEditMode, setIsEditMode] = useState(false);
  const [userModifiedComponents, setUserModifiedComponents] = useState<Set<string>>(new Set());
  const [visibleComponents, setVisibleComponents] = useState<string[]>(DEFAULT_VISIBLE_COMPONENTS);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showComponentSelector, setShowComponentSelector] = useState(false);

  const layoutsRef = useRef(layouts);
  const userModifiedComponentsRef = useRef(userModifiedComponents);
  const visibleComponentsRef = useRef(visibleComponents);

  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  useEffect(() => {
    userModifiedComponentsRef.current = userModifiedComponents;
  }, [userModifiedComponents]);

  useEffect(() => {
    visibleComponentsRef.current = visibleComponents;
  }, [visibleComponents]);

  const loadLayouts = useCallback(() => {
    try {
      const savedLayouts = localStorage.getItem(STORAGE_KEY);
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        // 将保存的布局与默认布局合并，确保所有组件都有布局数据
        const mergedLayouts = { ...DEFAULT_LAYOUTS, ...parsedLayouts };
        setLayouts(mergedLayouts);
      } else {
        // 如果没有保存的布局，使用默认布局
        setLayouts(DEFAULT_LAYOUTS);
      }

      const savedUserModified = localStorage.getItem(USER_MODIFIED_KEY);
      if (savedUserModified) {
        setUserModifiedComponents(new Set(JSON.parse(savedUserModified)));
      }

      const savedVisibility = localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (savedVisibility) {
        setVisibleComponents(JSON.parse(savedVisibility));
      }
    } catch (error) {
      console.error('Failed to load data from storage', error);
      setLayouts(DEFAULT_LAYOUTS);
      setUserModifiedComponents(new Set());
      setVisibleComponents(DEFAULT_VISIBLE_COMPONENTS);
    }
  }, []);

  // 组件挂载时自动加载保存的数据
  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  const saveLayouts = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutsRef.current));
      localStorage.setItem(USER_MODIFIED_KEY, JSON.stringify(Array.from(userModifiedComponentsRef.current)));
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibleComponentsRef.current));
      console.log('Layouts saved successfully!');
      setHasUnsavedChanges(false);
      setIsEditMode(false); // Exit edit mode after saving
    } catch (error) {
      console.error('Failed to save layouts to storage', error);
    }
  }, []);

  const setEditMode = useCallback((enabled: boolean) => {
    if (isEditMode && !enabled && hasUnsavedChanges) {
      // If exiting edit mode with unsaved changes, we can prompt the user or auto-save.
      // Current implementation relies on manual "Apply" button click.
    }
    setIsEditMode(enabled);
  }, [isEditMode, hasUnsavedChanges]);

  const updateLayout = useCallback((id: string, layout: Partial<ComponentLayout>, isUserModification = true) => {
    setLayouts(prevLayouts => {
      const newLayouts = {
        ...prevLayouts,
        [id]: { ...prevLayouts[id], ...layout },
      };
      layoutsRef.current = newLayouts; // Sync ref immediately

      if (isUserModification) {
        setUserModifiedComponents(prev => {
          const newModified = new Set(prev).add(id);
          userModifiedComponentsRef.current = newModified; // Sync ref immediately
          return newModified;
        });
        setHasUnsavedChanges(true); // 标记有未保存的更改
      }

      return newLayouts;
    });
  }, []);

  const applyTemplateLayout = useCallback((templateLayout: Record<string, ComponentLayout>) => {
    setLayouts(prev => {
      const newLayouts = { ...prev };
      
      // 只更新模板中定义的组件，但保留用户手动修改的组件
      Object.entries(templateLayout).forEach(([componentId, layout]) => {
        // 如果组件没有被用户手动修改过，则应用模板布局
        if (!userModifiedComponentsRef.current.has(componentId)) {
          newLayouts[componentId] = layout;
        }
      });
      
      layoutsRef.current = newLayouts; // Sync ref immediately
      return newLayouts;
    });
    // 不清空用户修改记录，保持用户的手动修改
  }, []);

  const resetLayouts = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    layoutsRef.current = DEFAULT_LAYOUTS; // Sync ref immediately
    setUserModifiedComponents(new Set());
    userModifiedComponentsRef.current = new Set(); // Sync ref immediately
    setVisibleComponents(DEFAULT_VISIBLE_COMPONENTS);
    visibleComponentsRef.current = DEFAULT_VISIBLE_COMPONENTS; // Sync ref immediately
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_MODIFIED_KEY);
    localStorage.removeItem(VISIBILITY_STORAGE_KEY);
  }, []);

  const toggleComponentVisibility = useCallback((id: string) => {
    setVisibleComponents(prev => {
      const isVisible = prev.includes(id);
      const newVisible = isVisible ? prev.filter(compId => compId !== id) : [...prev, id];
      visibleComponentsRef.current = newVisible; // Sync ref immediately
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(newVisible));
      return newVisible;
    });
  }, []);

  const isComponentVisible = useCallback((id: string) => {
    return visibleComponents.includes(id);
  }, [visibleComponents]);

  useEffect(() => {
    loadLayouts();
  }, [loadLayouts]);

  const value: LayoutContextType = {
    layouts,
    isEditMode,
    setEditMode,
    updateLayout,
    saveLayouts,
    loadLayouts,
    resetLayouts,
    visibleComponents,
    setVisibleComponents,
    toggleComponentVisibility,
    isComponentVisible,
    userModifiedComponents,
    applyTemplateLayout,
    hasUnsavedChanges,
    showComponentSelector,
    setShowComponentSelector,
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

// 使用布局上下文的Hook
export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

// 获取特定组件布局的Hook
export const useComponentLayout = (componentId: string) => {
  const { layouts, updateLayout, isEditMode } = useLayout();
  
  // 优先使用保存的布局，如果没有则使用默认布局
  const layout = layouts[componentId] || DEFAULT_LAYOUTS[componentId] || {
    id: componentId,
    position: { x: 100, y: 100 },
    size: { width: 300, height: 200 }
  };
  
  const updateComponentLayout = useCallback((newLayout: Partial<ComponentLayout>) => {
    updateLayout(componentId, newLayout);
  }, [componentId, updateLayout]);
  
  return {
    layout,
    updateLayout: updateComponentLayout,
    isEditMode
  };
};