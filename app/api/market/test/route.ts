import { NextRequest, NextResponse } from 'next/server';

/**
 * 输入（JSON）:
 * {
 *   "provider": "openai" | "azure-openai" | "deepseek" | ...,
 *   "apiKey": "xxx",
 *   "baseUrl": "https://api.xxx.com"  // 对于 OpenAI 兼容也可自定义
 *   "model": "gpt-4o"                 // 可选；不传则各代理自行默认
 *   "extra": { ... }                  // 可选，供特定厂商（如 azure: resource/deployment, zhipu: apiKey 前缀等）
 * }
 * 行为：将上述信息透传到 /api/chat-proxy 发起一次最小对话以验证连通性
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { provider, apiKey, baseUrl, model, extra } = body || {};
    if (!provider || !apiKey) {
      return NextResponse.json({ ok: false, error: 'provider 或 apiKey 缺失' }, { status: 400 });
    }

    const resp = await fetch(new URL('/api/chat-proxy', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider,
        apiKey,
        baseUrl,
        model,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        extra,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ ok: false, error: `proxy ${resp.status}: ${text}` }, { status: 200 });
    }

    // 代理返回可能是 JSON 或流式，这里假定非流式
    let data: any = null;
    try { data = await resp.json(); } catch { data = await resp.text(); }

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}