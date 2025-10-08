import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 这里应该连接到Python后端获取实际的检测状态
    // 暂时返回模拟数据
    const status = {
      isActive: false,
      modelName: '',
      detectionType: '',
      fps: 0,
      objectCount: 0
    };

    // TODO: 实际实现应该通过WebSocket或HTTP请求获取Python后端状态
    // 例如：
    // const response = await fetch('http://localhost:8765/status');
    // const status = await response.json();

    return NextResponse.json({
      ok: true,
      status
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to get detection status'
    }, { status: 500 });
  }
}