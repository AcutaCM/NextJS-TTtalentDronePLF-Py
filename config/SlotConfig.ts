'use client';

// 屏幕断点定义
export const BREAKPOINTS = {
  xs: 0,     // 手机竖屏
  sm: 640,   // 手机横屏/小平板
  md: 768,   // 平板
  lg: 1024,  // 小桌面
  xl: 1280,  // 桌面
  '2xl': 1536, // 大桌面
  '3xl': 1920, // 超宽屏
} as const;

// 组件优先级定义
export const COMPONENT_PRIORITY = {
  CRITICAL: 1,    // 关键组件（视频流、连接状态）
  HIGH: 2,        // 高优先级（控制面板、检测）
  MEDIUM: 3,      // 中等优先级（任务、帮助）
  LOW: 4,         // 低优先级（信息展示）
} as const;

// 组件分组定义
export const COMPONENT_GROUPS = {
  CORE: 'core',           // 核心功能
  CONTROL: 'control',     // 控制面板
  DETECTION: 'detection', // 检测相关
  INFO: 'info',          // 信息展示
  ANALYSIS: 'analysis',   // 分析报告
} as const;

// 组件元数据
export const COMPONENT_METADATA = {
  'video-stream': {
    priority: COMPONENT_PRIORITY.CRITICAL,
    group: COMPONENT_GROUPS.CORE,
    minSize: { width: 480, height: 320 },
    maxSize: { width: 1280, height: 720 },
    aspectRatio: 16/9,
    canResize: true,
    alwaysVisible: true,
  },
  'connection-control': {
    priority: COMPONENT_PRIORITY.CRITICAL,
    group: COMPONENT_GROUPS.CONTROL,
    minSize: { width: 320, height: 160 },
    maxSize: { width: 480, height: 320 },
    canResize: true,
    alwaysVisible: true,
  },
  'detection-control': {
    priority: COMPONENT_PRIORITY.HIGH,
    group: COMPONENT_GROUPS.DETECTION,
    minSize: { width: 320, height: 220 },
    maxSize: { width: 480, height: 360 },
    canResize: true,
  },
  'mission-panel': {
    priority: COMPONENT_PRIORITY.HIGH,
    group: COMPONENT_GROUPS.CONTROL,
    minSize: { width: 320, height: 200 },
    maxSize: { width: 480, height: 340 },
    canResize: true,
  },
  'manual-control': {
    priority: COMPONENT_PRIORITY.HIGH,
    group: COMPONENT_GROUPS.CONTROL,
    minSize: { width: 270, height: 190 },
    maxSize: { width: 380, height: 280 },
    canResize: true,
  },
  'strawberry-detection': {
    priority: COMPONENT_PRIORITY.MEDIUM,
    group: COMPONENT_GROUPS.DETECTION,
    minSize: { width: 320, height: 140 },
    maxSize: { width: 380, height: 190 },
    canResize: true,
  },
  'qr-scan': {
    priority: COMPONENT_PRIORITY.MEDIUM,
    group: COMPONENT_GROUPS.DETECTION,
    minSize: { width: 300, height: 140 },
    maxSize: { width: 380, height: 200 },
    canResize: true,
  },
  'virtual-position': {
    priority: COMPONENT_PRIORITY.MEDIUM,
    group: COMPONENT_GROUPS.INFO,
    minSize: { width: 270, height: 180 },
    maxSize: { width: 1000, height: 280 },
    canResize: true,
  },
  'ai-analysis-report': {
    priority: COMPONENT_PRIORITY.MEDIUM,
    group: COMPONENT_GROUPS.ANALYSIS,
    minSize: { width: 320, height: 140 },
    maxSize: { width: 460, height: 520 },
    canResize: true,
  },
  'battery-status': {
    priority: COMPONENT_PRIORITY.LOW,
    group: COMPONENT_GROUPS.INFO,
    minSize: { width: 240, height: 120 },
    maxSize: { width: 380, height: 220 },
    canResize: true,
  },
  'help-panel': {
    priority: COMPONENT_PRIORITY.LOW,
    group: COMPONENT_GROUPS.INFO,
    minSize: { width: 300, height: 220 },
    maxSize: { width: 380, height: 320 },
    canResize: true,
  },
  'workflow-panel': {
    priority: COMPONENT_PRIORITY.HIGH,
    group: COMPONENT_GROUPS.CONTROL,
    minSize: { width: 600, height: 400 },
    maxSize: { width: 1200, height: 800 },
    canResize: true,
  },
  'app-info': {
    priority: COMPONENT_PRIORITY.LOW,
    group: COMPONENT_GROUPS.INFO,
    minSize: { width: 320, height: 160 },
    maxSize: { width: 380, height: 320 },
    canResize: true,
  },
} as const;

// 磁性吸附区域定义
export const MAGNETIC_ZONES = {
  TOP_LEFT: { x: 0, y: 0, width: 0.33, height: 0.5 },
  TOP_CENTER: { x: 0.33, y: 0, width: 0.34, height: 0.5 },
  TOP_RIGHT: { x: 0.67, y: 0, width: 0.33, height: 0.5 },
  BOTTOM_LEFT: { x: 0, y: 0.5, width: 0.33, height: 0.5 },
  BOTTOM_CENTER: { x: 0.33, y: 0.5, width: 0.34, height: 0.5 },
  BOTTOM_RIGHT: { x: 0.67, y: 0.5, width: 0.33, height: 0.5 },
  CENTER: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  LEFT_SIDEBAR: { x: 0, y: 0, width: 0.25, height: 1 },
  RIGHT_SIDEBAR: { x: 0.75, y: 0, width: 0.25, height: 1 },
} as const;

// 响应式布局模板
export const RESPONSIVE_LAYOUTS = {
  // 超小屏幕 (手机竖屏)
  xs: {
    name: '手机竖屏',
    description: '单列布局，优先显示核心功能',
    maxComponents: 4,
    layout: {
      'video-stream': { x: 10, y: 10, width: 350, height: 200 },
      'connection-control': { x: 10, y: 220, width: 350, height: 180 },
      'detection-control': { x: 10, y: 410, width: 350, height: 200 },
      'manual-control': { x: 10, y: 620, width: 350, height: 180 },
    },
  },
  // 小屏幕 (手机横屏/小平板)
  sm: {
    name: '手机横屏',
    description: '双列布局，核心功能优先',
    maxComponents: 6,
    layout: {
      'video-stream': { x: 10, y: 10, width: 400, height: 250 },
      'connection-control': { x: 430, y: 10, width: 300, height: 200 },
      'detection-control': { x: 430, y: 220, width: 300, height: 200 },
      'mission-panel': { x: 10, y: 270, width: 400, height: 200 },
      'manual-control': { x: 10, y: 480, width: 300, height: 180 },
      'strawberry-detection': { x: 430, y: 430, width: 300, height: 180 },
    },
  },
  // 中等屏幕 (平板)
  md: {
    name: '平板布局',
    description: '三列网格布局，功能分组清晰',
    maxComponents: 8,
    layout: {
      'connection-control': { x: 20, y: 20, width: 320, height: 220 },
      'mission-panel': { x: 360, y: 20, width: 320, height: 250 },
      'detection-control': { x: 700, y: 20, width: 320, height: 220 },
      'video-stream': { x: 360, y: 290, width: 500, height: 320 },
      'manual-control': { x: 20, y: 260, width: 320, height: 200 },
      'strawberry-detection': { x: 20, y: 480, width: 320, height: 180 },
      'qr-scan': { x: 700, y: 260, width: 320, height: 180 },
      'virtual-position': { x: 360, y: 630, width: 500, height: 200 },
    },
  },
  // 大屏幕 (小桌面)
  lg: {
    name: '桌面布局',
    description: '四列布局，所有功能可见',
    maxComponents: 10,
    layout: {
      'connection-control': { x: 30, y: 30, width: 350, height: 250 },
      'mission-panel': { x: 400, y: 30, width: 350, height: 280 },
      'detection-control': { x: 770, y: 30, width: 350, height: 250 },
      'help-panel': { x: 1140, y: 30, width: 320, height: 250 },
      'video-stream': { x: 400, y: 330, width: 600, height: 380 },
      'strawberry-detection': { x: 30, y: 300, width: 350, height: 200 },
      'manual-control': { x: 30, y: 520, width: 350, height: 200 },
      'qr-scan': { x: 1020, y: 330, width: 300, height: 180 },
      'virtual-position': { x: 400, y: 730, width: 600, height: 220 },
      'ai-analysis-report': { x: 1020, y: 530, width: 300, height: 350 },
    },
  },
  // 超大屏幕 (桌面)
  xl: {
    name: '宽屏布局',
    description: '基于Figma三列基线（左352 / 中心800x600 / 右352）优化',
    maxComponents: 12,
    layout: {
      // 左列（352 固定宽）
      'connection-control': { x: 20, y: 20, width: 352, height: 300 },
      'manual-control': { x: 20, y: 340, width: 352, height: 280 },
      'battery-status': { x: 20, y: 660, width: 352, height: 200 },

      // 中心主画面（800 x 600）
      'video-stream': { x: 400, y: 20, width: 800, height: 600 },

      // 中下区域三块（按Figma像素变种）
      'strawberry-detection': { x: 400, y: 640, width: 300, height: 190 },
      'mission-panel': { x: 720, y: 640, width: 300, height: 200 },
      'detection-control': { x: 720, y: 860, width: 300, height: 200 },

      // 右列（352 固定宽）
      'ai-analysis-report': { x: 1220, y: 20, width: 352, height: 400 },
      'virtual-position': { x: 1220, y: 440, width: 352, height: 250 },
      'app-info': { x: 1220, y: 700, width: 352, height: 160 }
    },
  },
  // 超宽屏
  '2xl': {
    name: '超宽屏布局',
    description: '在Figma基线基础上整体放大，适配更宽视口（按第二张图尺寸重排）',
    maxComponents: 12,
    layout: {
      // 左列（与右列等宽，统一为 360）
      'connection-control': { x: 60, y: 120, width: 360, height: 260 },
      'mission-panel': { x: 60, y: 400, width: 360, height: 320 },
      'detection-control': { x: 60, y: 740, width: 360, height: 300 },

      // 中心主画面（16:9，960 x 540），下方三卡片
      'video-stream': { x: 440, y: 120, width: 960, height: 540 },
      'strawberry-detection': { x: 440, y: 680, width: 300, height: 180 },
      'manual-control': { x: 760, y: 680, width: 300, height: 220 },
      'qr-scan': { x: 1080, y: 680, width: 300, height: 200 },

      // 跨中列宽的位置信息面板
      'virtual-position': { x: 440, y: 920, width: 960, height: 240 },

      // 右列（等宽 360）：AI报告、Battery、App信息
      'ai-analysis-report': { x: 1420, y: 120, width: 360, height: 480 },
      'battery-status': { x: 1420, y: 620, width: 360, height: 220 },
      'app-info': { x: 1420, y: 860, width: 360, height: 220 }
    },
  },
} as const;

// 简单布局模板（用于快速切换）
export const SIMPLE_LAYOUT_TEMPLATES = {
  MONITORING: {
    name: '监控模式',
    description: '专注于视频监控和状态显示',
    components: ['video-stream', 'connection-control', 'battery-status', 'app-info'],
  },
  CONTROL: {
    name: '控制模式',
    description: '专注于无人机控制操作',
    components: ['video-stream', 'connection-control', 'manual-control', 'mission-panel'],
  },
  DETECTION: {
    name: '检测模式',
    description: '专注于目标检测和分析',
    components: ['video-stream', 'detection-control', 'strawberry-detection', 'qr-scan', 'ai-analysis-report'],
  },
  FULL: {
    name: '完整模式',
    description: '显示所有功能组件',
    components: [
      'video-stream', 'connection-control', 'mission-panel', 'detection-control',
      'manual-control', 'strawberry-detection', 'qr-scan', 'virtual-position',
      'ai-analysis-report', 'battery-status', 'help-panel', 'app-info'
    ],
  },
  ANALYSIS: {
    name: '分析模式',
    description: '专注于数据分析和报告',
    components: ['video-stream', 'ai-analysis-report', 'virtual-position', 'battery-status'],
  },
} as const;

// 获取当前屏幕断点
export const getCurrentBreakpoint = (width: number): keyof typeof BREAKPOINTS => {
  if (width >= BREAKPOINTS['3xl']) return '3xl';
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

// 获取响应式布局
export const getResponsiveLayout = (breakpoint: keyof typeof BREAKPOINTS) => {
  // 3xl 未提供专用布局，回退到 2xl，其余回退到 xl
  if (breakpoint === '3xl') return RESPONSIVE_LAYOUTS['2xl'];
  return (RESPONSIVE_LAYOUTS as any)[breakpoint] || RESPONSIVE_LAYOUTS.xl;
};

// 计算磁性吸附位置
export const calculateMagneticPosition = (
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  threshold: number = 50
) => {
  const zones = Object.entries(MAGNETIC_ZONES).map(([name, zone]) => ({
    name,
    x: zone.x * containerWidth,
    y: zone.y * containerHeight,
    width: zone.width * containerWidth,
    height: zone.height * containerHeight,
  }));

  for (const zone of zones) {
    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    
    if (distance < threshold) {
      return { x: centerX, y: centerY, zone: zone.name };
    }
  }
  
  return null;
};

// 检测组件碰撞
export const detectCollision = (
  component1: { x: number; y: number; width: number; height: number },
  component2: { x: number; y: number; width: number; height: number }
) => {
  return !(
    component1.x + component1.width < component2.x ||
    component2.x + component2.width < component1.x ||
    component1.y + component1.height < component2.y ||
    component2.y + component2.height < component1.y
  );
};

// 自动调整布局避免碰撞
export const autoAdjustLayout = (
  layouts: Record<string, { x: number; y: number; width: number; height: number }>,
  newComponent: { id: string; x: number; y: number; width: number; height: number }
) => {
  const adjustedLayouts = { ...layouts };
  const conflicts = Object.entries(layouts).filter(([id, layout]) => 
    id !== newComponent.id && detectCollision(newComponent, layout)
  );

  // 简单的向下推移策略
  conflicts.forEach(([id, layout]) => {
    adjustedLayouts[id] = {
      ...layout,
      y: newComponent.y + newComponent.height + 20,
    };
  });

  return adjustedLayouts;
};