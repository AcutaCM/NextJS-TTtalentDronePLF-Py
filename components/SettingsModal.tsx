"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Tabs, Input, Button as AntdButton, Tag, Switch, Row, Col, Tooltip } from "antd";
import Image from "next/image";
import { useRouter } from "next/navigation";

// 厂商元数据（可扩展）
type VendorKey =
  | "openai"
  | "ollama"
  | "fal"
  | "azure-openai"
  | "azure-ai"
  | "ollama-cloud"
  | "vllm"
  | "xinfer"
  | "anthropic"
  | "bedrock"
  | "google"
  | "vertex"
  | "deepseek"
  | "moonshot"
  | "aihubmix"
  | "openrouter";

interface VendorMeta {
  key: VendorKey;
  name: string;
  desc: string;
  enabled?: boolean;
  icons: { // 在线源与本地名
    url?: string;
    file?: string; // public/providers/{file}
  };
}

const ALL_VENDORS: VendorMeta[] = [
  { key: "openai", name: "OpenAI", desc: "全球领先的 AI 机构，提供 GPT 系列模型", enabled: true, icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/openai.svg", file: "openai.svg" } },
  { key: "ollama", name: "Ollama", desc: "本地与远程模型管理与推理", enabled: true, icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/ollama.svg", file: "ollama.svg" } },
  { key: "fal", name: "fal", desc: "面向开发者的生成式媒体平台", enabled: true, icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/fal.svg", file: "fal.svg" } },
  { key: "azure-openai", name: "Azure OpenAI", desc: "微软 Azure 托管的 OpenAI 服务", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/azure.svg", file: "azure.svg" } },
  { key: "azure-ai", name: "Azure AI", desc: "Azure 多样化 AI 模型服务", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/azure.svg", file: "azure.svg" } },
  { key: "ollama-cloud", name: "Ollama Cloud", desc: "Ollama 云端模型访问", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/ollama.svg", file: "ollama.svg" } },
  { key: "vllm", name: "vLLM", desc: "高性能开源推理框架", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/vllm.svg", file: "vllm.svg" } },
  { key: "xinfer", name: "Xinference", desc: "Xorbits 推理服务", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/xinference.svg", file: "xinference.svg" } },
  { key: "anthropic", name: "Anthropic", desc: "专注安全的 AI 公司，提供 Claude 系列", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/anthropic.svg", file: "anthropic.svg" } },
  { key: "bedrock", name: "Amazon Bedrock", desc: "AWS 提供的多模型平台", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/aws.svg", file: "aws.svg" } },
  { key: "google", name: "Google Gemini", desc: "Google 的通用 AI 模型系列", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/google.svg", file: "google.svg" } },
  { key: "vertex", name: "Vertex AI", desc: "Google Cloud 的 AI 平台", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/google-cloud.svg", file: "google-cloud.svg" } },
  { key: "deepseek", name: "DeepSeek", desc: "深度求索模型", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/deepseek.svg", file: "deepseek.svg" } },
  { key: "moonshot", name: "Moonshot", desc: "Kimi 推理服务", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/moonshot.svg", file: "moonshot.svg" } },
  { key: "aihubmix", name: "AIHubMix", desc: "聚合类服务", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/aihubmix.svg", file: "aihubmix.svg" } },
  { key: "openrouter", name: "OpenRouter", desc: "多模型路由与聚合", icons: { url: "https://raw.githubusercontent.com/lobehub/lobe-assets/main/logos/openrouter.svg", file: "openrouter.svg" } },
];

function localIconSrc(file?: string): string | null {
  if (!file) return null;
  return `/providers/${file}`;
}

// 在线图标缓存到 localStorage（base64），失败则回退本地文件或 Emoji
async function fetchAndCacheIcon(key: string, url?: string): Promise<string | null> {
  if (!url) return null;
  const cacheKey = `vendor.icon.${key}`;
  const cached = typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
  if (cached) return cached;

  try {
    const resp = await fetch(url, { cache: "force-cache" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        try {
          localStorage.setItem(cacheKey, dataUrl);
        } catch {}
        resolve(dataUrl);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onJumpToConfig?: (vendor: VendorKey) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, onJumpToConfig }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(true); // “全部”按钮
  const [iconsMap, setIconsMap] = useState<Record<string, string | null>>({});

  // 过滤
  const filtered = useMemo(() => {
    const list = ALL_VENDORS.filter(v =>
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.key.toLowerCase().includes(query.toLowerCase())
    );
    return list;
  }, [query]);

  const enabledList = filtered.filter(v => v.enabled);
  const disabledList = filtered.filter(v => !v.enabled);

  useEffect(() => {
    // 并行拉取缺失的图标（仅首次）
    const run = async () => {
      const tasks = filtered.map(async v => {
        const localSrc = localIconSrc(v.icons.file);
        // 若存在 public/providers 静态文件，直接使用该路径（由 Next 静态服务）
        // 否则尝试在线缓存
        if (localSrc) {
          return { k: v.key, src: localSrc };
        }
        const remote = await fetchAndCacheIcon(v.key, v.icons.url);
        return { k: v.key, src: remote };
      });
      const results = await Promise.all(tasks);
      const map: Record<string, string | null> = {};
      results.forEach(({ k, src }) => { map[k] = src || null; });
      setIconsMap(prev => ({ ...prev, ...map }));
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const card = (v: VendorMeta, clickableEnabled: boolean) => {
    const iconSrc = iconsMap[v.key] || localIconSrc(v.icons.file);
    const enabled = !!v.enabled;
    const onClick = () => {
      // 只有“已启用”卡片点击可跳转
      if (clickableEnabled && enabled) {
        if (onJumpToConfig) onJumpToConfig(v.key);
        else router.push(`/providers/${v.key}`);
      }
    };
    return (
      <div
        key={v.key}
        onClick={onClick}
        style={{
          height: "100%",
          border: "1px solid rgba(255,255,255,0.14)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: clickableEnabled && enabled ? "pointer" : "default",
          opacity: enabled ? 1 : 0.95,
        }}
      >
        <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {iconSrc ? (
            iconSrc.startsWith("data:") ? (
              // dataURL
              // eslint-disable-next-line @next/next/no-img-element
              <img src={iconSrc} alt={v.name} style={{ width: 30, height: 30, objectFit: "contain" }} />
            ) : (
              <Image src={iconSrc} alt={v.name} width={30} height={30} />
            )
          ) : (
            <span style={{ fontSize: 18 }}>🛠️</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 600 }}>{v.name}</div>
            {enabled ? <Tag color="green" style={{ margin: 0, borderRadius: 999 }}>启用</Tag> : null}
          </div>
          <div style={{ color: "#9ca3af", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {v.desc}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Switch disabled defaultChecked={enabled} />
        </div>
      </div>
    );
  };

  return (
    <Modal
      title="设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      styles={{ content: { borderRadius: 16 } }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 12 }}>
        {/* 左侧导航（含搜索与“全部”按钮、分组列表） */}
        <aside style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <Input
              placeholder="搜索服务商…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
            />
            <Tooltip title="切换查看全部服务商">
              <AntdButton
                onClick={() => setShowAll(s => !s)}
                type={showAll ? "primary" : "default"}
              >
                全部
              </AntdButton>
            </Tooltip>
          </div>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>已启用</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {enabledList.map(v => (
              <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, cursor: "pointer", border: "1px solid rgba(255,255,255,0.12)" }}
                   onClick={() => { if (v.enabled) { if (onJumpToConfig) onJumpToConfig(v.key); else router.push(`/providers/${v.key}`); } }}>
                <span style={{ width: 22, textAlign: "center" }}>•</span>
                <span style={{ fontSize: 14 }}>{v.name}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>未启用</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {disabledList.map(v => (
              <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", opacity: 0.8 }}>
                <span style={{ width: 22, textAlign: "center" }}>○</span>
                <span style={{ fontSize: 14 }}>{v.name}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* 右侧主区：Tabs 按图示展示“已启用/未启用”卡片列表；点击已启用卡片跳配置页 */}
        <main>
          <Tabs
            defaultActiveKey="enabled"
            items={[
              {
                key: "enabled",
                label: <>已启用服务商 <Tag style={{ marginLeft: 6 }}>{enabledList.length}</Tag></>,
                children: (
                  <Row gutter={[12, 12]}>
                    {enabledList.map(v => (
                      <Col key={v.key} xs={24} sm={12} md={12} lg={8}>
                        {card(v, true)}
                      </Col>
                    ))}
                  </Row>
                ),
              },
              {
                key: "disabled",
                label: <>未启用服务商 <Tag style={{ marginLeft: 6 }}>{disabledList.length}</Tag></>,
                children: (
                  <Row gutter={[12, 12]}>
                    {(showAll ? disabledList : disabledList.slice(0, 9)).map(v => (
                      <Col key={v.key} xs={24} sm={12} md={12} lg={8}>
                        {card(v, false)}
                      </Col>
                    ))}
                  </Row>
                ),
              },
            ]}
          />
        </main>
      </div>
    </Modal>
  );
};

export default SettingsModal;