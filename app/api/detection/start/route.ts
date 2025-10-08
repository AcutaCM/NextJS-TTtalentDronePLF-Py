import { NextRequest, NextResponse } from 'next/server';

// 检测状态存储
let detectionState = {
  active: false,
  type: 'general',
  count: 0,
  startTime: null as string | null,
  results: [] as any[]
};

export async function POST(req: NextRequest) {
  try {
    const { type = 'general' } = await req.json();
    
    console.log(`🎯 启动${type}检测`);
    
    // 启动检测
    detectionState = {
      active: true,
      type,
      count: 0,
      startTime: new Date().toISOString(),
      results: []
    };
    
    // 在实际项目中，这里会启动YOLO检测模型
    // 例如：startYOLODetection(type)
    
    return NextResponse.json({
      success: true,
      message: `${type}检测已启动`,
      data: detectionState,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('启动检测失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: detectionState
  });
}