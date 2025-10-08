import { NextRequest, NextResponse } from "next/server";

// 允许通过环境变量切换目标：
// - QWEN_BASE_URL: 例如 http://localhost:8000/v1 (本地 vLLM/OpenAI 兼容)
// - QWEN_API_KEY: 目标服务的 Bearer key
// - QWEN_MODEL:   模型名称，默认 Qwen/Qwen2.5-VL-7B-Instruct
// 兼容 DashScope 端点：https://dashscope.aliyuncs.com/compatible-mode/v1

const DEFAULT_BASE_URL = process.env.QWEN_BASE_URL || process.env.OPENAI_BASE_URL || "http://localhost:11434/v1";
const QWEN_API_KEY = process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY || "";
const QWEN_MODEL = process.env.QWEN_MODEL || "redule26/huihui_ai_qwen2.5-vl-7b-abliterated";

export async function GET() {
  return NextResponse.json({ ok: true, model: QWEN_MODEL, baseUrl: maskUrl(DEFAULT_BASE_URL) });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await req.json();
      const { messages, images, videos, extra_body, max_tokens, temperature, top_p } = payload || {};

      console.log('收到的原始消息:', JSON.stringify(messages, null, 2));
      const normalized = normalizeMessages(messages, images, videos);
      console.log('标准化后的消息:', JSON.stringify(normalized, null, 2));

      // 检查是否支持流式响应
      const isLocalOllama = DEFAULT_BASE_URL.includes('localhost:11434');
      const useStream = isLocalOllama; // 本地Ollama支持流式响应
      
      const body: any = {
        model: payload?.model || QWEN_MODEL,
        messages: normalized,
        stream: useStream,
        temperature: temperature ?? 0.3,  // 降低温度以提高响应速度
        top_p: top_p ?? 0.8,              // 降低top_p以减少计算复杂度
        max_tokens: max_tokens ?? 512,    // 减少最大token数以提高速度
        frequency_penalty: 0.1,           // 添加频率惩罚以提高质量
        presence_penalty: 0.1,            // 添加存在惩罚以提高多样性
        // 针对Ollama的性能优化参数
        ...(isLocalOllama && {
          options: {
            temperature: temperature ?? 0.3,
            top_p: top_p ?? 0.8,
            num_predict: max_tokens ?? 512,
            repeat_penalty: 1.05,         // 降低重复惩罚以减少计算
            num_ctx: 2048,                // 限制上下文长度
            num_batch: 256,               // 进一步优化批处理大小
            num_gpu: 1,                   // 确保使用GPU加速
            num_thread: 4,                // 限制线程数以减少资源竞争
          }
        })
      };
      if (extra_body) body.extra_body = extra_body; // 透传 mm_processor_kwargs 等

      const resp = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errorData = await resp.text();
        console.log('Ollama响应:', JSON.stringify(errorData, null, 2));
        return NextResponse.json({ ok: false, error: errorData }, { status: resp.status });
      }

      // 如果是流式响应，直接返回流
      if (useStream && resp.body) {
        return new Response(resp.body, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // 非流式响应的处理
      const data = await parseMaybeNdjson(resp);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}

function buildHeaders() {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8"
  };
  if (QWEN_API_KEY) headers["authorization"] = `Bearer ${QWEN_API_KEY}`;
  return headers;
}

function normalizeMessages(messages: any[] = [], images: string[] = [], videos: string[] = []) {
  // 如果已是多模态格式，直接返回
  const hasMultiModal = Array.isArray(messages) && messages.some(m => Array.isArray(m?.content));
  if (hasMultiModal) return messages;

  // 将 images / videos 注入到最后一个 user 消息
  const mmParts: any[] = [];
  for (const url of images || []) {
    if (!url) continue;
    mmParts.push({ type: "image_url", image_url: { url } });
  }
  for (const url of videos || []) {
    if (!url) continue;
    // 传入 data:video/jpeg;base64,frame1,frame2,... （兼容 vLLM 的帧拼接方案，参考官方 README）
    mmParts.push({ type: "video_url", video_url: { url } });
  }

  if (mmParts.length === 0) return messages;

  const cloned = Array.isArray(messages) ? [...messages] : [];
  const idx = Math.max(0, cloned.map((m) => m?.role).lastIndexOf("user"));
  const target = cloned[idx] || { role: "user", content: [] };
  const userText = typeof target?.content === "string" ? [{ type: "text", text: target.content }] : (Array.isArray(target?.content) ? target.content : []);
  cloned[idx] = { role: "user", content: [...userText, ...mmParts] };
  return cloned;
}

async function parseMaybeNdjson(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    // 简单 NDJSON 聚合
    const lines = text.split('\n').filter(Boolean);
    try {
      return lines.map(l => JSON.parse(l));
    } catch {
      return text;
    }
  }
}

function maskUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname}`;
  } catch {
    return url;
  }
}