import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatApiConfig {
  baseUrl?: string; // e.g. https://dashscope.aliyuncs.com/compatible-mode/v1 or http://localhost:8000/v1
  apiKey?: string;  // Bearer key
  model?: string;   // Model name
  stream?: boolean; // whether to stream responses (SSE/chunked)
  extra_body?: Record<string, any>; // vendor specific extra config (e.g. DashScope enable_thinking, thinking_budget)
}

function streamText(text: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const ch of (text || '').split('')) {
        controller.enqueue(encoder.encode(ch));
        await new Promise(r => setTimeout(r, 8));
      }
      controller.close();
    }
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
}

// Detect whether the endpoint is a local Ollama server which does not require API keys
function isLocalOllamaEndpoint(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const isLocalHost = ['localhost', '127.0.0.1'].includes(u.hostname);
    const isOllamaPort = u.port === '11434';
    // Common default base path is /v1 for OpenAI-compatible API
    return isLocalHost && (isOllamaPort || url.includes('11434'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages = [], model, config }: { messages?: ChatMessage[]; model?: string; config?: ChatApiConfig } = body || {};

    const lastUserMessage = Array.isArray(messages)
      ? (messages as ChatMessage[]).filter((m) => m.role === 'user').pop()?.content ?? ''
      : '';

    // Resolve config (body has top priority, then env defaults)
    const baseUrl = (config?.baseUrl || process.env.DASHSCOPE_BASE_URL || process.env.QWEN_BASE_URL || process.env.OPENAI_BASE_URL || '').toString();
    const apiKey = (config?.apiKey || process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || '').toString();
    const modelName = (config?.model || model || process.env.QWEN_MODEL || process.env.OPENAI_MODEL || '').toString();
    const stream = config?.stream ?? true; // 默认启用流式（与 OpenAI SDK 示例一致）

    const isLocalOllama = isLocalOllamaEndpoint(baseUrl);

    // If user selects local-echo or missing critical config, return echo text
    // Note: Local Ollama does not require an API key
    const useEcho = (model === 'local-echo') || (!baseUrl) || (!apiKey && !isLocalOllama);
    if (useEcho) {
      const hint = !baseUrl
        ? '（提示：未配置 Base URL，已使用本地占位回复。若使用本地Ollama，请设置 Base URL 为 http://localhost:11434/v1 并选择模型；Ollama 不需要 API Key。）'
        : (!apiKey && !isLocalOllama)
          ? '（提示：该服务需要 API Key，但当前未配置。点击聊天面板右上角“设置”进行配置。）'
          : '';
      const text = (lastUserMessage ? `Echo: ${lastUserMessage}` : '你好，我是本地占位 AI。') + ' ' + hint;
      return streamText(text);
    }

    // Model must be provided explicitly to avoid provider-specific defaults causing 4xx
    if (!modelName) {
      return new Response(
        JSON.stringify({
          error: 'Missing model. 请在聊天设置中填写模型名称（例如：OpenAI 使用 gpt-4o-mini；DashScope 使用 qwen2.5-7b-instruct 或 qwen2.5-vl-7b-instruct）。',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call upstream OpenAI-compatible endpoint
    const cleanBase = baseUrl.replace(/\/$/, '');
    const endpoint = cleanBase.endsWith('/chat/completions') ? cleanBase : `${cleanBase}/chat/completions`;

    let upstreamResp: Response;
    try {
      upstreamResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream,
          // 透传 DashScope 兼容模式的扩展参数（例如 enable_thinking、thinking_budget）
          ...(config?.extra_body ? { extra_body: config.extra_body } : {}),
          // 针对本地 Ollama 的特殊参数（如需）
          ...(isLocalOllama && {
            options: {
              temperature: 0.7,
              top_p: 0.9,
              num_predict: 2048,
              repeat_penalty: 1.1,
              stop: ["<|im_end|>", "<|endoftext|>"]
            }
          })
        }),
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `Network error: ${e?.message || e}` }), { status: 502 });
    }

    if (!upstreamResp.ok) {
      // Pass through upstream status and body for easier debugging
      const contentType = upstreamResp.headers.get('content-type') || 'application/json';
      const errBody = await upstreamResp.text();
      return new Response(errBody || JSON.stringify({ error: `Upstream ${upstreamResp.status}` }), {
        status: upstreamResp.status,
        headers: { 'Content-Type': contentType },
      });
    }

    // 若上游返回为流式（SSE 或 chunked），直接透传流，避免本地拼接
    const readable = upstreamResp.body;
    if (readable) {
      const respHeaders = new Headers(upstreamResp.headers);
      const contentType = upstreamResp.headers.get('Content-Type') || upstreamResp.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        respHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
      } else if (contentType) {
        respHeaders.set('Content-Type', contentType);
      } else {
        // 默认 JSON 或文本
        respHeaders.set('Content-Type', stream ? 'text/event-stream; charset=utf-8' : 'application/json; charset=utf-8');
      }
      return new NextResponse(readable as unknown as ReadableStream, { status: upstreamResp.status, headers: respHeaders });
    }

    // 非流式，解析 JSON 并返回文本
    const data = await upstreamResp.json().catch(async () => await upstreamResp.text());
    const text: string = (data as any)?.choices?.[0]?.message?.content || (typeof data === 'string' ? data : '（上游无返回内容）');
    return streamText(text);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Bad Request' }), { status: 400 });
  }
}