/**
 * 无人机状态持久化存储工具
 * 用于在页面刷新时保持无人机连接状态
 */

export interface DroneStorageState {
  connected: boolean;
  flying: boolean;
  battery: number;
  mission_active: boolean;
  challenge_cruise_active: boolean;
  wifi_signal: number;
  temperature: number;
  altitude?: number;
  speed?: number;
  gps?: { lat: number; lng: number } | null;
  mode?: 'manual' | 'auto' | 'cruise';
  armed?: boolean;
  lastUpdated: number; // 时间戳
}

const STORAGE_KEY = 'drone_state';
const STATE_EXPIRY_TIME = 5 * 60 * 1000; // 5分钟过期

/**
 * 保存无人机状态到本地存储
 */
export const saveDroneState = (state: Partial<DroneStorageState>): void => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    const currentState = getDroneState();
    const newState: DroneStorageState = {
      ...currentState,
      ...state,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    console.log('🔄 无人机状态已保存到本地存储:', newState);
  } catch (error) {
    console.error('❌ 保存无人机状态失败:', error);
  }
};

/**
 * 从本地存储获取无人机状态
 */
export const getDroneState = (): DroneStorageState => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return getDefaultState();
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultState();
    }

    const state: DroneStorageState = JSON.parse(stored);
    
    // 检查状态是否过期
    if (Date.now() - state.lastUpdated > STATE_EXPIRY_TIME) {
      console.log('⏰ 无人机状态已过期，使用默认状态');
      clearDroneState();
      return getDefaultState();
    }

    console.log('✅ 从本地存储恢复无人机状态:', state);
    return state;
  } catch (error) {
    console.error('❌ 获取无人机状态失败:', error);
    return getDefaultState();
  }
};

/**
 * 清除本地存储的无人机状态
 */
export const clearDroneState = (): void => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ 已清除本地存储的无人机状态');
  } catch (error) {
    console.error('❌ 清除无人机状态失败:', error);
  }
};

/**
 * 检查是否有有效的存储状态
 */
export const hasValidStoredState = (): boolean => {
  try {
    // 检查是否在浏览器环境中
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;

    const state: DroneStorageState = JSON.parse(stored);
    return Date.now() - state.lastUpdated <= STATE_EXPIRY_TIME;
  } catch {
    return false;
  }
};

/**
 * 获取默认状态
 */
const getDefaultState = (): DroneStorageState => ({
  connected: false,
  flying: false,
  battery: 0,
  mission_active: false,
  challenge_cruise_active: false,
  wifi_signal: 0,
  temperature: 0,
  altitude: 0,
  speed: 0,
  gps: null,
  mode: 'manual',
  armed: false,
  lastUpdated: Date.now()
});

/**
 * 监听存储变化（用于多标签页同步）
 */
export const onStorageChange = (callback: (state: DroneStorageState) => void): (() => void) => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const newState: DroneStorageState = JSON.parse(e.newValue);
        callback(newState);
      } catch (error) {
        console.error('❌ 处理存储变化失败:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * 获取状态统计信息
 */
export const getStateStats = () => {
  const state = getDroneState();
  const isExpired = Date.now() - state.lastUpdated > STATE_EXPIRY_TIME;
  const ageMinutes = Math.floor((Date.now() - state.lastUpdated) / (1000 * 60));
  
  return {
    hasStoredState: hasValidStoredState(),
    isExpired,
    ageMinutes,
    lastUpdated: new Date(state.lastUpdated).toLocaleString()
  };
};