import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 模拟获取视频状态
    console.log('📊 获取视频流状态');
    
    return NextResponse.json({
      success: true,
      playing: true,
      resolution: '1920x1080',
      fps: 30,
      quality: 'HD',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('获取视频状态失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取视频状态失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}