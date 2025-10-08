import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 模拟获取系统健康状态
    console.log('🏥 获取系统健康状态');
    
    // 这里应该查询实际的系统资源使用情况
    // 目前返回模拟结果
    
    return NextResponse.json({
      success: true,
      cpu: Math.floor(Math.random() * 50) + 20, // 20-70%
      memory: Math.floor(Math.random() * 40) + 30, // 30-70%
      storage: Math.floor(Math.random() * 30) + 40, // 40-70%
      network: 'connected',
      uptime: '2小时15分钟',
      temperature: '45°C',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('获取系统健康状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取系统健康状态失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}