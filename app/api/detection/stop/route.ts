import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 模拟停止检测操作
    console.log('🛑 停止YOLO检测');
    
    // 这里应该调用实际的检测系统接口
    // 目前返回模拟结果
    
    return NextResponse.json({
      success: true,
      message: '检测系统已停止',
      timestamp: new Date().toISOString(),
      status: 'stopped'
    });
    
  } catch (error: any) {
    console.error('停止检测操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '停止检测失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}