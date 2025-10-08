import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: 'Missing file field' }), { status: 400 });
    }

    const prompt = (formData.get('prompt') as string) ?? 'Please segment the...';
    const out =
      (formData.get('out') as string) ??
      'outputs'; // You can pass an absolute path like /mnt/c/... to write outputs to the Windows drive

    // 组装转发给 FastAPI 的 form-data
    const forwardForm = new FormData();
    // 保留文件名（如果前端传了 name）
    const fileName = (file as any).name ?? 'upload';
    forwardForm.append('file', file, fileName);
    forwardForm.append('prompt', prompt);
    forwardForm.append('out', out);

    const resp = await fetch('http://localhost:8000/infer', {
      method: 'POST',
      body: forwardForm,
    });

    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: resp.ok ? 200 : resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal error' }), { status: 500 });
  }
}

export async function GET() {
  try {
    const resp = await fetch('http://localhost:8000/health');
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: resp.ok ? 200 : resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'error', error: err?.message ?? 'Health check failed' }), { status: 500 });
  }
}