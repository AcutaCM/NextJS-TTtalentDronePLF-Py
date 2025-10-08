import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { modelName, detectionType } = await request.json();

    if (!modelName || !detectionType) {
      return NextResponse.json({
        ok: false,
        error: 'Missing modelName or detectionType'
      }, { status: 400 });
    }

    // 连接到Python后端WebSocket服务器
    try {
      // 使用动态导入来避免构造函数问题
      const WebSocket = (await import('ws')).default;
      const ws = new WebSocket('ws://localhost:8765');
      
      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          // 发送启动检测命令
          const command = {
            type: 'start_detection',
            data: {
              model_name: modelName,
              detection_type: detectionType,
              enable_video_stream: true,
              enable_real_time_detection: true
            }
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
        message: 'Detection started successfully',
        modelName,
        detectionType
      });

    } catch (wsError: any) {
      console.error('WebSocket connection error:', wsError);
      return NextResponse.json({
        ok: false,
        error: 'Failed to connect to detection backend. Please ensure the Python backend is running.'
      }, { status: 503 });
    }

  } catch (error: any) {
    console.error('Start detection error:', error);
    return NextResponse.json({
      ok: false,
      error: 'Failed to start detection'
    }, { status: 500 });
  }
}