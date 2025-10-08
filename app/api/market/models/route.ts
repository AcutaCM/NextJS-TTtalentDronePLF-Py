import { NextRequest, NextResponse } from 'next/server';

type CapsObj = { text?: boolean; vision?: boolean; tool?: boolean; json?: boolean; function?: boolean };
type ModelRow = {
  key: string;
  name: string;
  caps: CapsObj | string[]; // 内部存对象，输出时转为 string[]
  context?: number;
  output?: number;
  inPrice?: number;
  outPrice?: number;
};

const CATALOG: Record<string, ModelRow[]> = {
  openai: [
    { key: 'gpt-4o-mini', name: 'GPT-4o mini', caps: { text: true, vision: true, tool: true, json: true }, context: 200000, output: 16000, inPrice: 0.15, outPrice: 0.60 },
    { key: 'gpt-4o', name: 'GPT-4o', caps: { text: true, vision: true, tool: true, json: true }, context: 200000, output: 16000, inPrice: 5, outPrice: 15 },
    { key: 'gpt-4.1', name: 'GPT-4.1', caps: { text: true, tool: true, json: true }, context: 128000, output: 4096, inPrice: 5, outPrice: 15 },
  ],
  'azure-openai': [
    { key: 'gpt-4o', name: 'GPT-4o (Azure)', caps: { text: true, vision: true, tool: true, json: true }, context: 200000, output: 16000 },
    { key: 'gpt-35-turbo', name: 'GPT-3.5 Turbo (Azure)', caps: { text: true, tool: true }, context: 16385, output: 4096 },
  ],
  deepseek: [
    { key: 'deepseek-chat', name: 'DeepSeek-Chat', caps: { text: true, tool: true }, context: 32768, output: 8192 },
    { key: 'deepseek-coder', name: 'DeepSeek-Coder', caps: { text: true }, context: 32768, output: 8192 },
  ],
  moonshot: [
    { key: 'moonshot-v1-8k', name: 'moonshot-v1-8k', caps: { text: true, tool: true }, context: 8192, output: 4096 },
    { key: 'moonshot-v1-32k', name: 'moonshot-v1-32k', caps: { text: true, tool: true }, context: 32768, output: 8192 },
  ],
  zhipu: [
    { key: 'glm-4', name: 'GLM-4', caps: { text: true, tool: true }, context: 128000, output: 4096 },
    { key: 'glm-4v', name: 'GLM-4V', caps: { text: true, vision: true }, context: 128000, output: 4096 },
  ],
  baichuan: [
    { key: 'Baichuan4', name: 'Baichuan 4', caps: { text: true, tool: true }, context: 128000, output: 4096 },
  ],
  qwen: [
    { key: 'qwen2.5', name: 'Qwen2.5', caps: { text: true, tool: true }, context: 131072, output: 8192 },
    { key: 'qwen-vl', name: 'Qwen-VL', caps: { text: true, vision: true }, context: 131072, output: 8192 },
  ],
  groq: [
    { key: 'llama-3.1-70b-versatile', name: 'Llama-3.1-70B', caps: { text: true, tool: true }, context: 131072, output: 8192 },
  ],
  mistral: [
    { key: 'mistral-large-latest', name: 'Mistral Large', caps: { text: true, tool: true }, context: 128000, output: 8192 },
  ],
  gemini: [
    { key: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', caps: { text: true, vision: true, tool: true }, context: 1000000, output: 8192 },
  ],
  anthropic: [
    { key: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', caps: { text: true, tool: true }, context: 200000, output: 4096 },
  ],
  ollama: [
    { key: 'llama3.1:8b', name: 'Llama3.1 8B (Ollama)', caps: { text: true }, context: 8192, output: 2048 },
  ],
  vllm: [
    { key: 'qwen2.5-7b-instruct', name: 'Qwen2.5-7B Instruct (vLLM)', caps: { text: true, tool: true }, context: 32768, output: 4096 },
  ],
  xinference: [
    { key: 'yi-1.5-9b-chat', name: 'Yi-1.5-9B Chat (Xinference)', caps: { text: true }, context: 32768, output: 4096 },
  ],
};

// 将 caps 对象转换为字符串数组，保持与前端预期一致
const capsToArray = (caps: CapsObj | string[] | undefined): string[] => {
  if (Array.isArray(caps)) return caps;
  if (!caps) return [];
  const order: Array<keyof CapsObj> = ['text', 'vision', 'tool', 'json', 'function'];
  return order.filter(k => Boolean((caps as CapsObj)[k]));
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get('provider') || '';

  if (provider) {
    const rows = (CATALOG[provider] || []).map(r => ({
      ...r,
      caps: capsToArray(r.caps as CapsObj),
    }));
    return NextResponse.json(rows);
  }

  // 返回全部：合并并附带 provider 字段
  const merged = Object.entries(CATALOG).flatMap(([prov, rows]) =>
    rows.map(r => ({ ...r, caps: capsToArray(r.caps as CapsObj), provider: prov })),
  );
  return NextResponse.json(merged);
}