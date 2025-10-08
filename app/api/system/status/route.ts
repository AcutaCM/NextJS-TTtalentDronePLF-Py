import { NextRequest, NextResponse } from 'next/server';

// 系统状态更新API
export async function POST(req: NextRequest) {
  try {
    const { 
      componentName, 
      status, 
      action,
      metadata 
    } = await req.json();
    
    // 验证请求参数
    if (!componentName || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing componentName or status' },
        { status: 400 }
      );
    }
    
    console.log(`系统状态更新 - 组件: ${componentName}, 状态: ${status}, 操作: ${action || 'N/A'}`);
    
    // 这里可以将状态更新发送到WebSocket或数据库
    // 目前先记录日志
    const updateData = {
      timestamp: new Date().toISOString(),
      componentName,
      status,
      action,
      metadata: metadata || {}
    };
    
    // TODO: 实际的状态存储逻辑
    // 可以存储到Redis、数据库或内存中
    // 也可以通过WebSocket广播给其他客户端
    
    return NextResponse.json({
      success: true,
      message: '状态更新成功',
      data: updateData
    });
    
  } catch (error: any) {
    console.error('System status update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}