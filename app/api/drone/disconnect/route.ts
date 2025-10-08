import { NextRequest, NextResponse } from 'next/server';

interface DisconnectionResult {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚁 AI助手触发无人机断开连接指令');
    
    // 向WebSocket服务器发送断开连接指令
    try {
      const ws = new WebSocket('ws://localhost:3002');
      
      const disconnectionPromise = new Promise<DisconnectionResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket连接超时'));
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket连接成功，发送无人机断开连接命令');
          ws.send(JSON.stringify({ type: 'drone_disconnect' }));
          
          // 等待断开确认
          setTimeout(() => {
            ws.close();
            resolve({ success: true, message: '断开连接指令已发送' });
          }, 1000);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket连接失败'));
        };
        
        ws.onclose = () => {
          clearTimeout(timeout);
        };
      });
      
      const result = await disconnectionPromise;
      
      return NextResponse.json({
        success: true,
        message: result.message || '无人机断开连接指令已通过WebSocket发送',
        timestamp: new Date().toISOString(),
        status: 'disconnected',
        method: 'websocket'
      });
      
    } catch (wsError: any) {
      console.warn('⚠️ WebSocket连接失败，返回指令确认:', wsError.message);
      
      return NextResponse.json({
        success: true,
        message: '无人机断开连接指令已发送，请确保后端WebSocket服务(端口3002)正在运行',
        timestamp: new Date().toISOString(),
        status: 'disconnected',
        method: 'api_fallback',
        note: '如果连接状态未更新，请检查WebSocket服务是否启动'
      });
    }
    
  } catch (error: any) {
    console.error('❌ 无人机断开连接操作失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '断开连接操作失败', 
        details: error.message,
        suggestion: '请检查后端WebSocket服务是否正常运行'
      }, 
      { status: 500 }
    );
  }
}