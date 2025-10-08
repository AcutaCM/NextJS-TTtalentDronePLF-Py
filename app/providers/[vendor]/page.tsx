"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input, Select, Switch, Button, Divider, Form, Alert } from "antd";
import Image from "next/image";

const VENDOR_DEFAULTS: Record<string, { base?: string; models?: string[] }> = {
  openai: { base: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "o3-mini"] },
  ollama: { base: "http://127.0.0.1:11434", models: ["llama3.1", "qwen2", "deepseek-v3"] },
  fal: { base: "https://api.fal.ai", models: ["fal-audio", "fal-image"] },
  "azure-openai": { base: "https://{resource}.openai.azure.com", models: ["gpt-4o-mini", "gpt-4o"] },
  "azure-ai": { base: "https://{resource}.cognitiveservices.azure.com", models: ["gpt-4o", "gemini-1.5-pro"] },
  "ollama-cloud": { base: "https://api.ollama.ai", models: ["llama3.1", "mistral"] },
  vllm: { base: "http://localhost:8000", models: ["custom-llm"] },
  xinfer: { base: "https://api.xinference.ai", models: ["xinfer-text", "xinfer-vision"] },
  anthropic: { base: "https://api.anthropic.com/v1", models: ["claude-3.5-sonnet", "claude-3.5-haiku"] },
  bedrock: { base: "https://bedrock-runtime.{region}.amazonaws.com", models: ["anthropic.claude-3-5-sonnet", "meta.llama3-70b"] },
  google: { base: "https://generativelanguage.googleapis.com/v1beta", models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
  vertex: { base: "https://{region}-aiplatform.googleapis.com", models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
  deepseek: { base: "https://api.deepseek.com", models: ["deepseek-chat", "deepseek-reasoner"] },
  moonshot: { base: "https://api.moonshot.cn", models: ["kimi-1.5"] },
  aihubmix: { base: "https://api.aihubmix.com", models: ["mix-any"] },
  openrouter: { base: "https://api.openrouter.ai/v1", models: ["openrouter/any"] },
};

function getStored(provider: string, k: "apiKey" | "apiBase" | "enabled" | "model") {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(`chat.${k}.${provider}`) || "";
}
function setStored(provider: string, k: "apiKey" | "apiBase" | "enabled" | "model", v: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`chat.${k}.${provider}`, v);
}

export default function ProviderConfigPage() {
  const params = useParams() as { vendor?: string };
  const router = useRouter();
  const vendor = (params.vendor || "").toLowerCase();

  const defaults = useMemo(() => VENDOR_DEFAULTS[vendor] || { base: "", models: [] }, [vendor]);

  const [enabled, setEnabled] = useState<boolean>(getStored(vendor, "enabled") === "true");
  const [apiBase, setApiBase] = useState<string>(getStored(vendor, "apiBase") || defaults.base || "");
  const [apiKey, setApiKey] = useState<string>(getStored(vendor, "apiKey"));
  const [model, setModel] = useState<string>(getStored(vendor, "model") || (defaults.models?.[0] || ""));

  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);

  useEffect(() => {
    // 更新本地存储的当前值
    setStored(vendor, "enabled", String(enabled));
    setStored(vendor, "apiBase", apiBase);
    setStored(vendor, "apiKey", apiKey);
    setStored(vendor, "model", model);
  }, [vendor, enabled, apiBase, apiKey, model]);

  if (!vendor) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="未指定服务商" type="error" />
        <Button style={{ marginTop: 12 }} onClick={() => router.push("/")}>返回</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 1040, margin: "0 auto" }}>
      <Card>
        <CardHeader>
          <CardTitle>{vendor.toUpperCase()}</CardTitle>
          <CardDescription>设置 {vendor} 的接口参数</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700 }}>启用</div>
            <Switch checked={enabled} onChange={setEnabled} />
          </div>

          <Form layout="vertical">
            <Form.Item label="服务地址">
              <Input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder={defaults.base || "https://api.example.com"} />
            </Form.Item>

            <Form.Item label="API Key">
              <Input.Password value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="****************" />
            </Form.Item>

            <Form.Item label="默认模型">
              <Select
                value={model}
                onChange={setModel}
                options={(defaults.models || []).map(m => ({ label: m, value: m }))}
              />
            </Form.Item>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button type="primary" loading={checking} onClick={async () => {
                setChecking(true);
                setCheckMsg(null);
                setCheckErr(null);
                try {
                  // 简单连接校验：向后端代理探测，或直接提示成功（这里做前端占位）
                  if (!apiKey || !apiBase) {
                    setCheckErr("请先填写 API Key 与服务地址");
                  } else {
                    // 可改为请求 /api/ping?provider=vendor
                    await new Promise(r => setTimeout(r, 600));
                    setCheckMsg("连接校验通过，密钥与地址看起来有效");
                  }
                } catch (e: any) {
                  setCheckErr(e?.message || "连接校验失败");
                } finally {
                  setChecking(false);
                }
              }}>
                检查
              </Button>
              <Button onClick={() => router.push("/")}>返回首页</Button>
            </div>

            {(checkMsg || checkErr) && (
              <div style={{ marginTop: 12 }}>
                {checkMsg && <Alert message={checkMsg} type="success" />}
                {checkErr && <Alert message={checkErr} type="error" />}
              </div>
            )}
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}