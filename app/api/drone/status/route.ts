import { NextRequest, NextResponse } from 'next/server';

// 模拟无人机状态数据（实际项目中应该连接真实硬件）
interface DroneStatus {
  connected: boolean;
  battery: number;
  flying: boolean;
  gps: string;
  altitude: number;
  speed: number;
  signal: number;
  temperature: number;
  flightTime: number;
}

// 模拟的无人机状态
let mockDroneStatus: DroneStatus = {
  connected: false, // 设置为未连接用于测试
  battery: 100,
  flying: false,
  gps: '无信号',
  altitude: 0,
  speed: 0,
  signal: 0,
  temperature: 25,
  flightTime: 0
};

export async function GET(req: NextRequest) {
  try {
    // 在实际项目中，这里会连接到真实的无人机硬件
    // 例如：DJI SDK、Tello SDK等
    
    // 模拟动态数据变化
    const now = Date.now();
    if (mockDroneStatus.flying) {
      mockDroneStatus.flightTime = Math.floor((now % 600000) / 1000); // 模拟飞行时间
      mockDroneStatus.altitude = 5 + Math.sin(now / 10000) * 3; // 模拟高度变化
      mockDroneStatus.speed = 2 + Math.cos(now / 5000) * 1.5; // 模拟速度变化
    }
    
    // 模拟电池消耗
    if (mockDroneStatus.flying && mockDroneStatus.battery > 10) {
      mockDroneStatus.battery = Math.max(10, mockDroneStatus.battery - 0.1);
    }
    
    return NextResponse.json({
      success: true,
      data: mockDroneStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('获取无人机状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, parameters } = await req.json();
    
    switch (action) {
      case 'refresh':
        // 刷新状态
        break;
      case 'reset':
        // 重置状态
        mockDroneStatus = {
          connected: false,
          battery: 100,
          flying: false,
          gps: '无信号',
          altitude: 0,
          speed: 0,
          signal: 0,
          temperature: 20,
          flightTime: 0
        };
        break;
      default:
        return NextResponse.json(
          { success: false, error: '未知操作' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      message: '操作成功',
      data: mockDroneStatus
    });
    
  } catch (error: any) {
    console.error('无人机状态操作失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}