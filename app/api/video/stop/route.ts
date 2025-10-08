import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 模拟停止视频流
    console.log('⏹️ 停止视频流');
    
    // 这里应该调用实际的视频系统接口
    // 目前返回模拟结果
    
    return NextResponse.json({
      success: true,
      message: '视频流已停止',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('停止视频流失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '停止视频流失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}