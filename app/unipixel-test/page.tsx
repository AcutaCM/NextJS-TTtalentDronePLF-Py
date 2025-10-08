"use client";

import React, { useState, useRef } from "react";

type ApiResult = {
  mask?: string;
  description?: string;
  warning?: string;
  error?: string;
  raw?: any;
};

const DEFAULT_ENDPOINTS = [
  { label: "本地官方管线(JSON)", value: "http://localhost:8000/infer_unipixel_base64" },
  { label: "本地描述(文件上传)", value: "http://localhost:8000/describe_image" },
  { label: "本地Gradio(JSON)", value: "http://localhost:8000/infer_seg_base64" },
  { label: "云端Gradio(/partial)", value: "https://huggingface.co/spaces/PolyU-ChenLab/UniPixel/api/predict/partial" },
];

export default function UniPixelTestPage() {
  const [imageBase64, setImageBase64] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("Please segment the main object.");
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINTS[0].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const onStart = async () => {
    if (!imageBase64) {
      alert("请先选择图片");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch("/api/vision/unipixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          target: prompt,
          endpoint,
        }),
      });

      const data = await resp.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const onClear = () => {
    setImageBase64("");
    setPrompt("Please segment the main object.");
    setResult(null);
    fileInputRef.current?.value && (fileInputRef.current.value = "");
  };

  const maskDataUrl = result?.mask
    ? (result!.mask.startsWith("data:")
        ? result!.mask
        : `data:image/${(result!.mask.length > 1024 ? "png" : "png")};base64,${result!.mask}`)
    : "";

  return (
    <div style={{ maxWidth: 900, margin: "20px auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h2>UniPixel 本地/云端分割测试页</h2>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>选择端点：</label>
        <select
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        >
          {DEFAULT_ENDPOINTS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label} - {opt.value}</option>
          ))}
        </select>
        <small style={{ color: "#666" }}>
          推荐：本地官方管线(JSON) http://localhost:8000/infer_unipixel_base64
        </small>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>上传图片：</label>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} />
        {imageBase64 && (
          <div style={{ marginTop: 12 }}>
            <img src={imageBase64} alt="preview" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #eee" }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>提示词：</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
        />
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={onStart}
          disabled={loading}
          style={{
            padding: "10px 16px",
            background: "#1677ff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {loading ? "分割中..." : "开始分割"}
        </button>
        <button
          onClick={onClear}
          style={{
            padding: "10px 16px",
            background: "#f0f0f0",
            color: "#333",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          清空
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>结果</h3>
        {result?.error && (
          <div style={{ color: "#d4380d", marginBottom: 8 }}>错误：{result.error}</div>
        )}
        {result?.warning && (
          <div style={{ color: "#fa8c16", marginBottom: 8 }}>提示：{result.warning}</div>
        )}
        {result?.description && (
          <div style={{ whiteSpace: "pre-wrap", background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <strong>描述：</strong>
            <div>{result.description}</div>
          </div>
        )}
        {maskDataUrl ? (
          <div style={{ marginTop: 12 }}>
            <strong>遮罩：</strong>
            {/* 支持 gif 或 png 的 dataURL */}
            <img src={maskDataUrl} alt="mask" style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #eee" }} />
          </div>
        ) : (
          <div style={{ color: "#888" }}>暂无遮罩（若端点仅返回描述或失败则不显示）</div>
        )}

        {result && !result.error && !result.mask && !result.description && (
          <pre style={{ marginTop: 12, background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 8, padding: 12 }}>
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}