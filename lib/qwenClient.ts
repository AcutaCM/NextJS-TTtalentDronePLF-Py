export interface VisionChatPayload {
  model?: string;
  messages: any[];
  images?: string[];
  videos?: string[]; // 支持 data:video/jpeg;base64,<frame1,...>
  extra_body?: Record<string, any>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
}

export async function callQwenVision(payload: VisionChatPayload) {
  const resp = await fetch('/api/vision/qwen', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  if (!resp.ok || !data?.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : JSON.stringify(data?.error));
  }
  return data.data;
} 