import { NextResponse } from 'next/server';

type Provider =
  | 'openai' | 'azure-openai'
  | 'groq' | 'openrouter' | 'deepseek' | 'mistral' | 'qwen' | 'dify' | 'ollama'
  | 'gemini' | 'anthropic';

type AnalyzePayload = {
  imageBase64: string;     // data:image/...;base64,... 或纯 base64
  prompt?: string;         // 用户描述
  provider?: Provider;
  model?: string;
  // 可选：前端透传覆盖（优先级最高）
  apiKey?: string;
  baseUrl?: string;        // OpenAI 兼容服务的 /v1 根路径
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzePayload;
    const {
      imageBase64,
      prompt = '请识别这张图片的主要内容，并用中文简要说明。',
      provider = 'openai',
      model = defaultModelOf(provider),
      apiKey: overrideKey,
      baseUrl: overrideBase,
    } = body || {};

    if (!imageBase64) return NextResponse.json({ error: 'missing imageBase64' }, { status: 400 });
    const base64 = imageBase64.startsWith('data:') ? (imageBase64.split(',').pop() || '') : imageBase64;
    if (!base64) return NextResponse.json({ error: 'invalid base64' }, { status: 400 });

    // 1) OpenAI 兼容通道
    if (isOpenAICompat(provider)) {
      const { key, base } = getOpenAICompatCreds(provider, overrideKey, overrideBase);
      if (!key && needsApiKey(provider)) {
        return NextResponse.json({ error: `${provider} apiKey not configured` }, { status: 400 });
      }
      if (!base) {
        return NextResponse.json({ error: `${provider} baseUrl not configured` }, { status: 400 });
      }

      // 标准 OpenAI chat/completions 多模态入参
      const messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
          ],
        },
      ];

      const url = `${trimTrailSlash(base)}/chat/completions`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = `Bearer ${key}`;

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return NextResponse.json({ error: `${provider} error: ${txt || resp.status}` }, { status: resp.status });
      }
      const data = await resp.json().catch(() => null);
      const content =
        data?.choices?.[0]?.message?.content ??
        data?.content ??
        '';
      return NextResponse.json({ provider, model, content });
    }

    // 2) Google Gemini
    if (provider === 'gemini') {
      const key = overrideKey || process.env.GEMINI_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 400 });

      const m = model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(key)}`;

      // Gemini 需要 inline_data 提供 base64 二进制，mime 指定
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: base64,
                },
              },
            ],
          },
        ],
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return NextResponse.json({ error: `gemini error: ${txt || resp.status}` }, { status: resp.status });
      }
      const data = await resp.json().catch(() => null);
      const content =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('\n') ||
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        '';
      return NextResponse.json({ provider, model: m, content });
    }

    // 3) Anthropic Claude
    if (provider === 'anthropic') {
      const key = overrideKey || process.env.ANTHROPIC_API_KEY || '';
      if (!key) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 400 });

      const m = model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
      const url = 'https://api.anthropic.com/v1/messages';

      const payload = {
        model: m,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: base64,
                },
              },
            ],
          },
        ],
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        return NextResponse.json({ error: `anthropic error: ${txt || resp.status}` }, { status: resp.status });
      }
      const data = await resp.json().catch(() => null);
      const content =
        data?.content?.map((p: any) => p?.text).filter(Boolean).join('\n') ||
        data?.content?.[0]?.text ||
        '';
      return NextResponse.json({ provider, model: m, content });
    }

    // 兜底：未实现
    return NextResponse.json({ warning: `provider(${provider}) not implemented` }, { status: 501 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}

/* helpers */
function defaultModelOf(p: Provider): string {
  switch (p) {
    case 'openai':
    case 'azure-openai':
    case 'groq':
    case 'openrouter':
    case 'deepseek':
    case 'mistral':
    case 'qwen':
    case 'dify':
    case 'ollama':
      return process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
    case 'gemini':
      return process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    case 'anthropic':
      return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
    default:
      return 'gpt-4o-mini';
  }
}

function isOpenAICompat(p: Provider) {
  return ['openai','azure-openai','groq','openrouter','deepseek','mistral','qwen','dify','ollama'].includes(p);
}
function needsApiKey(p: Provider) {
  // 本地 ollama 常不需要 key
  return p !== 'ollama';
}

function getOpenAICompatCreds(provider: Provider, overrideKey?: string, overrideBase?: string) {
  const envByProv: Record<Provider, { key?: string; base?: string }> = {
    openai:       { key: process.env.OPENAI_API_KEY,       base: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1' },
    'azure-openai': { key: process.env.AZURE_OPENAI_API_KEY, base: process.env.AZURE_OPENAI_BASE_URL },
    groq:         { key: process.env.GROQ_API_KEY,         base: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1' },
    openrouter:   { key: process.env.OPENROUTER_API_KEY,   base: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1' },
    deepseek:     { key: process.env.DEEPSEEK_API_KEY,     base: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com' },
    mistral:      { key: process.env.MISTRAL_API_KEY,      base: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1' },
    qwen:         { key: process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY, base: process.env.QWEN_BASE_URL || process.env.OPENAI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
    dify:         { key: process.env.DIFY_API_KEY,         base: process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1' },
    ollama:       { key: process.env.OLLAMA_API_KEY || '', base: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1' },
    gemini:       { key: process.env.GEMINI_API_KEY,       base: '' },
    anthropic:    { key: process.env.ANTHROPIC_API_KEY,    base: '' },
  };
  const env = envByProv[provider] || { key: '', base: '' };
  return {
    key: overrideKey ?? env.key ?? '',
    base: overrideBase ?? env.base ?? '',
  };
}

function trimTrailSlash(s?: string) {
  return (s || '').replace(/\/+$/, '');
}