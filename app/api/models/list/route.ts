import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const MODELS_DIR = path.join(process.cwd(), 'models');

export async function GET() {
  try {
    const files = await fs.readdir(MODELS_DIR).catch(() => []);
    const list = await Promise.all(
      files.filter(f => f.endsWith('.pt')).map(async (f) => {
        const stat = await fs.stat(path.join(MODELS_DIR, f)).catch(() => null);
        return {
          name: f,
          size: stat ? stat.size : 0,
          mtime: stat ? stat.mtimeMs : 0
        };
      })
    );
    return NextResponse.json({ ok: true, models: list.sort((a, b) => b.mtime - a.mtime) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}