import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // 连接到Python后端WebSocket服务器
    try {
      // 使用动态导入来避免构造函数问题
      const WebSocket = (await import('ws')).default;
      const ws = new WebSocket('ws://localhost:8765');
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          // 发送停止检测命令
          const command = {
            type: 'stop_detection',
            data: {}
          };
          
          ws.send(JSON.stringify(command));
          resolve();
        });

        ws.on('error', (error: Error) => {
          reject(error);
        });

        // 设置超时
        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);
      });

      ws.close();

      return NextResponse.json({
        ok: true,
        message: 'Detection stopped successfully'
      });

    } catch (wsError: any) {
      console.error('WebSocket connection error:', wsError);
      return NextResponse.json({
        ok: false,
        error: 'Failed to connect to detection backend. Please ensure the Python backend is running.'
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('Stop detection error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to stop detection'
    }, { status: 500 });
  }
}