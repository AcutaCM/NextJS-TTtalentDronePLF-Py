import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 模拟获取检测状态
    console.log('📊 获取检测系统状态');
    
    // 这里应该查询实际的检测系统状态
    // 目前返回模拟结果
    
    return NextResponse.json({
      success: true,
      type: 'strawberry',
      active: true,
      count: 15,
      lastDetection: new Date().toISOString(),
      confidence: 0.85,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('获取检测状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取检测状态失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}