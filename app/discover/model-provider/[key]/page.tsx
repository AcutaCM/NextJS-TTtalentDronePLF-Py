"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar, Button, Tag } from "antd";
import { GlobalOutlined, GithubOutlined, ShareAltOutlined } from "@ant-design/icons";

// 轻量数据源（后续可替换为后端接口 /api/market/providers / /api/market/models?provider=）
const PROVIDERS: Record<string, {
  name: string;
  handle: string;
  emoji: string;
  intro: string;
  models: Array<{
    name: string;
    key: string;
    context: string; // 最大上下文
    output: string;  // 最大输出
    inPrice: string; // 输入价格
    outPrice: string; // 输出价格
    caps: Array<"text" | "vision" | "tool" | "function" | "json">;
  }>;
  related: Array<{ key: string; name: string; intro: string; emoji: string }>;
}> = {
  openai: {
    name: "OpenAI",
    handle: "@OpenAI",
    emoji: "🟦",
    intro:
      "OpenAI 是全球领先的人工智能研究机构，其开发的模型如GPT系列推动了自然语言处理的前沿。OpenAI 致力于通过创新和高效的AI解决方案改变多个行业。他们的产品具有显著的性能和稳定性，广泛应用于研究、商业创新应用。",
    models: [
      { name: "GPT-5 Codex", key: "gpt-5-codex", context: "400K", output: "128K", inPrice: "$1.25", outPrice: "$10.00", caps: ["text", "tool", "json"] },
      { name: "GPT-5", key: "gpt-5", context: "400K", output: "128K", inPrice: "$1.25", outPrice: "$10.00", caps: ["text", "vision", "tool"] },
      { name: "GPT-5 mini", key: "gpt-5-mini", context: "400K", output: "128K", inPrice: "$0.25", outPrice: "$2.00", caps: ["text", "tool"] },
      { name: "GPT-5 nano", key: "gpt-5-nano", context: "400K", output: "128K", inPrice: "$0.05", outPrice: "$0.40", caps: ["text"] },
      { name: "GPT-5 Chat", key: "gpt-5-chat-latest", context: "400K", output: "128K", inPrice: "$1.25", outPrice: "$10.00", caps: ["text", "tool"] },
      { name: "o4-mini", key: "o4-mini", context: "200K", output: "97K", inPrice: "$1.10", outPrice: "$4.40", caps: ["text", "vision"] },
      { name: "o4-mini Deep Research", key: "o4-mini-deep-research", context: "200K", output: "97K", inPrice: "$2.00", outPrice: "$8.00", caps: ["text", "tool"] },
      { name: "o3-pro", key: "o3-pro", context: "200K", output: "97K", inPrice: "$20.00", outPrice: "$80.00", caps: ["text", "tool", "json"] },
    ],
    related: [
      { key: "azure-openai", name: "Azure OpenAI", intro: "微软企业级合规托管，包含 GPT-3.5 和最新的 GPT-4 系列，支持多种部署类型。", emoji: "🟦" },
      { key: "ollama", name: "Ollama", intro: "本地多模型管理与推理，适合离线、隐私与快速迭代。", emoji: "💻" },
      { key: "openrouter", name: "OpenRouter", intro: "聚合多家模型的统一路由层，便于统一接入。", emoji: "🛣️" },
    ],
  },
  "azure-openai": {
    name: "Azure OpenAI",
    handle: "@AzureOpenAI",
    emoji: "🟦",
    intro:
      "Azure 提供多种先进的AI模型，包括GPT-3.5和最新的GPT-4系列，支持多种模型类型和部署方式，并具备企业级安全与合规能力。",
    models: [],
    related: [
      { key: "openai", name: "OpenAI", intro: "OpenAI 官方服务商，提供最新模型与稳定能力。", emoji: "🟦" },
      { key: "ollama", name: "Ollama", intro: "本地模型托管与推理。", emoji: "💻" },
    ],
  },
  ollama: {
    name: "Ollama",
    handle: "@Ollama",
    emoji: "💻",
    intro:
      "Ollama 是本地模型运行时，支持 Llama 3、Qwen、Phi 等多模型离线部署，适合隐私场景和快速原型。",
    models: [],
    related: [
      { key: "openai", name: "OpenAI", intro: "云端强性能模型，覆盖多模态与工具调用。", emoji: "🟦" },
      { key: "openrouter", name: "OpenRouter", intro: "统一接入多家模型服务商。", emoji: "🛣️" },
    ],
  },
};

const capsIcon = (c: string) => {
  switch (c) {
    case "vision": return "👁️";
    case "tool": return "🧩";
    case "json": return "🧱";
    case "function": return "🧰";
    case "text":
    default: return "💬";
  }
};

export default function ProviderDetailPage() {
  const params = useParams() as { key?: string };
  const router = useRouter();
  const providerKey = (params?.key || "").toString();
  const data = PROVIDERS[providerKey] || PROVIDERS["openai"]; // fallback

  const [tab, setTab] = useState<"overview" | "guide" | "related">("overview");

  const tableRows = useMemo(() => data.models, [data.models]);

  return (
    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
      <style>{`
        :root {
          --bg: #0f1115;
          --card: rgba(255,255,255,0.06);
          --card-border: rgba(255,255,255,0.12);
          --muted: #9ca3af;
          --text: #eaeaf0;
          --divider: rgba(255,255,255,0.08);
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg: #ffffff;
            --card: #ffffff;
            --card-border: rgba(0,0,0,0.08);
            --muted: #6b7280;
            --text: #111827;
            --divider: rgba(0,0,0,0.08);
          }
        }
        body { background: var(--bg); }
        .card {
          border: 1px solid var(--card-border);
          background: var(--card);
          border-radius: 12px;
        }
        .hoverable { transition: transform .15s ease, background .15s ease; }
        .hoverable:hover { transform: translateY(-1px); }
        .link { color: var(--muted); cursor: pointer; }
        .link:hover { color: var(--text); }
      `}</style>

      {/* 左侧主内容 */}
      <div>
        {/* 顶部面包屑与品牌 */}
        <div style={{ color: "var(--muted)", fontSize: 12, marginBottom: 12 }}>
          Discover / 模型服务商 / {providerKey}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Avatar size={48} style={{ background: "#fff", color: "#111" }}>{data.emoji}</Avatar>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 24, color: "var(--text)" }}>{data.name}</div>
            <div style={{ color: "var(--muted)" }}>{data.handle}</div>
          </div>
        </div>

        {/* 简介 */}
        <div className="card" style={{ padding: 14, marginBottom: 10, color: "var(--text)" }}>
          {data.intro}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, borderBottom: `1px solid var(--divider)`, marginBottom: 12 }}>
          {[
            { key: "overview", label: "概览" },
            { key: "guide", label: "接入指南" },
            { key: "related", label: "相关推荐" },
          ].map((t) => (
            <div
              key={t.key}
              onClick={() => setTab(t.key as any)}
              style={{
                padding: "8px 0",
                cursor: "pointer",
                color: tab === t.key ? "var(--text)" : "var(--muted)",
                borderBottom: tab === t.key ? "2px solid var(--text)" : "2px solid transparent",
                marginBottom: -1,
                fontWeight: 600,
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* 支持模型表（概览） */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 800, color: "var(--text)" }}>支持模型</div>
              <Tag style={{ borderRadius: 999, margin: 0 }}>{tableRows.length}</Tag>
            </div>

            <div className="card" style={{ overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr 0.9fr 40px",
                  padding: "10px 12px",
                  borderBottom: `1px solid var(--divider)`,
                  color: "var(--muted)",
                  fontSize: 12,
                  background: "transparent",
                }}
              >
                <div>模型名称</div>
                <div>模型能力</div>
                <div>最大上下文长度</div>
                <div>最大输出长度</div>
                <div>输入价格</div>
                <div>输出价格</div>
              </div>

              {tableRows.map((m, i) => (
                <div
                  key={m.key}
                  className="hoverable"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.6fr 1fr 1fr 0.9fr 0.9fr 40px",
                    padding: "12px",
                    borderBottom: i === tableRows.length - 1 ? "none" : `1px solid var(--divider)`,
                    alignItems: "center",
                    color: "var(--text)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar size={28} style={{ background: "#fff", color: "#111" }}>{data.emoji}</Avatar>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{m.key}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, fontSize: 16 }}>
                    {m.caps.map((c) => (
                      <span key={c} title={c}>{capsIcon(c)}</span>
                    ))}
                  </div>
                  <div>{m.context}</div>
                  <div>{m.output}</div>
                  <div>{m.inPrice}</div>
                  <div>{m.outPrice}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 接入指南 */}
        {tab === "guide" && (
          <div className="card" style={{ padding: 14, color: "var(--text)" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>接入指南</div>
            <ol style={{ lineHeight: 1.8, color: "var(--muted)" }}>
              <li>在右侧点击“配置服务商”，填写 API Key 与 Base URL。</li>
              <li>在聊天页右上角设置中选择此服务商和模型。</li>
              <li>也可通过后端 /api/chat-proxy 统一代理，减少前端暴露密钥。</li>
            </ol>
          </div>
        )}

        {/* 相关推荐 */}
        {tab === "related" && (
          <div className="card" style={{ padding: 14, color: "var(--text)" }}>
            这里展示与 {data.name} 相关的模型、插件与应用推荐。
          </div>
        )}
      </div>

      {/* 右侧侧栏 */}
      <aside>
        <div className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          <Button
            type="primary"
            block
            onClick={() => {
              // 跳转到内置的 Provider 配置页，或弹出现有 Chat 内的配置卡
              router.push(`/providers/${providerKey}`);
            }}
          >
            配置服务商
          </Button>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", color: "var(--muted)" }}>
            <GlobalOutlined />
            <GithubOutlined />
            <ShareAltOutlined />
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, color: "var(--text)" }}>相关服务商</div>
            <div className="link" onClick={() => router.push("/discover/model-provider")}>查看更多></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.related.map((r) => (
              <div
                key={r.key}
                className="hoverable"
                onClick={() => router.push(`/discover/model-provider/${r.key}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr",
                  alignItems: "center",
                  gap: 10,
                  padding: 10,
                  border: "1px solid var(--card-border)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                <Avatar size={28} style={{ background: "#fff", color: "#111" }}>{r.emoji}</Avatar>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{r.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>{r.intro}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}