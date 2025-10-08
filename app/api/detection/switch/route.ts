import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { detection_type } = await req.json();
    
    // 验证检测类型
    const validTypes = ['strawberry', 'qr', 'general'];
    if (!validTypes.includes(detection_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid detection type' },
        { status: 400 }
      );
    }
    
    // 这里可以添加实际的检测类型切换逻辑
    // 例如：通知后端Python服务器切换YOLO模型
    
    console.log(`切换检测类型到: ${detection_type}`);
    
    // 模拟发送到Python后端的WebSocket消息
    const switchCommand = {
      type: 'switch_detection_type',
      detection_type: detection_type,
      timestamp: new Date().toISOString()
    };
    
    // TODO: 实际的WebSocket通信逻辑
    // 这里可以调用WebSocket客户端来通知Python后端
    
    return NextResponse.json({
      success: true,
      message: `检测类型已切换到: ${detection_type}`,
      detection_type: detection_type
    });
    
  } catch (error: any) {
    console.error('Detection type switch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}