import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { direction, distance } = await request.json();
    
    if (!direction || !distance) {
      return NextResponse.json(
        { success: false, error: '需要提供移动方向和距离' },
        { status: 400 }
      );
    }
    
    // 模拟无人机移动操作
    console.log(`🚁 无人机${direction}移动${distance}米`);
    
    // 这里应该调用实际的无人机SDK或硬件接口
    // 目前返回模拟结果
    
    return NextResponse.json({
      success: true,
      message: `无人机${direction}移动${distance}米指令已发送`,
      timestamp: new Date().toISOString(),
      direction,
      distance
    });
    
  } catch (error: any) {
    console.error('无人机移动操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '移动操作失败', 
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}