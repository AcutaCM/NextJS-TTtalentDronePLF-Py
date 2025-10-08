import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

const MODELS_DIR = path.join(process.cwd(), 'models');

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: '需要multipart/form-data上传' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const modelName = String(formData.get('name') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: '未收到文件' }, { status: 400 });
    }
    if (!file.name.endsWith('.pt')) {
      return NextResponse.json({ ok: false, error: '仅支持.pt文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length < 1024) {
      return NextResponse.json({ ok: false, error: '文件太小，可能无效' }, { status: 400 });
    }

    await ensureDir(MODELS_DIR);
    const safeName = modelName || file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const targetPath = path.join(MODELS_DIR, safeName || file.name);

    await fs.writeFile(targetPath, new Uint8Array(buffer));

    // 调用Python脚本进行模型校验
    const pythonPath = 'python'; // 依赖系统PATH
    const validatorPath = path.join(process.cwd(), 'python', 'validate_model.py');

    const result = await new Promise<{ ok: boolean; msg?: string }>((resolve) => {
      const proc = spawn(pythonPath, [validatorPath, targetPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: os.platform() === 'win32'
      });
      let out = '';
      let err = '';
      proc.stdout.on('data', (d) => (out += d.toString()));
      proc.stderr.on('data', (d) => (err += d.toString()));
      proc.on('close', (code) => {
        if (code === 0) resolve({ ok: true, msg: out.trim() || '模型验证通过' });
        else resolve({ ok: false, msg: err.trim() || out.trim() || '模型验证失败' });
      });
    });

    if (!result.ok) {
      // 验证不通过，删除文件
      try { await fs.unlink(targetPath); } catch {}
      return NextResponse.json({ ok: false, error: result.msg || '模型不兼容' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, path: targetPath, name: path.basename(targetPath), message: result.msg });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}