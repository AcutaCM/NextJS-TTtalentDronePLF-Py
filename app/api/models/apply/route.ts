import { NextResponse } from 'next/server';
import path from 'path';
import { WebSocket } from 'ws';
type WSData = any;

export const runtime = 'nodejs';

// 与Python后端通信（tello_multi_detector_backend.py监听的WS端口）
const WS_URL = process.env.TELLO_WS_URL || 'ws://127.0.0.1:3003';

export async function POST(req: Request) {
  try {
    const { name, type } = await req.json();
    if (!name || !type) {
      return NextResponse.json({ ok: false, error: '缺少参数 name 或 type' }, { status: 400 });
    }
    const modelPath = path.join(process.cwd(), 'drone-analyzer-nextjs', 'models', name);

    // 连接到Python后端，发送切换模型指令
    const ws = new WebSocket(WS_URL);
    const reply = await new Promise<{ ok: boolean; msg?: string }>((resolve) => {
      let opened = false;
      ws.on('open', () => {
        opened = true;
        const payload = {
          action: 'apply_model',
          type,            // 'maturity' | 'disease' | 'yolo' 等
          path: modelPath  // 绝对路径
        };
        ws.send(JSON.stringify(payload));
      });
      ws.on('message', (data: WSData) => {
        try {
          const obj = JSON.parse(data.toString());
          if (obj?.ack === 'apply_model') {
            resolve({ ok: true, msg: obj?.message || '模型已应用' });
            ws.close();
          }
        } catch {}
      });
      ws.on('error', (err: Error) => {
        resolve({ ok: false, msg: err.message });
      });
      ws.on('close', () => {
        if (!opened) resolve({ ok: false, msg: '无法连接到Tello后端' });
      });
    });

    if (!reply.ok) {
      return NextResponse.json({ ok: false, error: reply.msg || '应用失败' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: reply.msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}