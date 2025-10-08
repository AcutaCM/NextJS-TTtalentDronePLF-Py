import { NextResponse } from 'next/server';

type Provider = {
  key: string;
  name: string;
  desc?: string;
  homepage?: string;
  logo?: string;
  tags?: string[];
};

const PROVIDERS: Provider[] = [
  { key: 'openai', name: 'OpenAI', desc: 'OpenAI 官方服务', homepage: 'https://platform.openai.com', tags: ['GPT-4o','兼容OpenAI'] },
  { key: 'azure-openai', name: 'Azure OpenAI', desc: '微软 Azure OpenAI 服务', homepage: 'https://azure.microsoft.com', tags: ['企业','兼容OpenAI'] },
  { key: 'deepseek', name: 'DeepSeek', desc: 'DeepSeek 推理与编码模型', homepage: 'https://api.deepseek.com' },
  { key: 'moonshot', name: 'Moonshot', desc: 'Moonshot AI', homepage: 'https://platform.moonshot.cn' },
  { key: 'zhipu', name: '智谱 GLM', desc: '智谱 AI', homepage: 'https://open.bigmodel.cn' },
  { key: 'baichuan', name: '百川', desc: 'Baichuan AI', homepage: 'https://platform.baichuan-ai.com' },
  { key: 'qwen', name: '通义千问', desc: '阿里云通义 Qwen（DashScope）', homepage: 'https://dashscope.aliyun.com' },
  { key: 'groq', name: 'Groq', desc: 'Groq LPU 加速', homepage: 'https://console.groq.com' },
  { key: 'mistral', name: 'Mistral', desc: 'Mistral AI', homepage: 'https://console.mistral.ai' },
  { key: 'gemini', name: 'Gemini', desc: 'Google AI（Gemini）', homepage: 'https://ai.google.dev' },
  { key: 'anthropic', name: 'Anthropic', desc: 'Claude 模型', homepage: 'https://console.anthropic.com' },
  { key: 'ollama', name: 'Ollama', desc: '本地模型运行', homepage: 'https://ollama.com' },
  { key: 'vllm', name: 'vLLM', desc: '自托管 vLLM 推理', homepage: 'https://vllm.ai' },
  { key: 'xinference', name: 'Xinference', desc: 'Xorbits 推理框架', homepage: 'https://inference.readthedocs.io' },
  { key: 'dify', name: 'Dify', desc: 'Dify 应用 / 工作流推理服务', homepage: 'https://dify.ai', tags: ['工作流','私有化','兼容OpenAI'] },
];

export async function GET() {
  return NextResponse.json(PROVIDERS);
}