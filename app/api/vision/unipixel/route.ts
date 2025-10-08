import { NextResponse } from 'next/server';

// 通过你部署的 Hugging Face Inference Endpoint（或 Space）调用 UniPixel-3B
// 配置方式：环境变量 UNIPIXEL_ENDPOINT（完整URL），可选 HF_TOKEN（如需鉴权）
// 也支持请求体里传 endpoint 字段覆盖默认
type SegPayload = {
  imageBase64: string; // data:image/...;base64,... or pure base64
  target: string;      // 用户描述要切割的目标，如“草莓果实”
  endpoint?: string;   // 可覆盖默认端点
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SegPayload;
    const { imageBase64, target, endpoint } = body || {};
    if (!imageBase64 || !target) {
      return NextResponse.json({ error: 'missing imageBase64 or target' }, { status: 400 });
    }
    const base64 = imageBase64.startsWith('data:') ? imageBase64.split(',').pop() || '' : imageBase64;
    if (!base64) return NextResponse.json({ error: 'invalid base64' }, { status: 400 });

    const url = endpoint || process.env.UNIPIXEL_ENDPOINT;
    if (!url) {
      return NextResponse.json({ error: 'UNIPIXEL_ENDPOINT not configured' }, { status: 400 });
    }
    const hfToken = process.env.HF_TOKEN || '';

    // 根据端点类型选择请求格式：
    // 1) 本地 FastAPI (/describe_image)：multipart/form-data 上传图片文件（字段名：file）
    // 2) 其他云端推理：JSON 格式 { inputs: { image: "data:image/png;base64,...", prompt: "..." } }
    let resp: Response;
    if (/\/describe_image\/?$/i.test(url)) {
      // 本地 FastAPI - 发送 file（使用 Blob + 文件名，避免 multipart 边界问题）
      const mime = imageBase64.startsWith('data:')
        ? (imageBase64.slice(5).split(';')[0] || 'image/png')
        : 'image/png';
      const ext = (() => {
        const m = mime.split('/')[1] || 'png';
        return m.toLowerCase() === 'jpeg' ? 'jpg' : m.toLowerCase();
      })();
      const bin = Buffer.from(base64, 'base64');

      const form = new FormData();
      form.append('file', new Blob([bin], { type: mime }), `image.${ext}`);

      // 切记不要手动设置 Content-Type，让 undici 自动添加带 boundary 的头
      const headers: Record<string, string> = {};
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

      resp = await fetch(url, { method: 'POST', headers, body: form });
    } else if (/\/infer_unipixel_base64\/?$/i.test(url)) {
      // 本地官方管线 JSON 分割端点：避免 multipart，按官方流程返回遮罩与描述
      const payload = {
        imageBase64: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${base64}`,
        query: target,
        sample_frames: 16,
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;
      resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    } else if (/\/infer_seg_base64\/?$/i.test(url)) {
      // 本地 FastAPI JSON 分割端点：避免 multipart 边界问题
      const payload = {
        imageBase64: imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${base64}`,
        query: target,
        sample_frames: 16,
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;
      resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    } else if (/\/infer_seg\/?$/i.test(url)) {
      // 兼容旧的 multipart 端点（如需保留）
      const mime = imageBase64.startsWith('data:')
        ? (imageBase64.slice(5).split(';')[0] || 'image/png')
        : 'image/png';
      const ext = (() => {
        const m = mime.split('/')[1] || 'png';
        return m.toLowerCase() === 'jpeg' ? 'jpg' : m.toLowerCase();
      })();
      const bin = Buffer.from(base64, 'base64');

      const form = new FormData();
      form.append('file', new Blob([bin], { type: mime }), `image.${ext}`);
      form.append('query', target);
      form.append('sample_frames', String(16));

      const headers: Record<string, string> = {};
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

      resp = await fetch(url, { method: 'POST', headers, body: form });
    } else if (/\/partial(_1)?\/?$/i.test(url)) {
      // HuggingFace Gradio Space - /partial 图像推理
      // 使用 multipart/form-data，字段名与 Gradio 一致：media, query, sample_frames
      const mime = imageBase64.startsWith('data:')
        ? (imageBase64.slice(5).split(';')[0] || 'image/png')
        : 'image/png';
      const ext = (() => {
        const m = mime.split('/')[1] || 'png';
        return m.toLowerCase() === 'jpeg' ? 'jpg' : m.toLowerCase();
      })();
      const bin = Buffer.from(base64, 'base64');
      const file = new File([bin], `image.${ext}`, { type: mime });

      const form = new FormData();
      form.append('media', file);
      form.append('query', target);
      form.append('sample_frames', String(16)); // 默认值，可后续透传

      const headers: Record<string, string> = {};
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

      resp = await fetch(url, { method: 'POST', headers, body: form });
    } else {
      // 其他端点：回退 JSON（某些自托管端可能使用自定义协议）
      const inputs = {
        inputs: {
          image: `data:image/png;base64,${base64}`,
          prompt: target,
        },
      };
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`;

      resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(inputs) });
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      return NextResponse.json({ error: `unipixel error: ${txt || resp.status}` }, { status: resp.status });
    }

    const data = await resp.json().catch(() => null);

    // 解析返回：优先解析 Gradio data 数组；否则兼容原字段
    let mask = '';
    let description = '';

    // Gradio Space 返回形如 { data: [...] }
    if (data && Array.isArray(data.data)) {
      const arr = data.data;
      // /partial: [model_response, annotated_image, download]
      const descCandidate = arr[0];
      const maskCandidate = arr[1];

      // 描述可能是字符串或对象的某字段
      if (typeof descCandidate === 'string') description = descCandidate;
      else if (descCandidate && typeof descCandidate === 'object') {
        description =
          descCandidate.text ||
          descCandidate.content ||
          JSON.stringify(descCandidate);
      }

      // 掩码可能是 base64 字符串或对象（Annotatedimage / Image）
      if (typeof maskCandidate === 'string') mask = maskCandidate;
      else if (maskCandidate && typeof maskCandidate === 'object') {
        // 常见字段尝试
        mask =
          maskCandidate.image ||
          maskCandidate.base64 ||
          maskCandidate.data ||
          '';
      }
    }

    // 兼容本地/其他返回形态
    if (!mask) {
      mask =
        data?.mask ||
        data?.masks?.[0] ||
        data?.result?.mask ||
        '';
    }
    if (!description) {
      description =
        data?.description ||
        data?.result?.description ||
        data?.text ||
        '';
    }

    if (!mask && !description) {
      return NextResponse.json({ warning: 'no usable result returned from endpoint', raw: data }, { status: 200 });
    }

    return NextResponse.json({ mask, description });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}