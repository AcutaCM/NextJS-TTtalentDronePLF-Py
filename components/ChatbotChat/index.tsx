"use client";

import React, { useEffect, useRef, useState, startTransition } from "react";
import { Card, Input, Button, Avatar, Tag, Select, Slider, Switch, Drawer, Form, Divider, Row, Col, Dropdown, Alert, Popover, message, Modal, Tabs } from "antd";
import { SendOutlined, UploadOutlined, ThunderboltOutlined, CodeOutlined, SmileOutlined, GlobalOutlined, SettingOutlined, ShareAltOutlined, LayoutOutlined, RedoOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, RobotOutlined, MessageOutlined, FolderOpenOutlined, SkinOutlined, GithubOutlined, BookOutlined, CompassOutlined, HomeOutlined, TeamOutlined, ApiOutlined, ExperimentOutlined, AppstoreOutlined, UserOutlined, ImportOutlined, HistoryOutlined, QuestionCircleOutlined, BulbOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { SidebarClose, SidebarOpen, Plus as LucidePlus, Share2, LayoutGrid, RotateCcw, Upload as LucideUpload, Zap, Code as LucideCode, Smile as LucideSmile, Globe, Settings as LucideSettings, Send as LucideSend } from "lucide-react";
import styled from "@emotion/styled";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

type Role = "user" | "assistant";

interface Message {
  id:string;
  role: Role;
  content: string;
  typing?: boolean;
  thinking?: string;
}

type Assistant = {
  title: string;
  desc: string;
  emoji: string;
  prompt?: string;
};

// 气泡样式：左右对齐 + 尾巴
const MessageRow = styled.div<{ isUser: boolean }>`
  display: flex;
  justify-content: ${p => (p.isUser ? 'flex-end' : 'flex-start')};
  align-items: ${p => (p.isUser ? 'flex-start' : 'flex-end')};
  padding: 8px 12px;
`;

const RowContent = styled.div<{ isUser?: boolean }>`
  display: flex;
  align-items: ${p => (p.isUser ? 'flex-start' : 'flex-end')};
  gap: 10px;
  max-width: 100%;
`;

const Bubble = styled.div<{ isUser: boolean }>`
  max-width: 72%;
  padding: 12px 14px;
  border-radius: 16px;
  background: ${p => (p.isUser ? 'linear-gradient(180deg,#1677ff,#155bd4)' : 'rgba(255,255,255,0.06)')};
  color: ${p => (p.isUser ? '#fff' : 'rgba(255,255,255,0.95)')};
  border: ${p => (p.isUser ? 'none' : '1px solid rgba(255,255,255,0.16)')};
  box-shadow: ${p => (p.isUser ? '0 6px 18px rgba(22,119,255,0.28)' : '0 4px 14px rgba(0,0,0,0.18)')};
  line-height: 1.6;
  word-break: break-word;
  overflow-wrap: anywhere;
  position: relative;
`;

// 输入区（仿 Lobe UI ChatInputArea）
const InputHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;
const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  margin-bottom: 12px;
`;
const HeaderTitle = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.2;
`;
const TitleMain = styled.div`
  font-weight: 700;
  font-size: 16px;
`;
const TitleDesc = styled.div`
  color: #9ca3af;
  font-size: 12px;
`;

/* 顶部 Page Header（如图2） */
const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px 6px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  margin-bottom: 8px;
`;

const PageHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 800;
  font-size: 20px;
`;

const BadgeLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 12px;
`;

const InputContainer = styled.div`
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  padding: 12px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.06);
`;

const InputFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed rgba(255,255,255,0.14);
  color: #9ca3af;
  font-size: 12px;
`;

const IconGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/* 固定底部输入栏包裹（粘性定位） */
const InputBarWrap = styled.div`
  position: sticky;
  bottom: 0;
  z-index: 10;
  padding-top: 8px;
  background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.35));
  backdrop-filter: blur(6px);
`;

const RecommendWrap = styled.div<{ visible: boolean }>`
  overflow: hidden;
  transition: opacity .2s ease, transform .24s ease, max-height .32s ease, margin-top .24s ease, margin-bottom .24s ease;
  opacity: ${p => (p.visible ? 1 : 0)};
  transform: translateY(${p => (p.visible ? '0' : '-4px')});
  max-height: ${p => (p.visible ? '1000px' : '0')};
  pointer-events: ${p => (p.visible ? 'auto' : 'none')};
`;

/* 一级左侧菜单栏（深色） */
const LeftMenuBar = styled.div`
  width: 56px;
  min-width: 56px;
  max-width: 56px;
  height: 100%;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
  border-right: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const LeftMenuItem = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .2s ease;
  &:hover { background: rgba(255,255,255,0.10); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

/* 市场容器（深色） */
const MarketplaceWrap = styled.div`
  position: relative; /* 作为右侧内联覆盖层的定位容器 */
  flex: 1;
  min-width: 0;
  min-height: 0; /* 允许子元素正确计算高度 */
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto; /* 内容超出时显示滚动条 */
`;

/* 未配置 API 的提示卡片（深色） */
const ApiConfigWrap = styled.div`
  margin: 8px 0 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ApiConfigCard = styled.div`
  border: 1px solid rgba(255,255,255,0.14);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
`;

/* 布局与侧边栏 */
const RootRow = styled.div`
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
`;

const Sidebar = styled.aside<{ collapsed: boolean }>`
  width: ${p => (p.collapsed ? '0px' : '280px')};
  min-width: ${p => (p.collapsed ? '0px' : '280px')};
  max-width: ${p => (p.collapsed ? '0px' : '280px')};
  height: 100%;
  border-right: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04));
  box-shadow: 0 8px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06);
  padding: ${p => (p.collapsed ? '0' : '8px')};
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  transition: width .24s ease, min-width .24s ease, max-width .24s ease, padding .24s ease;
`;

const SidebarContent = styled.div<{ collapsed: boolean }>`
  opacity: ${p => (p.collapsed ? 0 : 1)};
  transform: translateX(${p => (p.collapsed ? '-8px' : '0')});
  transition: opacity .18s ease, transform .24s ease;
  pointer-events: ${p => (p.collapsed ? 'none' : 'auto')};
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SidebarCard = styled.div`
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all .2s ease;
  &:hover { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

/* 精简样式：不再显示“你/助手”标签，依靠左右对齐与头像区分 */

/**
 * 纯聊天界面（气泡样式）：
 * - 仅保留自然语言对话：消息列表 + 输入框 + 发送按钮
 * - 左侧为助手、右侧为用户，带气泡尾巴
 * - 视觉依赖 antd 与 antd-style 的主题
 * 后续可接入 /api/chat-proxy 实现模型可切换与流式响应
 */
const PureChat: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<Record<string, Message[]>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRef = useRef<boolean>(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showGoBottom, setShowGoBottom] = useState(false);

  const nearBottom = (el: HTMLDivElement, threshold = 120) => {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const scrollToBottom = (smooth = true) => {
    const el = messagesRef.current;
    if (!el) return;
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
    if ((el as any).scrollTo) {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } else if (bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  };

  const onScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const near = nearBottom(el);
    setIsNearBottom(near);
    setShowGoBottom(!near);
  };
  
  // 采用 TT-chat 的“底部哨兵可见=吸底”策略（仅挂载一次）
  useEffect(() => {
    const el = messagesRef.current;
    const sentinel = bottomRef.current;
    if (!el || !sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const visible = !!entry?.isIntersecting;
        setIsNearBottom(visible);
        setShowGoBottom(!visible);
      },
      { root: el, threshold: 0.01 }
    );
    io.observe(sentinel);

    const ro = new ResizeObserver(() => {
      if (!el) return;
      // 仅在接近底部时吸底，避免打断用户阅读历史
      if (autoScrollRef.current && nearBottom(el)) {
        requestAnimationFrame(() => scrollToBottom(!streaming));
      }
    });
    ro.observe(el);

    // 初始化一次
    setIsNearBottom(nearBottom(el));
    setShowGoBottom(!nearBottom(el));

    return () => {
      try { io.disconnect(); } catch {}
      try { ro.disconnect(); } catch {}
    };
  }, []);

  // 设置项（右侧抽屉）
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(4000);
  const [outputFormat, setOutputFormat] = useState<string>("text");
  const [streaming, setStreaming] = useState<boolean>(true);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  // 同步 autoScroll 到 ref，避免声明顺序导致的 TS 报错
  useEffect(() => { autoScrollRef.current = autoScroll; }, [autoScroll]);
  const [enterToSend, setEnterToSend] = useState<boolean>(true);
  const [thinkingChain, setThinkingChain] = useState<boolean>(false);
  // 设置模态窗口
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  // AI 服务提供商
  const [aiProvider, setAiProvider] = useState<string>("openai");
  // 当前厂商的模型列表（用于设置抽屉下拉）
  const [availableModels, setAvailableModels] = useState<Array<{ label: string; value: string }>>([]);

  // 助手设置：抽屉与数据（按助手维度保存）
  const [showAssistantSettings, setShowAssistantSettings] = useState<boolean>(false);
  const [assistantSettingsMap, setAssistantSettingsMap] = useState<Record<string, any>>({});
  // 轻量管理员：邮箱白名单
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  // 新增：创建新助手流程状态与上一个助手缓存
  const [creatingAssistant, setCreatingAssistant] = useState<boolean>(false);
  const prevAssistantRef = useRef<Assistant | null>(null);
  // Emoji 选择器：动态列表与搜索
  const [emojiList, setEmojiList] = useState<Array<{ char: string; name?: string; keywords?: string }>>([]);
  const [emojiSearch, setEmojiSearch] = useState<string>("");
  useEffect(() => {
    // 从后端权限系统获取当前用户
    fetch("/api/auth/current")
      .then(r => r.json())
      .then(d => {
        if (d?.email) setCurrentUserEmail(String(d.email));
        if (d?.role) setUserRole(d.role === "admin" ? "admin" : "normal");
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        // 轻量通用 emoji 数据（unicode 字符），渲染由系统字体决定：Windows 显示微软表情
        const res = await fetch("https://unpkg.com/emoji.json@13.1.0/emoji.json").then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (!Array.isArray(res)) return;
        if (!canceled) {
          // 仅保留常用字段，减小内存
          setEmojiList(
            res.map((e: any) => ({ char: e.char, name: e.name, keywords: (e.keywords || []).join(" ") }))
          );
        }
      } catch {}
    })();
    return () => { canceled = true; };
  }, []);

  const currentAssistantKey = () => (currentAssistant?.title || "Just Chat");

  // 从本地读取/写入设置
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("chat.assistant.settings") : null;
      if (raw) setAssistantSettingsMap(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem("chat.assistant.settings", JSON.stringify(assistantSettingsMap));
    } catch {}
  }, [assistantSettingsMap]);

  const getAssistantSettings = (key?: string) => assistantSettingsMap[key || currentAssistantKey()] || {};
  const updateAssistantSettings = (partial: Record<string, any>, key?: string) => {
    const k = key || currentAssistantKey();
    setAssistantSettingsMap((prev: Record<string, any>) => ({ ...prev, [k]: { ...(prev[k] || {}), ...partial } }));
  };

  // 根据厂商动态拉取模型列表并填充“模型”下拉框
  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        const url = `/api/market/models?provider=${encodeURIComponent(aiProvider)}`;
        const res = await fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (!Array.isArray(res)) return;
        const opts = res.map((m: any) => {
          const label = m.name || m.title || m.key || m.id || String(m);
          const value = m.key || m.id || m.model || m.name || m.title || label;
          return { label, value };
        });
        if (!canceled) {
          setAvailableModels(opts);
          // 若当前模型不在列表内，自动选择第一个
          const exists = opts.some(o => o.value === model);
          if (!exists && opts.length) setModel(opts[0].value);
        }
      } catch {}
    })();
    return () => { canceled = true; };
  }, [aiProvider]);
  // 应用市场显示
  const [showMarketplace, setShowMarketplace] = useState<boolean>(false);
  // Tello IP 设置
  const [telloIp, setTelloIp] = useState<string>("");
  const [showTelloIpModal, setShowTelloIpModal] = useState<boolean>(false);
  // 读取本地 Tello IP
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const ip = localStorage.getItem("tello.ip") || "";
        if (ip) setTelloIp(ip);
      }
    } catch {}
  }, []);
  // 知识库管理页面显示
  const [showKBPage, setShowKBPage] = useState<boolean>(false);
  // 应用详情页
  const [showAppDetail, setShowAppDetail] = useState<boolean>(false);
  const [selectedApp, setSelectedApp] = useState<Assistant | null>(null);
  const defaultAssistant: Assistant = { title: "Just Chat", desc: "Default List", emoji: "🦄" };
  const [assistantList, setAssistantList] = useState<Assistant[]>([defaultAssistant]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(defaultAssistant);
  const messages = chatSessions[currentAssistant?.title || ''] || [];

  const updateCurrentMessages = (updater: (prevMessages: Message[]) => Message[]) => {
    if (!currentAssistant) return;
    setChatSessions(prevSessions => {
      const currentMessages = prevSessions[currentAssistant.title] || [];
      return {
        ...prevSessions,
        [currentAssistant.title]: updater(currentMessages),
      };
    });
  };

  // 当某助手会话为空时，插入一条“开场消息”
  const ensureOpeningForAssistant = (title: string) => {
    const customOpening = (assistantSettingsMap?.[title]?.openingMessage || "").trim();
    const openingMap: Record<string, string> = {
      "Tello智能代理": "你好，我是 Tello 智能代理。请用自然语言下达指令，例如：起飞、向前 50 厘米、顺时针旋转 90 度、开始视频。",
      "海龟汤主持人": "欢迎来到海龟汤游戏！我是你的主持人，将引导你通过提问逐步揭示谜题背后的真相。你可以用“是”“否”“无关”来提问，我们开始吧！",
      "Just Chat": "Hi! 我是通用聊天助手，可以帮助你写作、翻译、总结与代码问题。今天想聊点什么？"
    };
    const opening = customOpening || openingMap[title] || "你好，我是你的助手。请告诉我你需要什么帮助！";
    setChatSessions(prev => {
      const existed = prev[title] || [];
      if (Array.isArray(existed) && existed.length > 0) return prev;
      return { ...prev, [title]: [{ id: `${Date.now()}-opening`, role: "assistant", content: opening, typing: false }] };
    });
  };
  const [selectedProvider, setSelectedProvider] = useState<{ key: string; name: string; desc: string; emoji: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ title: string; desc: string; emoji: string } | null>(null);
  const [marketTab, setMarketTab] = useState<"home" | "assistants" | "plugins" | "models" | "providers">("home");
  // 服务商详情顶部标签：概览 / 接入指南 / 相关推荐
  const [providerDetailTab, setProviderDetailTab] = useState<"overview" | "guide" | "related">("overview");
  useEffect(() => { if (selectedProvider) setProviderDetailTab("overview"); }, [selectedProvider]);
  // 模型厂商筛选（Model 页左侧分类）
  const [modelFilterVendor, setModelFilterVendor] = useState<string>("全部");
  // 市场动态数据（占位，后续切换为动态渲染）
  const [providers, setProviders] = useState<Array<{ key: string; name: string; desc: string; emoji: string }>>([]);
  const [modelsList, setModelsList] = useState<Array<{ key: string; name: string; desc: string; emoji: string }>>([]);
  const [plugins, setPlugins] = useState<Array<{ key: string; title: string; desc: string; emoji: string }>>([]);
  // 用户角色（用于插件安装权限）
  const [userRole, setUserRole] = useState<string>("guest");
  // 当前登录用户头像
  const [userAvatar, setUserAvatar] = useState<string>("");

  // 厂商详情：支持模型数据
  const [providerModels, setProviderModels] = useState<Array<{ name: string; key: string; context?: string; output?: string; inPrice?: string; outPrice?: string; caps?: string[] }>>([]);
  const [providerModelsLoading, setProviderModelsLoading] = useState<boolean>(false);

  // 从本机 Ollama 实时获取模型列表
  const fetchOllamaLocalModels = async (): Promise<Array<any> > => {
    try {
      // 读取用户配置的 base（可能是 http://localhost:11434/v1 或代理）
      const rawBase = getStored('ollama', 'apiBase') || 'http://localhost:11434/v1';
      // 去掉尾部的 /v1，转到 REST /api/tags
      const base = rawBase.replace(/\/v1\/?$/i, '');
      const url = `${base}/api/tags`;
      const res = await fetch(url).then(r => r.json()).catch(() => null);
      const models = Array.isArray(res?.models) ? res.models : [];
      // 映射到表格需要的字段
      return models.map((m: any) => ({
        name: m.name || m.model || m.id,
        key: m.name || m.model || m.id,
        context: m?.details?.parameter_size || '-',
        output: m?.details?.quantization_level || '-',
        inPrice: '-',
        outPrice: '-',
        caps: ['text']
      }));
    } catch {
      return [];
    }
  };

  // 推荐映射（可后续替换为后端推荐接口）
  const getRelatedProviders = (providerKey: string) => {
    const map: Record<string, Array<{ key: string; name: string; intro: string; emoji: string }>> = {
      'openai': [
        { key: 'azure-openai', name: 'Azure OpenAI', intro: '企业级合规与私有网络接入。', emoji: '🟦' },
        { key: 'groq', name: 'Groq', intro: '极致推理速度的 OpenAI 兼容服务。', emoji: '⚡' },
        { key: 'openrouter', name: 'OpenRouter', intro: '多模型聚合路由，快速试用多家模型。', emoji: '🛣️' },
      ],
      'ollama': [
        { key: 'ollama-cloud', name: 'Ollama Cloud', intro: '云端部署方案，便捷扩展算力与协作。', emoji: '☁️' },
        { key: 'vllm', name: 'vLLM', intro: '高吞吐推理引擎，支持 OpenAI 兼容接口。', emoji: '🧠' },
        { key: 'xinfer', name: 'Xinference', intro: '本地/分布式推理框架，多模型管理。', emoji: '🧪' },
      ],
      'azure-openai': [
        { key: 'openai', name: 'OpenAI', intro: '最新 GPT-4o/mini 系列，生态完善。', emoji: '🟦' },
        { key: 'azure-ai', name: 'Azure AI', intro: '更丰富的 Azure AI 服务与集成。', emoji: '🟦' },
        { key: 'bedrock', name: 'Bedrock', intro: 'AWS 大模型平台，企业与合规场景。', emoji: '🟤' },
      ],
      'anthropic': [
        { key: 'openai', name: 'OpenAI', intro: '与 Claude 互补的对话与工具调用生态。', emoji: '🟦' },
        { key: 'mistral', name: 'Mistral', intro: '轻量性价比与开源生态。', emoji: '🟩' },
        { key: 'deepseek', name: 'DeepSeek', intro: '推理性价比，适合长时推理。', emoji: '🟪' },
      ],
      'gemini': [
        { key: 'openai', name: 'OpenAI', intro: '更广泛的工具与应用生态。', emoji: '🟦' },
        { key: 'anthropic', name: 'Anthropic', intro: '强推理与对齐安全。', emoji: '🟨' },
        { key: 'qwen', name: 'Qwen', intro: '中文生态与图像/多模态能力。', emoji: '🟥' },
      ],
    };
    // 默认推荐
    const fallback = [
      { key: 'azure-openai', name: 'Azure OpenAI', intro: '企业级合规托管与私网接入。', emoji: '🟦' },
      { key: 'ollama', name: 'Ollama', intro: '本地离线运行，隐私可控。', emoji: '💻' },
      { key: 'openrouter', name: 'OpenRouter', intro: '聚合多模型，快速切换试用。', emoji: '🛣️' },
    ];
    return map[providerKey] || fallback;
  };

  // 接入指南：根据厂商渲染步骤
  const renderProviderGuide = (key: string) => {
    const Box: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 10 };
    const Small = { color: '#9ca3af', fontSize: 12 };
    const K = (k: string) => <code style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 6 }}>{k}</code>;
    const L = (t: string) => <code style={{ background: 'rgba(255,255,255,0.12)', padding: '2px 6px', borderRadius: 6 }}>{t}</code>;
    const Common = (
      <ul style={{ margin: '6px 0 0 18px' }}>
        <li>在右侧“Configure Provider”中保存 {K('API Key')} 与 {K('API Base')}</li>
        <li>点击“连通性检查”快速验证网络与鉴权</li>
        <li>点击“获取模型列表”填充下方表格，然后在“聊天设置”里选择模型</li>
      </ul>
    );

    const Guide = (title: string, steps: React.ReactNode, extra?: React.ReactNode) => (
      <div style={Box}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div>{steps}</div>
        {extra ? <div style={{ marginTop: 8 }}>{extra}</div> : null}
      </div>
    );

    const byKey: Record<string, React.ReactNode> = {
      'openai': Guide('OpenAI 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>到 <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI 控制台</a> 创建 {K('API Key')}</li>
          <li>{K('API Base')}: {L('https://api.openai.com/v1')}</li>
          <li>常用模型：{L('gpt-4o-mini')}, {L('gpt-4o')}, {L('gpt-4.1')}</li>
        </ol>
      ), Common),

      'azure-openai': Guide('Azure OpenAI 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>在 Azure 门户创建资源与部署（Deployment）</li>
          <li>{K('API Base')}: 形如 {L('https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview')}</li>
          <li>{K('API Key')} 为 Azure 提供的密钥；模型名请使用你的 {L('deployment')} 名称</li>
        </ol>
      ), Common),

      'anthropic': Guide('Anthropic (Claude) 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>申请 {K('API Key')}: <a href="https://console.anthropic.com/" target="_blank">console.anthropic.com</a></li>
          <li>{K('API Base')}: {L('https://api.anthropic.com/v1')}</li>
          <li>常用模型：{L('claude-3.5-sonnet')}, {L('claude-3-opus')}, {L('claude-3-haiku')}</li>
        </ol>
      ), Common),

      'gemini': Guide('Google Gemini 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>前往 <a href="https://makersuite.google.com/app/apikey" target="_blank">MakerSuite / Google AI Studio</a> 获取 {K('API Key')}</li>
          <li>{K('API Base')}: {L('https://generativelanguage.googleapis.com/v1beta')}</li>
          <li>常用模型：{L('gemini-1.5-pro')}, {L('gemini-1.5-flash')}</li>
        </ol>
      ), Common),

      'qwen': Guide('阿里云通义千问 (DashScope) 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>登录 <a href="https://dashscope.aliyun.com" target="_blank">DashScope</a> 获取 {K('API Key')}</li>
          <li>{K('API Base')}: {L('https://dashscope.aliyuncs.com/api/v1')}</li>
          <li>常用模型：{L('qwen-plus')}, {L('qwen-max')}</li>
        </ol>
      ), Common),

      'deepseek': Guide('DeepSeek 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>在 <a href="https://platform.deepseek.com" target="_blank">DeepSeek 平台</a> 获取 {K('API Key')}</li>
          <li>{K('API Base')}: {L('https://api.deepseek.com')}</li>
          <li>常用模型：{L('deepseek-chat')}, {L('deepseek-reasoner')}</li>
        </ol>
      ), Common),

      'groq': Guide('Groq 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>申请 {K('API Key')}: <a href="https://console.groq.com/keys" target="_blank">console.groq.com</a></li>
          <li>{K('API Base')}: {L('https://api.groq.com/openai/v1')}</li>
          <li>常用模型：{L('llama3-70b')}, {L('mixtral-8x7b')}</li>
        </ol>
      ), Common),

      'mistral': Guide('Mistral 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>在 <a href="https://console.mistral.ai" target="_blank">Mistral Console</a> 获取 {K('API Key')}</li>
          <li>{K('API Base')}: {L('https://api.mistral.ai/v1')}</li>
          <li>常用模型：{L('mistral-large')}, {L('mixtral-8x7b')}</li>
        </ol>
      ), Common),

      'openrouter': Guide('OpenRouter 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>申请 {K('API Key')}: <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></li>
          <li>{K('API Base')}: {L('https://openrouter.ai/api/v1')}</li>
          <li>可在一处路由多家模型，选择 {K('model')} 即可</li>
        </ol>
      ), Common),

      'dify': Guide('Dify 接入', (
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>准备 Dify 的 {K('API Key')} 与 {K('App ID')}</li>
          <li>在“配置提供商”中填写 {K('API Base')}（如 {L('https://api.dify.ai/v1')}）并在右侧额外输入 {K('App ID')}</li>
          <li>聊天时选择 {K('provider=dify')}，请求将直连你的 Dify 应用/工作流</li>
        </ol>
      ), Common),

      'ollama': (
        <div style={Box}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Ollama 本地接入</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            <li>安装并启动服务：{L('ollama serve')}</li>
            <li>拉取模型：{L('ollama pull llama3:8b')} 或 {L('ollama pull qwen2:7b')}</li>
            <li>在“配置提供商”中将 {K('API Base')} 设为 {L('http://localhost:11434/v1')}</li>
            <li>点击“获取模型列表”，系统将直接从 {L('/api/tags')} 实时读取本地模型</li>
          </ol>
          <div style={{ ...Small, marginTop: 8 }}>若浏览器遇到 CORS 限制，可配置反向代理或让我为你添加 /api/ollama/models 服务器端代理。</div>
          <div style={{ marginTop: 8 }}>{Common}</div>
        </div>
      ),
    };

    return byKey[key] || Guide('通用接入', (
      <div>请在右侧填写 {K('API Key')} 与 {K('API Base')}，然后执行连通性检查并拉取模型列表。</div>
    ), Common);
  };

  // 覆盖层：配置提供商
  const [showProviderConfig, setShowProviderConfig] = useState<boolean>(false);
  const [providerConfigKey, setProviderConfigKey] = useState<string>('openai');

  // 切换配置中的厂商时，自动预填默认 BaseUrl 与已存储的 API Key，减少手动输入
  useEffect(() => {
    const k = getStored(providerConfigKey, 'apiKey');
    const b = getStored(providerConfigKey, 'apiBase');
    setApiKeyInput(k || '');
    setApiBaseInput(b || defaultBaseUrls[providerConfigKey] || '');
    if (providerConfigKey === 'dify') {
      try {
        const appId = typeof window !== "undefined" ? (localStorage.getItem("chat.appId.dify") || "") : "";
        setAppIdInput(appId);
      } catch {}
    } else {
      setAppIdInput("");
    }
  }, [providerConfigKey]);

  // API 配置弹卡
  const [showApiConfig, setShowApiConfig] = useState<boolean>(false);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");
  const [apiBaseInput, setApiBaseInput] = useState<string>("");
  const [appIdInput, setAppIdInput] = useState<string>("");

  // 各厂商默认 Base URL 映射
  const defaultBaseUrls: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    "azure-openai": "https://{your-resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview",
    anthropic: "https://api.anthropic.com/v1",
    gemini: "https://generativelanguage.googleapis.com/v1beta",
    qwen: "https://dashscope.aliyuncs.com/api/v1",
    deepseek: "https://api.deepseek.com",
    ollama: "http://localhost:11434/v1",
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
    mistral: "https://api.mistral.ai/v1",
    dify: "https://api.dify.ai/v1",
  };

  const getStored = (p: string, k: "apiKey" | "apiBase") => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(`chat.${k}.${p}`) || "";
  };
  const setStored = (p: string, k: "apiKey" | "apiBase", v: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`chat.${k}.${p}`, v);
  };
  const hasApiConfig = (p: string) => {
    const key = getStored(p, "apiKey");
    return !!key;
  };
  useEffect(() => {
    // 预载当前 provider 的已存配置到输入框
    const k = getStored(aiProvider, "apiKey");
    const b = getStored(aiProvider, "apiBase");
    if (k) setApiKeyInput(k);
    if (b) setApiBaseInput(b);
  }, [aiProvider]);

  // 首次加载恢复用户上次选择的 provider
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = localStorage.getItem("chat.provider");
    if (p) setAiProvider(p);
  }, []);

  // 持久化当前 provider
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("chat.provider", aiProvider);
  }, [aiProvider]);

  // 启动时加载用户头像
  useEffect(() => {
    const toAbsolute = (url: string) => {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (typeof window !== "undefined") return new URL(url, window.location.origin).toString();
      return url;
    };
    (async () => {
      // 0) 先尝试本地存储的常见键，确保从设置页写入的头像能立刻生效
      try {
        const lsKeys = ["avatarUrl","profile.avatarUrl","user.avatar","settings.avatarUrl","plf.avatar"];
        for (const k of lsKeys) {
          const v = typeof window !== "undefined" ? localStorage.getItem(k) : null;
          if (v) {
            setUserAvatar(toAbsolute(v));
            return;
          }
        }
      } catch {}

      // 1) /api/auth/me
      try {
        const me = await fetch("/api/auth/me").then(r => (r.ok ? r.json() : null)).catch(() => null);
        const a1 = me?.avatarUrl || me?.profile?.avatarUrl;
        if (a1) {
          setUserAvatar(toAbsolute(a1));
          return;
        }
      } catch {}

      // 2) /api/settings/profile
      try {
        const pf = await fetch("/api/settings/profile").then(r => (r.ok ? r.json() : null)).catch(() => null);
        const a2 = pf?.avatarUrl || pf?.avatar;
        if (a2) {
          setUserAvatar(toAbsolute(a2));
          return;
        }
      } catch {}

      // 3) 备用：/api/user/profile
      try {
        const up = await fetch("/api/user/profile").then(r => (r.ok ? r.json() : null)).catch(() => null);
        const a3 = up?.avatarUrl || up?.avatar;
        if (a3) setUserAvatar(toAbsolute(a3));
      } catch {}
    })();
  }, []);
  
  // 监听头像实时更新（跨标签页 storage + 同页自定义事件）
  useEffect(() => {
    const toAbsolute = (url: string) => {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (typeof window !== "undefined") return new URL(url, window.location.origin).toString();
      return url;
    };
    const applyFromLS = () => {
      try {
        const v =
          (typeof window !== "undefined" && (localStorage.getItem("plf.avatar") || localStorage.getItem("avatarUrl"))) ||
          "";
        if (v) setUserAvatar(toAbsolute(v));
      } catch {}
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "plf.avatar" || e.key === "avatarUrl") applyFromLS();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setUserAvatar(toAbsolute(detail));
      else applyFromLS();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("plf-avatar-updated", onCustom as EventListener);
    // 首次尝试一次
    applyFromLS();
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("plf-avatar-updated", onCustom as EventListener);
    };
  }, []);

  // 启动时加载用户与市场数据（失败不影响现有展示）
  useEffect(() => {
    (async () => {
      // 用户角色
      try {
        const me = await fetch("/api/auth/me").then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (me?.role) setUserRole(me.role);
      } catch {}
      // 厂商
      try {
        const res = await fetch("/api/market/providers").then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (Array.isArray(res) && res.length) setProviders(res);
      } catch {}
      // 模型
      try {
        const res = await fetch("/api/market/models").then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (Array.isArray(res) && res.length) setModelsList(res);
      } catch {}
      // 插件
      try {
        const res = await fetch("/api/market/plugins").then(r => (r.ok ? r.json() : null)).catch(() => null);
        if (Array.isArray(res) && res.length) setPlugins(res);
      } catch {}
    })();
  }, []);

  // 选中厂商时拉取“支持模型”表格数据（Ollama 走本地 /api/tags 实时获取）
  useEffect(() => {
    const fetchModels = async () => {
      if (!selectedProvider) return;
      setProviderModelsLoading(true);
      try {
        if (selectedProvider.key === 'ollama') {
          const data = await fetchOllamaLocalModels();
          if (data.length) {
            setProviderModels(data);
          } else {
            setProviderModels([]);
          }
        } else {
          const url = `/api/market/models?provider=${encodeURIComponent(selectedProvider.key)}`;
          const res = await fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null);
          if (Array.isArray(res)) {
            setProviderModels(res);
          } else {
            setProviderModels([]);
          }
        }
      } finally {
        setProviderModelsLoading(false);
      }
    };
    fetchModels();
  }, [selectedProvider]);

  // 侧边栏开关
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const onNewChat = () => {
    updateCurrentMessages(() => []);
    setInput("");
  };
  const onCreateAssistant = () => {
    // 进入新助手创建流程：缓存当前助手，创建草稿并打开设置
    prevAssistantRef.current = currentAssistant;
    setCreatingAssistant(true);
    const base = "New Assistant";
    const exists = (name: string) => assistantList.some(a => a.title === name);
    let title = base; let i = 1;
    while (exists(title)) { title = `${base} ${i++}`; }
    const draft: Assistant = { title, desc: "", emoji: "🤖" };
    setCurrentAssistant(draft);
    // 清空当前草稿会话
    updateCurrentMessages(() => []);
    setShowAssistantSettings(true);
  };

  // 安装插件（权限校验：管理员或维护者）
  const installPlugin = async (pluginKey: string) => {
    if (!["admin", "maintainer"].includes(userRole)) {
      message.warning("需要管理员或维护者权限才能安装插件");
      return;
    }
    try {
      const resp = await fetch("/api/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: pluginKey }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        message.error(`安装失败：${txt || resp.status}`);
        return;
      }
      message.success("插件已安装并启用");
    } catch (e: any) {
      message.error(`安装异常：${e?.message || String(e)}`);
    }
  };

  // 创建并启用助手
  const createAssistant = async (app: Assistant | null) => {
    if (!app) return;
    try {
      const resp = await fetch("/api/assistants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: app.title, description: app.desc, emoji: app.emoji }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        message.error(`创建失败：${txt || resp.status}`);
        return;
      }
      message.success("助手已创建并启用");
      if (!assistantList.some(a => a.title === app.title)) {
        setAssistantList(prev => [...prev, app]);
      }
      setCurrentAssistant(app);
      setShowAppDetail(false);
      setSelectedApp(null);
      setShowMarketplace(false);
      onNewChat();
    } catch (e: any) {
      message.error(`创建异常：${e?.message || String(e)}`);
    }
  };

  // 根据聊天内容生成精炼标题（移动端 ChatHeader 风格）
  const computeTitle = (list: Message[]): string => {
    if (!list.length) return currentAssistant?.title || "新的对话";
    // 以用户最近一次提问为主，其次使用助手最近一次回答
    const lastUser = [...list].reverse().find(m => m.role === "user");
    const src = (lastUser || list[list.length - 1]).content.trim();
    // 去除换行与多余空格，保留中文/英文关键字
    let t = src.replace(/\s+/g, " ").replace(/[，。！？、,.!?:;]+$/, "");
    // 限长处理（中英文混排按字符截断）
    const MAX = 24;
    if (t.length > MAX) t = t.slice(0, MAX) + "…";
    return t || "新的对话";
  };

  const handleSend = async () => {
    const raw = input.trim();
    const sPrep = (assistantSettingsMap?.[currentAssistant?.title || ""]?.preprocessTemplate || "").toString();
    const text = sPrep ? sPrep.replace(/\{input\}/g, raw) : raw;
    if (!text && !assistantSettingsMap.__lastImage__) return;

    // 发送前校验当前 provider 的 API 配置
    if (!hasApiConfig(aiProvider)) {
      // 显示配置卡片，加载占位默认 base
      if (!apiBaseInput) {
        setApiBaseInput(defaultBaseUrls[aiProvider] || "");
      }
      setShowApiConfig(true);
      return;
    }

    setSending(true);

    // 若有待发送图片，将其以 Markdown 形式放在用户消息前，便于在气泡中显示
    const imgForMsg = assistantSettingsMap.__lastImage__ as string | undefined;
    const contentWithImage = (imgForMsg ? `![upload](${imgForMsg})\n\n` : "") + text;

    const userMsg: Message = {
      id: `${Date.now()}-u`,
      role: "user",
      content: contentWithImage,
    };
    setInput("");
    const placeholderId = `${Date.now()}-a`;
    const placeholder: Message = { id: placeholderId, role: "assistant", content: "", typing: true };
    updateCurrentMessages(prev => [...prev, userMsg, placeholder]);

    // 若用户附带了图片，则按“视觉解析→UniPixel-3B分割→合并回复”的顺序串行执行
    const lastImage = assistantSettingsMap.__lastImage__ as string | undefined;
    if (lastImage) {
      try {
        // 1) 视觉模型解析（串行第一步）
        const analyzeResp = await fetch('/api/vision/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: lastImage,
            prompt: text,
            provider: aiProvider,
            model,
          }),
        });
        let vlmText = '';
        if (analyzeResp.ok) {
          const j = await analyzeResp.json().catch(() => null);
          vlmText = (j?.content || j?.warning || '') as string;
        } else {
          const t = await analyzeResp.text().catch(() => '');
          vlmText = `视觉解析失败：${t || analyzeResp.status}`;
        }

        // 2) UniPixel-3B 分割（串行第二步）
        // 根据助手设置决定调用本地或云端端点
        const sLocal = assistantSettingsMap[currentAssistant?.title || ""] || {};
        const endpoint =
          sLocal.unipixelMode === 'local'
            ? (sLocal.unipixelEndpoint || 'http://localhost:8000/infer_unipixel_base64')
            : (sLocal.unipixelEndpoint || 'https://huggingface.co/spaces/PolyU-ChenLab/UniPixel/api/predict/partial');

        const segResp = await fetch('/api/vision/unipixel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: lastImage,
            target: text || 'target',
            endpoint, // 可为空：后端将回退到 UNIPIXEL_ENDPOINT（云端）
          }),
        });

        let segImg = '';
        let uniDesc = '';
        if (segResp.ok) {
          const s = await segResp.json().catch(() => null);
          segImg = (s?.mask || '') as string;
          uniDesc = (s?.description || s?.content || '') as string;
        } else {
          const t = await segResp.text().catch(() => '');
          segImg = '';
          vlmText += `\n\n分割失败：${t || segResp.status}`;
        }

        // 3) 合并回复（附分割图/描述），结束占位消息
        const mdParts: string[] = [];
        if (vlmText) mdParts.push(vlmText);
        if (segImg) {
          const url = segImg.startsWith('data:') ? segImg : `data:image/png;base64,${segImg}`;
          mdParts.push(`分割结果（${text || '目标'}）：\n\n![segmentation](${url})`);
        }
        if (uniDesc) {
          mdParts.push(`UniPixel 描述：\n\n${uniDesc}`);
        }

        updateCurrentMessages(prev =>
          prev.map(m =>
            m.id === placeholderId ? { ...m, typing: false, content: mdParts.join('\\n\\n') } : m,
          ),
        );

        // 清理已用图像
        setAssistantSettingsMap(prev => {
          const { __lastImage__, ...rest } = prev;
          return rest;
        });
      } catch (e:any) {
        updateCurrentMessages(prev =>
          prev.map(m =>
            m.id === placeholderId ? { ...m, typing: false, content: `视觉管线异常：${e?.message || String(e)}` } : m,
          ),
        );
        setAssistantSettingsMap(prev => {
          const { __lastImage__, ...rest } = prev;
          return rest;
        });
      } finally {
        setSending(false);
      }
      return; // 完成图像管线后结束，不再进入后续默认/Tello流程
    }

    // 若为 Tello 智能代理，则将命令发给后端 3004 解析
    if (currentAssistant?.title === 'Tello智能代理') {
      try {
        const ip =
          (typeof window !== "undefined" ? (localStorage.getItem("tello.ip") || "") : "") ||
          "192.168.10.1";
        const wsBase =
          (typeof window !== "undefined" ? (localStorage.getItem("tello.ws") || "") : "") ||
          "ws://127.0.0.1:3004";
        // 可选子协议：localStorage('tello.wsProtocol') 指定
        const wsProtocol = (typeof window !== "undefined" ? localStorage.getItem("tello.wsProtocol") : "") || "";
        const ws = wsProtocol ? new WebSocket(wsBase, wsProtocol) : new WebSocket(wsBase);

        let accContent = "";

        // 仅一次性发送命令，避免桥接导致重复派发
        const telloOnce = { sent: false };

        ws.onopen = () => {
          // 1) 先发送 AI 配置，启用后端所需的模型/密钥/端点
          const aiSettings: any = {
            provider: aiProvider,                         // 'azure' | 'openai' | 'ollama' | 'dify'
            model,                                        // 模型/部署名
            api_key: getStored(aiProvider, "apiKey") || "",     // 前端已保存的密钥
            base_url: getStored(aiProvider, "apiBase") || "",   // 通用端点
            endpoint: getStored(aiProvider, "apiBase") || "",   // 兼容 azure 字段
            deployment: model                              // 兼容 azure 的 deployment
          };
          if (aiProvider === 'dify') {
            try {
              const appId = typeof window !== 'undefined' ? (localStorage.getItem('chat.appId.dify') || '') : '';
              if (appId) aiSettings.app_id = appId;
            } catch {}
          }
          const settingsPayload = { type: "update_ai_settings", data: aiSettings };
          try { ws.send(JSON.stringify(settingsPayload)); } catch {}

          // 2) 略微延迟后再发送自然语言命令
          setTimeout(() => {
            const cmdPayload = { type: "natural_language_command", data: { command: text } };
            try { ws.send(JSON.stringify(cmdPayload)); } catch {}
          }, 80);
        };

        ws.onmessage = (evt) => {
          let chunk = "";
          try {
            const data = typeof evt.data === "string" ? evt.data : "";
            // 一旦收到数据，立即复位发送态，避免 Send 按钮卡住
            try { setSending(false); } catch {}
            // 兼容 JSON 或纯文本
            const obj = (() => { try { return JSON.parse(data); } catch { return null; } })();
            let doneFlag = false;

            // 取消自动重试：收到错误直接提示并关闭 WS，避免重复派发
            const errText = (obj?.error || "") as string;
            const isUnknownType =
              obj && obj.success === false && /未知消息类型|unknown message type/i.test(errText);

            if (isUnknownType) {
              updateCurrentMessages(prev =>
                prev.map(m =>
                  m.id === placeholderId
                    ? { ...m, typing: false, content: `Tello 错误：${errText || "不支持的消息类型"}` }
                    : m,
                ),
              );
              try { ws.close(); } catch {}
              return;
            }

            // 正常处理响应类型（兼容 parse_request_response / parse_response / delta / message）
            if (obj && (obj.type === "parse_request_response" || obj.type === "parse_response" || obj.type === "delta" || obj.type === "message")) {
              // 接收到 *_response 即视为一次响应完成，关闭 WS，结束打字态
              if (typeof obj.type === "string" && obj.type.endsWith("_response")) {
                try { ws.close(); } catch {}
              }
              if (obj.success === false) {
                const msg = obj.error || "Tello 解析失败";
                updateCurrentMessages(prev =>
                  prev.map(m =>
                    m.id === placeholderId ? { ...m, typing: false, content: `Tello 错误：${msg}` } : m,
                  ),
                );
                try { ws.close(); } catch {}
                return;
              }
              // 仅展示描述并做简洁装饰
              const desc =
                (obj?.ai_analysis?.commands && Array.isArray(obj.ai_analysis.commands) && obj.ai_analysis.commands[0]?.description) ||
                (Array.isArray(obj?.execution_results) && obj.execution_results[0]?.message) ||
                (typeof obj?.message === "string" ? obj.message : "");

              chunk = desc
                ? `🛫 Tello\n“${desc}”`
                : "🛫 Tello\n（无可用描述）";

              if (obj.done === true) doneFlag = true;
            } else {
              chunk = obj
                ? (obj?.delta || obj?.message || obj?.content || obj?.result || (obj?.command ? "```json\n" + JSON.stringify(obj.command, null, 2) + "\n```" : JSON.stringify(obj)))
                : data;
            }
          } catch {
            chunk = String(evt.data || "");
          }
          if (!chunk) return;
          accContent += chunk;
          updateCurrentMessages(prev =>
            prev.map(m =>
              m.id === placeholderId ? { ...m, typing: true, content: accContent } : m,
            ),
          );
        };

        ws.onerror = (e: any) => {
          updateCurrentMessages(prev =>
            prev.map(m =>
              m.id === placeholderId ? { ...m, typing: false, content: `Tello WebSocket 错误：${e?.message || "请检查 3004 服务是否运行"}` } : m,
            ),
          );
          setSending(false);
        };

        // 可选心跳：localStorage('tello.wsHeartbeat') === 'true' 时启用
        let heartbeatTimer: any = null;
        if ((typeof window !== "undefined" ? localStorage.getItem("tello.wsHeartbeat") : "") === "true") {
          heartbeatTimer = setInterval(() => {
            try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
          }, 20000);
        }

        ws.onclose = (evt) => {
          if (heartbeatTimer) { try { clearInterval(heartbeatTimer); } catch {} }
          const code = (evt && (evt as any).code) || "";
          const reason = (evt && (evt as any).reason) || "";
          updateCurrentMessages(prev =>
            prev.map(m =>
              m.id === placeholderId
                ? { ...m, typing: false, content: reason ? `连接关闭（${code}）：${reason}` : `连接关闭（${code}）` }
                : m
            ),
          );
          setSending(false);
        };
      } catch (e:any) {
        updateCurrentMessages(prev =>
          prev.map(m =>
            m.id === placeholderId ? { ...m, typing: false, content: `Tello 连接异常：${e?.message || String(e)}` } : m,
          ),
        );
        setSending(false);
      }
      return;
    }

    // 调用后端代理 /api/chat-proxy 接入各家 AI 服务
    try {
      // 依据助手设置组装消息：系统提示 + 裁剪历史/附带条数
      const sCfg = assistantSettingsMap?.[currentAssistant?.title || ""] || {};
      const sysPrompt = (sCfg.systemPrompt || currentAssistant?.prompt || "").toString().trim();
      const histLimit = typeof sCfg.historyLimit === "number" && sCfg.historyLimit > 0 ? sCfg.historyLimit : undefined;
      const attach = typeof sCfg.attachCount === "number" && sCfg.attachCount > 0 ? sCfg.attachCount : undefined;

      const allMsgs = [...messages, userMsg];
      const limited = histLimit ? allMsgs.slice(-histLimit) : allMsgs;
      const attached = attach ? limited.slice(-attach) : limited;

      const reqMessages = [
        ...(sysPrompt ? [{ role: "system", content: sysPrompt }] : []),
        ...attached.map(m => ({ role: m.role, content: m.content })),
      ];
      const resp = await fetch("/api/chat-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model,
          messages: reqMessages,
          temperature,
          maxTokens,
          format: outputFormat,
          stream: streaming,
          // 新增：传递鉴权与端点
          apiKey: getStored(aiProvider, "apiKey"),
          baseUrl: getStored(aiProvider, "apiBase"),
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        updateCurrentMessages(prev =>
          prev.map(m =>
            (m.id === placeholderId ? { ...m, typing: false, content: `服务调用失败（${resp.status}）：${txt || "请检查后端代理与密钥配置。"}` } : m),
          ),
        );
      } else {
        // 优先处理 OpenAI 兼容的 SSE 流（data: {...}\n\n ... [DONE]）
        const isSSE = streaming && resp.headers.get('content-type')?.includes('text/event-stream');
        if (isSSE && resp.body) {
          const reader = resp.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let done = false;

          let accContent = '';
          let accThinking = '';
          let updateScheduled = false;

          while (!done) {
            const { value, done: rd } = await reader.read();
            done = !!rd;
            if (!value) continue;

            const chunk = decoder.decode(value, { stream: true });
            const events = chunk.split(/\r?\n\r?\n/);

            for (const evt of events) {
              const line = evt.trim();
              if (!line) continue;

              const dataLine = line.startsWith('data:') ? line.slice(5).trim() : null;
              if (!dataLine) continue;

              if (dataLine === '[DONE]') {
                updateCurrentMessages(prev =>
                  prev.map(m => (m.id === placeholderId ? { ...m, typing: false } : m)),
                );
                continue;
              }

              let obj: any = null;
              try { obj = JSON.parse(dataLine); } catch { obj = null; }
              if (!obj) continue;

              const delta = obj?.choices?.[0]?.delta || {};
              const c = typeof delta.content === 'string' ? delta.content : '';
              const r = typeof delta.reasoning_content === 'string'
                ? delta.reasoning_content
                : (typeof delta.thinking === 'string' ? delta.thinking : '');

              if (c) accContent += c;
              if (r) accThinking += r;

              if (!updateScheduled) {
                updateScheduled = true;
                requestAnimationFrame(() => {
                  updateScheduled = false;
                  const contentSnapshot = accContent;
                  const thinkingSnapshot = accThinking;
                  startTransition(() => {
                    updateCurrentMessages(prev =>
                      prev.map(m =>
                        m.id === placeholderId
                          ? { ...m, typing: true, content: contentSnapshot, thinking: thinkingSnapshot || m.thinking }
                          : m
                      ),
                    );
                  });
                });
              }
            }
          }

          // 结束兜底关闭 typing
          updateCurrentMessages(prev =>
            prev.map(m => (m.id === placeholderId ? { ...m, typing: false } : m)),
          );
        } else {
          // 非 SSE 或未开启流式：一次性 JSON 兜底
          const data = await resp.json().catch(() => null);
          const content = (data?.content ?? data?.choices?.[0]?.message?.content ?? "").toString();
          const thinking =
            (data?.choices?.[0]?.message?.reasoning_content ??
             data?.reasoning_content ??
             data?.thinking ?? "")?.toString?.() || "";
          const finalText = content || "已接入后端代理，但未返回内容，请检查响应格式。";

          updateCurrentMessages(prev =>
            prev.map(m =>
              m.id === placeholderId
                ? { ...m, typing: false, content: finalText, thinking }
                : m
            ),
          );
        }
      }
    } catch (error: any) {
      updateCurrentMessages(prev =>
        prev.map(m =>
          (m.id === placeholderId ? { ...m, typing: false, content: `请求异常：${error?.message || String(error)}` } : m),
        ),
      );
    } finally {
      setSending(false);
    }
  };
  // 自动滚动到底部（仅在接近底部时，避免打断用户查看历史）
  useEffect(() => {
    if (!autoScroll) return;
    if (isNearBottom) {
      // 使用平滑滚动
      scrollToBottom(!streaming);
    }
  }, [messages, autoScroll, isNearBottom]);

  // 初始化一次状态
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    setIsNearBottom(nearBottom(el));
    setShowGoBottom(!nearBottom(el));
  }, []);

  return (
    <Card
      variant="borderless"
      style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}
      styles={{ body: { padding: 16, display: "flex", flex: 1, flexDirection: "column", gap: 12, minHeight: 0 } }}
    >
      {/* 顶部工具区合并到 PageHeader 右侧（删除独立工具区） */}

      {/* 主布局：左侧 Sidebar + 右侧 Main */}
      <RootRow>
        <LeftMenuBar>
          <Popover
            trigger="click"
            placement="rightTop"
            overlayInnerStyle={{ padding: 0, background: "transparent" }}
            arrow={false}
            content={
              <div style={{ width: 320, borderRadius: 14, overflow: "hidden", background: "#181a1f", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}>
                {/* 顶部头像与版本徽章 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar size={40} style={{ background: "#fff", color: "#111" }}>🧠</Avatar>
                    <div style={{ fontWeight: 700 }}>Profile</div>
                  </div>
                  <Tag style={{ margin: 0, borderRadius: 999, background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "#eaeaf0" }}>
                    Community Edition
                  </Tag>
                </div>
                {/* 三格统计 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#1f232b", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>1</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Assistants</div>
                  </div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#1f232b", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>2</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>Topics</div>
                  </div>
                  <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "#1f232b", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>3</div>
                      <div style={{ color: "#9ca3af", fontSize: 12 }}>Messages</div>
                    </div>
                    <Tag color="green" style={{ borderRadius: 999, margin: 0 }}>+3</Tag>
                  </div>
                </div>
                {/* 功能列表 */}
                <div style={{ display: "flex", flexDirection: "column", padding: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", color: "#eaeaf0" }}>
                    <UserOutlined /> <span>Account</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", color: "#eaeaf0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <SettingOutlined /> <span>Settings</span>
                    </div>
                    <Tag style={{ margin: 0, borderRadius: 8, color: "#9ca3af", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>Ctrl</Tag>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", color: "#eaeaf0" }}>
                    <ImportOutlined /> <span>Import Data</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", background: "#242933", border: "1px solid rgba(255,255,255,0.12)", color: "#eaeaf0" }}>
                    <HistoryOutlined /> <span>Changelog</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderRadius: 10, cursor: "pointer", color: "#eaeaf0" }}>
                    <QuestionCircleOutlined /> <span>Help Center</span>
                  </div>
                </div>
                {/* 底部栏 */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", fontSize: 12 }}>
                  <div>Powered by <span style={{ fontWeight: 700, color: "#eaeaf0" }}>TTHub</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <GlobalOutlined />
                    <BulbOutlined />
                  </div>
                </div>
              </div>
            }
          >
            <Avatar size={32} src={userAvatar || undefined} style={{ background: "#fff", color: "#111", cursor: "pointer" }}>🦄</Avatar>
          </Popover>

          <LeftMenuItem onClick={() => { setShowMarketplace(false); setShowKBPage(false); }}><MessageOutlined /></LeftMenuItem>
          <LeftMenuItem onClick={() => { setShowMarketplace(false); setShowKBPage(true); }}><FolderOpenOutlined /></LeftMenuItem>
          <LeftMenuItem onClick={() => { setShowMarketplace(false); setShowKBPage(false); }}><SkinOutlined /></LeftMenuItem>
          <LeftMenuItem onClick={() => { setShowMarketplace(true); setShowKBPage(false); }}><CompassOutlined /></LeftMenuItem>

          <div style={{ flex: 1 }} />

          <LeftMenuItem><GithubOutlined /></LeftMenuItem>
          <LeftMenuItem><BookOutlined /></LeftMenuItem>
        </LeftMenuBar>

        <Sidebar collapsed={!sidebarOpen} style={{ display: (showMarketplace || showKBPage) ? 'none' : 'block' }}>
          <SidebarContent collapsed={!sidebarOpen}>
            <SidebarHeader>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>TTHub</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* 标号1：收起 */}
                <SidebarClose size={18} onClick={() => setSidebarOpen(false)} style={{ cursor: "pointer" }} />
                {/* 标号2：新建聊天 */}
                <LucidePlus size={18} onClick={onNewChat} style={{ cursor: "pointer", color: "#1677ff" }} />
              </div>
            </SidebarHeader>

            <Input
              placeholder="Search assistants..."
              allowClear
              size="middle"
              style={{ marginTop: 6, marginBottom: 8 }}
            />

            {/* 助手列表 */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 4, marginRight: -4 }}>
              {assistantList.map((assistant) => (
                <SidebarCard
                  key={assistant.title}
                  onClick={() => {
                    setCurrentAssistant(assistant);
                  }}
                  style={{
                    marginBottom: 10,
                    border: currentAssistant?.title === assistant.title ? '1px solid rgba(22,119,255,0.8)' : '1px solid rgba(255,255,255,0.14)',
                    background: currentAssistant?.title === assistant.title ? 'rgba(22,119,255,0.15)' : 'rgba(255,255,255,0.05)',
                  }}
                >
                  {(() => {
                    const s = assistantSettingsMap[assistant.title] || {};
                    const bg = s.avatarBg || "transparent";
                    if (s.avatarUrl) return <Avatar size={28} src={s.avatarUrl} style={{ background: bg }} />;
                    const em = s.avatarEmoji || assistant.emoji;
                    return <Avatar size={28} style={{ background: bg }}>{em}</Avatar>;
                  })()}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assistant.title}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assistant.desc}</div>
                  </div>
                </SidebarCard>
              ))}
            </div>

            {/* 标号3：创建自定义助理 */}
            <SidebarCard onClick={onCreateAssistant} style={{ justifyContent: "center", gap: 8, marginTop: 10, flexShrink: 0 }}>
              <LucidePlus size={16} /> New Assistant
            </SidebarCard>
          </SidebarContent>
          </Sidebar>

        {/* 右侧 Main */}
        <div style={{ display: (showMarketplace || showKBPage) ? "none" : "flex", flexDirection: "column", flex: 1, minWidth: 0, minHeight: 0 }}>
          {/* 图2样式的页面 Header（右侧包含徽章与操作按钮，和 Just Chat 同一行） */}
          <PageHeader>
            <PageHeaderLeft>
              {/* 收起后显示展开按钮；展开后隐藏 */}
              {!sidebarOpen && (
                <SidebarOpen
                  size={18}
                  onClick={() => setSidebarOpen(true)}
                  style={{ cursor: "pointer" }}
                />
              )}
              {(() => {
                const k = currentAssistant?.title || "";
                const s = assistantSettingsMap[k] || {};
                const bg = s.avatarBg || "transparent";
                if (s.avatarUrl) return <Avatar size={30} src={s.avatarUrl} style={{ background: bg }} />;
                const em = s.avatarEmoji || currentAssistant?.emoji || '🦄';
                return <Avatar size={30} style={{ background: bg }}>{em}</Avatar>;
              })()}
              <div>{currentAssistant?.title || 'Just Chat'}</div>
              <Tag style={{ borderRadius: 999, margin: 0, padding: "2px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)" }}>{model}</Tag>
              <Tag style={{ borderRadius: 999, margin: 0, padding: "2px 10px", fontSize: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.14)" }}>20</Tag>
            </PageHeaderLeft>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Button size="middle" type="text" aria-label="share" icon={<Share2 size={18} />} />
              <Button size="middle" type="text" aria-label="layout" icon={<LayoutGrid size={18} />} />
              <Button size="middle" type="text" aria-label="redo" icon={<RotateCcw size={18} />} />
            </div>
          </PageHeader>

      {/* 对话卡片（需要放在 Good Noon 上方） */}
      <ChatHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {(() => {
            const k = currentAssistant?.title || "";
            const s = assistantSettingsMap[k] || {};
            const bg = s.avatarBg || "transparent";
            if (s.avatarUrl) return <Avatar size={28} src={s.avatarUrl} style={{ background: bg }} />;
            const em = s.avatarEmoji || currentAssistant?.emoji || '🤖';
            return <Avatar size={28} style={{ background: bg }}>{em}</Avatar>;
          })()}
          <HeaderTitle>
            <TitleMain>{computeTitle(messages)}</TitleMain>
            <TitleDesc>{currentAssistant?.desc || model}</TitleDesc>
          </HeaderTitle>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Button
            size="small"
            onClick={() => {
              setShowMarketplace(true);
              setMarketTab('providers');
              setShowAppDetail(false);
            }}
          >
            选择厂商
          </Button>
          {currentAssistant?.title === 'Tello智能代理' && (
            <>
              <Button size="small" onClick={() => setShowTelloIpModal(true)}>
                无人机
              </Button>
              <Button
                size="small"
                style={{ marginLeft: 8 }}
                onClick={() => {
                  try {
                    const wsBase =
                      (typeof window !== "undefined" ? (localStorage.getItem("tello.ws") || "") : "") ||
                      "ws://127.0.0.1:3004";
                    const wsProtocol = (typeof window !== "undefined" ? localStorage.getItem("tello.wsProtocol") : "") || "";
                    const ws = wsProtocol ? new WebSocket(wsBase, wsProtocol) : new WebSocket(wsBase);
                    const running = (typeof window !== "undefined" ? localStorage.getItem("tello.videoRunning") : "") === "true";
                    const wantStart = !running;
                    ws.onopen = () => {
                      const payload = { type: wantStart ? "start_video" : "stop_video" };
                      try { ws.send(JSON.stringify(payload)); } catch {}
                    };
                    ws.onmessage = (evt) => {
                      let ok = false;
                      try {
                        const raw = typeof evt.data === "string" ? evt.data : "";
                        const obj = JSON.parse(raw);
                        ok = !!obj?.success;
                      } catch {}
                      if (typeof window !== "undefined") {
                        localStorage.setItem("tello.videoRunning", ok && wantStart ? "true" : "false");
                      }
                      try { ws.close(); } catch {}
                    };
                    ws.onerror = () => { try { ws.close(); } catch {} };
                    ws.onclose = () => {};
                  } catch {}
                }}
              >
                视频
              </Button>
            </>
          )}
          <Button size="small" icon={<LucideSettings size={14} />} onClick={() => setShowAssistantSettings(true)}>
            设置
          </Button>
        </div>
      </ChatHeader>

      {/* Tello IP 设置对话框 */}
      <Modal
        title="Tello 无人机连接"
        open={showTelloIpModal}
        onCancel={() => setShowTelloIpModal(false)}
        onOk={async () => {
          try {
            const ip = (telloIp || "").trim() || "192.168.10.1";
            if (typeof window !== "undefined") {
              localStorage.setItem("tello.ip", ip);
            }
            const resp = await fetch("/api/drone/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ip }),
            });
            if (!resp.ok) {
              const txt = await resp.text().catch(() => "");
              message.error(`连接失败：${txt || resp.status}`);
              return;
            }
            message.success("已连接到 Tello");
            setShowTelloIpModal(false);
          } catch (e:any) {
            message.error(`连接异常：${e?.message || String(e)}`);
          }
        }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ color:'#9ca3af', fontSize:12 }}>请输入 Tello 无人机的 IP 地址（默认 192.168.10.1）</div>
          <Input
            placeholder="192.168.10.1"
            value={telloIp}
            onChange={(e) => setTelloIp(e.target.value)}
          />
        </div>
      </Modal>

      <div
        ref={messagesRef}
        onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, overflow: "auto", paddingBottom: 160, scrollBehavior: streaming ? "auto" : "smooth", overscrollBehavior: "contain" }}
      >
        <RecommendWrap visible={messages.length === 0 && !showApiConfig}>
        {/* 欢迎区 */}
        <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>👋 下午好</div>
          <div style={{ color: "#9ca3af", marginTop: 12, fontSize: 14, lineHeight: 1.6 }}>
            我是您的私人智能助理 TTChat，请问现在能帮您做什么？
            <br />
            如果需要获得更加专业或定制的助手，可以点击 + 创建自定义助手
          </div>
        </div>
  
        {/* 推荐助手卡片（响应式 2/4 列） */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>新增助手推荐</div>
          <RedoOutlined style={{ cursor: 'pointer', color: '#9ca3af' }} />
        </div>
        <Row gutter={[16, 16]}>
          {[
            { title: "海龟汤主持人", desc: "一个海龟汤主持人, 需要自己提供汤面, 汤底与关键点 (猜中的判定条件)。", emoji: "🐢" },
            { title: "美食评论员", desc: "美食评价专家", emoji: "😋" },
            { title: "学术写作助手", desc: "专业的学术研究论文写作和正式文档编写专家", emoji: "📘" },
            { title: "Minecraft资深开发者", desc: "擅长高级 Java 开发及 Minecraft 开发", emoji: "💎" },
          ].map((c, idx) => (
            <Col key={idx} xs={24} sm={12} md={12} lg={12} onClick={() => { setSelectedApp(c); setShowMarketplace(true); setMarketTab('assistants'); setShowAppDetail(true); }} style={{ cursor: 'pointer' }}>
              <div
                style={{
                  height: "100%",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: 16,
                  padding: "16px",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  transition: 'all .2s ease',
                }}
                className="recommend-card-hover"
              >
                <Avatar size={40} style={{ background: "transparent" }}>{c.emoji}</Avatar>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{c.title}</div>
                  <div style={{ color: "#9ca3af", fontSize: 13, lineHeight: 1.4 }}>{c.desc}</div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
        <style>{`
          .recommend-card-hover:hover {
            transform: translateY(-2px);
            background: rgba(255,255,255,0.08);
            border-color: rgba(255,255,255,0.15);
          }
          @keyframes typingBlink {
            0% { opacity: .2; }
            20% { opacity: 1; }
            100% { opacity: .2; }
          }
          .typing span {
            display: inline-block;
            font-weight: 800;
            font-size: 16px;
            line-height: 1;
            margin-right: 2px;
            animation: typingBlink 1.2s infinite;
          }
          .typing span:nth-child(2) { animation-delay: .2s; }
          .typing span:nth-child(3) { animation-delay: .4s; }
        `}</style>
  
        {/* FAQ 快捷问题（Chip 风格） */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, marginBottom: 12, padding: '0 4px' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>大家都在问：</div>
          <ArrowRightOutlined style={{ cursor: 'pointer', color: '#9ca3af' }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10, marginBottom: 10 }}>
          {[
            "是否支持语音合成和语音识别?",
            "LobeChat 如何部署和使用?",
            "是否有自己的市场来获取 GPTs?",
            "是否支持本地语言模型?",
            "我在使用时遇到问题应该怎么办?",
          ].map((q) => (
            <Tag
              key={q}
              style={{
                borderRadius: 999,
                padding: "8px 14px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontSize: 13,
              }}
              onClick={() => setInput(q)}
            >
              {q}
            </Tag>
          ))}
          {/* 未配置 API 的助手消息卡片（深色） */}
          {showApiConfig && (
            <MessageRow isUser={false}>
              <RowContent>
                <Avatar size={32} style={{ backgroundColor: "#6b7280", alignSelf: "flex-end" }}>🤖</Avatar>
                <Bubble isUser={false}>
                  <ApiConfigWrap>
                    <Alert
                      message={`${aiProvider} API Key 未配置或错误，请检查后重试`}
                      type="warning"
                      showIcon
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.95)" }}
                    />
                    <ApiConfigCard>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        {/* 顶部图标 */}
                        <Avatar size={56} style={{ background: "#fff", color: "#111" }}>
                          🌀
                        </Avatar>
  
                        {/* 标题与副标题（居中） */}
                        <div style={{ fontWeight: 800, fontSize: 18, textAlign: "center" }}>
                          Use custom {aiProvider} API Key
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
                          Enter your {aiProvider} API Key to start the session
                        </div>
  
                        {/* 输入框（占满宽度） */}
                        <Input.Password
                          placeholder="***********************"
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)" }}
                        />
                        <Input
                          placeholder="https://api.openai.com/v1"
                          value={apiBaseInput}
                          onChange={(e) => setApiBaseInput(e.target.value)}
                          style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)" }}
                        />
  
                        {/* 底部按钮（块级、上下排列） */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                          <Button
                            type="primary"
                            block
                            onClick={() => {
                              setStored(aiProvider, "apiKey", apiKeyInput.trim());
                              setStored(aiProvider, "apiBase", apiBaseInput.trim());
                              setShowApiConfig(false);
                              handleSend();
                            }}
                          >
                            Confirm and Retry
                          </Button>
                          <Button block onClick={() => setShowApiConfig(false)}>
                            Close message
                          </Button>
                        </div>
                      </div>
                    </ApiConfigCard>
                  </ApiConfigWrap>
                </Bubble>
              </RowContent>
            </MessageRow>
          )}
        </div>
        </RecommendWrap>
        {messages.map((m) => (
          <MessageRow key={m.id} isUser={m.role === "user"}>
            {m.role === "assistant" ? (
              <RowContent>
                {(() => {
                  const k = currentAssistant?.title || "";
                  const s = assistantSettingsMap[k] || {};
                  const bg = s.avatarBg || "#6b7280";
                  if (s.avatarUrl) return <Avatar size={32} src={s.avatarUrl} style={{ backgroundColor: bg }} />;
                  const em = s.avatarEmoji || currentAssistant?.emoji || '🤖';
                  return <Avatar size={32} style={{ backgroundColor: bg }}>{em}</Avatar>;
                })()}
                <Bubble isUser={false}>
                  {thinkingChain && !!m.thinking && (
                    <div
                      style={{
                        marginBottom: 8,
                        padding: '8px 10px',
                        borderRadius: 10,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        color: '#c9ccd3',
                        fontSize: 12,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      <div style={{ opacity: 0.7, marginBottom: 4 }}>思考过程</div>
                      <div>{m.thinking}</div>
                    </div>
                  )}

                  {m.content ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight]}
                      components={{
                        p: ({ node, ...props }) => <p {...props} style={{ marginBottom: '1em', wordBreak: 'break-word' }} />,
                        a: ({ node, ...props }) => <a {...props} style={{ color: '#90caf9', textDecoration: 'underline' }} />,
                        ul: ({ node, ...props }) => <ul {...props} style={{ paddingLeft: '20px', listStyleType: 'disc' }} />,
                        ol: ({ node, ...props }) => <ol {...props} style={{ paddingLeft: '20px' }} />,
                        li: ({ node, ...props }) => <li {...props} style={{ marginBottom: '0.5em' }} />,
                        code(props: any) { const { inline, className, children } = props;
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline ? (
                            <div style={{ position: 'relative', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', margin: '1em 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ color: '#9ca3af', fontSize: '12px' }}>{match ? match[1] : ''}</span>
                                <Button size="small" type="text" style={{ color: '#9ca3af' }} onClick={() => {
                                  navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                  message.success('Copied!');
                                }}>Copy</Button>
                              </div>
                              <pre style={{ margin: 0, padding: '12px', overflowX: 'auto', fontFamily: 'monospace', lineHeight: 1.5 }}>
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              </pre>
                            </div>
                          ) : (
                            <code className={className} {...props} style={{
                              background: 'rgba(255,255,255,0.15)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                            }}>
                              {children}
                            </code>
                          );
                        },
                        table: ({ node, ...props }) => <table {...props} style={{ width: '100%', borderCollapse: 'collapse', margin: '1em 0' }} />,
                        thead: ({ node, ...props }) => <thead {...props} style={{ background: 'rgba(255,255,255,0.1)' }} />,
                        th: ({ node, ...props }) => <th {...props} style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px', textAlign: 'left' }} />,
                        td: ({ node, ...props }) => <td {...props} style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '8px 12px' }} />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : m.typing ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      <span className="typing"><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  ) : null}
                </Bubble>
              </RowContent>
            ) : (
              <RowContent isUser>
                <Bubble isUser>
                  {(() => {
                    const raw = String(m.content || '');
                    // 专门解析 "![upload](...)"，提取第一个 dataURL
                    const match = raw.match(/!\[upload\]\(([^)]+)\)/i);
                    const imgUrl = match?.[1] || '';
                    const rest = match ? raw.replace(match[0], '').trimStart() : raw;
                    return (
                      <>
                        {imgUrl && imgUrl.startsWith('data:') && (
                          <img
                            src={imgUrl}
                            alt="upload"
                            style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', display: 'block', margin: '6px 0 10px' }}
                            onError={() => { /* 降级：若仍失败则不阻塞文本渲染 */ }}
                          />
                        )}
                        {rest && (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              p: ({ node, ...props }) => <p {...props} style={{ marginBottom: '1em', wordBreak: 'break-word' }} />,
                              a: ({ node, ...props }) => <a {...props} style={{ color: '#d1e9ff', textDecoration: 'underline' }} />,
                              code(props: any) {
                                const { inline, className, children } = props;
                                const match2 = /language-(\w+)/.exec(className || '');
                                return !inline ? (
                                  <div style={{ position: 'relative', background: 'rgba(0,0,0,0.25)', borderRadius: 8, margin: '1em 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                      <span style={{ color: '#9ca3af', fontSize: 12 }}>{match2 ? match2[1] : ''}</span>
                                    </div>
                                    <pre style={{ margin: 0, padding: 12, overflowX: 'auto', fontFamily: 'monospace', lineHeight: 1.5 }}>
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  </div>
                                ) : (
                                  <code className={className} {...props} style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                          >
                            {rest}
                          </ReactMarkdown>
                        )}
                        {!rest && !imgUrl && (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{raw}</div>
                        )}
                      </>
                    );
                  })()}
                </Bubble>
                <Avatar size={32} style={{ backgroundColor: "#1677ff" }}>🙂</Avatar>
              </RowContent>
            )}
          </MessageRow>
        ))}
        {/* 未配置 API 的助手消息卡片（深色，像助手回复） */}
        {showApiConfig && (
          <MessageRow isUser={false}>
            <RowContent>
              <Avatar size={32} style={{ backgroundColor: "#6b7280" }}>🤖</Avatar>
              <Bubble isUser={false}>
                <ApiConfigWrap>
                  <Alert
                    message={`${aiProvider} API Key 未配置或错误，请检查后重试`}
                    type="warning"
                    showIcon
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.95)" }}
                  />
                  <ApiConfigCard>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar size={40} style={{ background: "#fff", color: "#111" }}>🌀</Avatar>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>使用自定义 {aiProvider} API Key</div>
                      </div>

                      <Input.Password
                        placeholder="请输入 API Key（必填）"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)" }}
                      />
                      <Input
                        placeholder="API Base（可选）"
                        value={apiBaseInput}
                        onChange={(e) => setApiBaseInput(e.target.value)}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)" }}
                      />

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Button
                          type="primary"
                          onClick={() => {
                            setStored(aiProvider, "apiKey", apiKeyInput.trim());
                            setStored(aiProvider, "apiBase", apiBaseInput.trim());
                            setShowApiConfig(false);
                            handleSend();
                          }}
                        >
                          确认并重试
                        </Button>
                        <Button onClick={() => setShowApiConfig(false)}>
                          关闭消息
                        </Button>
                      </div>
                    </div>
                  </ApiConfigCard>
                </ApiConfigWrap>
              </Bubble>
            </RowContent>
          </MessageRow>
        )}
        {/* 回到底部按钮（用户离底部时显示，悬浮在列表底部上方） */}
        {showGoBottom && (
          <div style={{ position: "sticky", bottom: 12, display: "flex", justifyContent: "flex-end", pointerEvents: "none" }}>
            <Button
              size="small"
              shape="round"
              onClick={() => scrollToBottom(true)}
              style={{ pointerEvents: "auto", boxShadow: "0 6px 16px rgba(0,0,0,0.3)" }}
            >
              回到底部
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Lobe 风格输入区：顶部状态 + 输入 + 工具栏 */}
      <InputBarWrap>
        <InputHeader>
          <Globe size={14} />
          <Tag color="green" style={{ borderRadius: 999, padding: "2px 10px" }}>Remained {maxTokens.toLocaleString()}</Tag>
        </InputHeader>



        <InputContainer>
          {/* 待发送图片预览（可移除） */}
          {assistantSettingsMap.__lastImage__ && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <img
                src={assistantSettingsMap.__lastImage__}
                alt="preview"
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ color: '#9ca3af', fontSize: 12 }}>已选择一张图片，发送后将参与视觉解析与分割</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    size="small"
                    onClick={() => {
                      const el = document.getElementById('chat-image-input') as HTMLInputElement | null;
                      el?.click();
                    }}
                  >
                    更换图片
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() => {
                      setAssistantSettingsMap(prev => {
                        const { __lastImage__, ...rest } = prev;
                        return rest;
                      });
                      message.success('已移除待发送图片');
                    }}
                  >
                    移除
                  </Button>
                </div>
              </div>
            </div>
          )}
          <Input.TextArea
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 6 }}
            placeholder="输入消息…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{ color: "rgba(255,255,255,0.95)", background: "transparent", caretColor: "#fff" }}
            onPressEnter={(e) => {
              if (!e.shiftKey && enterToSend) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <InputFooter>
            {/* 左：图标组 + 使用量胶囊（左对齐在一起） */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <IconGroup>
                <Button size="small" shape="circle" type="default" icon={<LucideUpload size={14} />} />
                <Button size="small" shape="circle" type="default" icon={<Zap size={14} />} />
                <Button size="small" shape="circle" type="default" icon={<LucideCode size={14} />} />
                <Button size="small" shape="circle" type="default" icon={<LucideSmile size={14} />} />
              </IconGroup>
              <Tag style={{ borderRadius: 999, padding: "2px 10px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.95)" }}>
                😃 Used 10
              </Tag>
            </div>

            {/* 右：动作区（上传 + 发送下拉按钮） */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* 隐藏的文件输入，点击图标触发选择 */}
              <input
                id="chat-image-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = String(reader.result || '');
                    setAssistantSettingsMap(prev => ({ ...prev, __lastImage__: dataUrl }));
                    message.success('图片已选择，请输入描述后发送');
                  };
                  reader.readAsDataURL(f);
                  // 清空 input 值，便于连续选择相同文件
                  e.currentTarget.value = '';
                }}
              />
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'local-upload', label: '本地上传图片' },
                    { key: 'capture-drone-frame', label: '从无人机取帧' },
                  ],
                  onClick: async ({ key }) => {
                    if (key === 'local-upload') {
                      const el = document.getElementById('chat-image-input') as HTMLInputElement | null;
                      el?.click();
                    } else if (key === 'capture-drone-frame') {
                      const video = document.getElementById('drone-live-video') as HTMLVideoElement | null;
                      if (!video || !video.videoWidth || !video.videoHeight) {
                        message.error('未检测到无人机视频流');
                        return;
                      }
                      const canvas = document.createElement('canvas');
                      canvas.width = video.videoWidth;
                      canvas.height = video.videoHeight;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) {
                        message.error('无法获取画布上下文');
                        return;
                      }
                      try {
                        ctx.drawImage(video, 0, 0);
                        const dataUrl = canvas.toDataURL('image/png');
                        setAssistantSettingsMap(prev => ({ ...prev, __lastImage__: dataUrl }));
                        message.success('已从无人机视频流抓取一帧');
                      } catch (e) {
                        message.error('抓帧失败');
                      }
                    }
                  },
                }}
              >
                <LucideUpload
                  size={18}
                  style={{ cursor: 'pointer' }}
                />
              </Dropdown>
              <Dropdown.Button
                type="primary"
                menu={{
                  items: [
                    { key: "send", label: "Send" },
                    { key: "send-and-new", label: "Send & New Chat" },
                  ],
                  onClick: ({ key }) => {
                    if (key === "send" || key === "send-and-new") handleSend();
                    if (key === "send-and-new") onNewChat();
                  },
                }}
                icon={<LucideSend size={16} />}
                onClick={handleSend}
                loading={sending}
              >
                Send
              </Dropdown.Button>
            </div>
          </InputFooter>
        </InputContainer>
      </InputBarWrap>

        </div>{/* End Main */}

        {showKBPage && (
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '280px 1fr', background: '#0f1115', color: '#eaeaf0' }}>
            <aside style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: '16px 12px' }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Files</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>Manage files and knowledge base</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer' }}>All Files</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Documents</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Images</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Audio</div>
                <div style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }}>Videos</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 4, fontSize: 12, opacity: 0.7 }}>
                  <span>Knowledge Base</span>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.5, paddingLeft: 8 }}>Click + to add a knowledge base</div>
              </div>
            </aside>
            <main style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20 }}>
                <input placeholder="Search Files" style={{ flex: 1, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#eaeaf0', padding: '0 12px', outline: 'none' }} />
                <button style={{ height: 36, borderRadius: 10, padding: '0 12px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', color: '#eaeaf0' }}>Upload</button>
              </div>
              <div style={{ border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 16, padding: 24, textAlign: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))' }}>
                <div style={{ fontWeight: 700, marginBottom: 20 }}>Drag files or folders here</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 720, margin: '0 auto' }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, display: 'grid', gridTemplateColumns: '48px 1fr 36px', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#7a5cff,#b17dff)' }}></div>
                    <div style={{ textAlign: 'left', fontWeight: 600 }}>Create New Knowledge Base</div>
                    <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}>+</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, display: 'grid', gridTemplateColumns: '48px 1fr 36px', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#ff9f43,#ffc05c)' }}></div>
                    <div style={{ textAlign: 'left', fontWeight: 600 }}>Upload File</div>
                    <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}>↑</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, display: 'grid', gridTemplateColumns: '48px 1fr 36px', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#3b82f6,#60a5fa)' }}></div>
                    <div style={{ textAlign: 'left', fontWeight: 600 }}>Upload Folder</div>
                    <div style={{ fontSize: 18, fontWeight: 700, textAlign: 'center' }}>↑</div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}
        {showMarketplace && (
          <MarketplaceWrap>
            <div style={{ display: showAppDetail ? 'none' : 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                {[
                  { key: 'home', icon: <HomeOutlined style={{ opacity: 0.9 }} />, label: 'Home' },
                  { key: 'assistants', icon: <TeamOutlined />, label: 'Assistant' },
                  { key: 'plugins', icon: <ApiOutlined />, label: 'MCP Plugin' },
                  { key: 'models', icon: <ExperimentOutlined />, label: 'Model' },
                  { key: 'providers', icon: <AppstoreOutlined />, label: 'Model Provider' },
                ].map(t => (
                  <div
                    key={t.key}
                    onClick={() => setMarketTab(t.key as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      color: marketTab === t.key ? '#eaeaf0' : '#9ca3af',
                      paddingBottom: 8,
                      borderBottom: marketTab === t.key ? '2px solid #eaeaf0' : '2px solid transparent'
                    }}
                  >
                    {t.icon}
                    <span>{t.label}</span>
                  </div>
                ))}
              </div>
              <Input placeholder="Search Files" allowClear style={{ maxWidth: 320 }} />
            </div>

            {/* 厂商市场：Model Providers */}
            {marketTab === 'providers' && (
            <div style={{ margin: '8px 0 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>Model Providers</div>
              </div>
              <Row gutter={[12,12]}>
                {[
                  { key: "openai", name: "OpenAI", desc: "GPT-4o / o系列", emoji: "🟦" },
                  { key: "azure-openai", name: "Azure OpenAI", desc: "企业级合规托管", emoji: "🟦" },
                  { key: "anthropic", name: "Anthropic", desc: "Claude 3.5 / 3", emoji: "🟨" },
                  { key: "gemini", name: "Google Gemini", desc: "Gemini 1.5 / 1.0", emoji: "🔷" },
                  { key: "qwen", name: "Alibaba Qwen", desc: "通义千问（DashScope）", emoji: "🟥" },
                  { key: "deepseek", name: "DeepSeek", desc: "推理与性价比", emoji: "🟪" },
                  { key: "ollama", name: "Ollama (Local)", desc: "本地模型服务", emoji: "💻" },
                  { key: "openrouter", name: "OpenRouter", desc: "多模型路由", emoji: "🛣️" },
                  { key: "groq", name: "Groq", desc: "极致推理速度", emoji: "⚡" },
                  { key: "mistral", name: "Mistral", desc: "Mistral / Mixtral", emoji: "🟩" },
                  { key: "dify", name: "Dify", desc: "Dify 应用/工作流推理服务", emoji: "🧩" },
                ].map((p) => (
                  <Col key={p.key} xs={24} sm={12} md={12} lg={8} xl={6} onClick={() => { setSelectedProvider(p); setShowAppDetail(true); setMarketTab('providers'); }} style={{ cursor: 'pointer' }}>
                    <div
                      style={{
                        height: "100%",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                        borderRadius: 14,
                        padding: 14,
                        display: "flex",
                        gap: 12,
                        alignItems: "flex-start",
                        justifyContent: "space-between"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                        {/* 顶部：左侧品牌 + 右侧网站/GitHub */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar size={36} style={{ background: "#fff", color: "#111" }}>{p.emoji}</Avatar>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{p.name}</div>
                              <div style={{ color: "#9ca3af", fontSize: 12 }}>@{(p.name || "").split(" ")[0]}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9ca3af" }} onClick={(e) => e.stopPropagation()}>
                            <GlobalOutlined />
                            <GithubOutlined />
                          </div>
                        </div>
                        {/* 简介 */}
                        <div style={{ color: "#c7c9d1", fontSize: 12, lineHeight: 1.6 }}>
                          {p.desc}
                        </div>
                        {/* 分隔线 */}
                        <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "4px 0 2px" }} />
                        {/* 模型标签 */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {(
                            p.key === "openai" ? ["gpt-4o", "gpt-4o-mini", "gpt-4.1"] :
                            p.key === "anthropic" ? ["claude-3.5-sonnet", "claude-3-opus", "claude-3-haiku"] :
                            p.key === "gemini" ? ["gemini-1.5-pro", "gemini-1.5-flash"] :
                            p.key === "qwen" ? ["qwen-plus", "qwen-max"] :
                            p.key === "deepseek" ? ["deepseek-chat", "deepseek-reasoner"] :
                            p.key === "groq" ? ["llama3-70b", "mixtral-8x7b"] :
                            p.key === "mistral" ? ["mistral-large", "mixtral-8x7b"] :
                            p.key === "openrouter" ? ["meta-llama-3.1-70b", "qwen2-72b"] :
                            p.key === "ollama" ? ["llama3", "qwen2", "phi3"] :
                            p.key === "azure-openai" ? ["gpt-4o", "gpt-4o-mini"] :
                            []
                          ).map((m) => (
                            <Tag key={m} style={{ borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
                              {m}
                            </Tag>
                          ))}
                        </div>
                      </div>

                    </div>
                  </Col>
                ))}
              </Row>
            </div>
            )}

            {/* Assistant 列表：仅在 Assistant 标签显示 */}
            {marketTab === 'assistants' && (
              <Row gutter={[12, 12]}>
                {[
                  { title: "Tello智能代理", desc: "基于自然语言的 Tello 无人机智能控制", emoji: "🚁", prompt: "你是 DJI Tello / Tello EDU 智能体助手。用户以自然语言描述意图时，你需将其转译为无人机的原子指令（如：takeoff, land, hover, forward/back/left/right/up/down + 距离(cm), cw/ccw + 角度, flip + 方向, streamon/streamoff 等），并在必要时提醒安全与环境约束。严禁在未确认场景安全前执行危险动作。对不明确的命令先澄清需求，再给出分步行动建议。" },
                  { title: "海龟汤主持人", desc: "一个海龟汤主持人，需要自己提供汤面、汤底与关键点。", emoji: "🐢", prompt: "你是资深海龟汤主持人，负责引导玩家通过提问来推理原故事。严格仅回答“是/否/无关”，必要时给微小提示，但不提前泄露答案。" },
                  { title: "美食评论员", desc: "美食评价专家", emoji: "🍿", prompt: "你是资深美食评论员，请从口味层次、食材搭配、烹饪手法、文化背景与改进建议五方面进行精炼评价，言简意赅可操作。" },
                  { title: "学术写作助手", desc: "专业的学术研究论文写作和正式文档编写专员", emoji: "📘", prompt: "你是学术写作助手，使用正式学术语体，结构化输出：摘要、引言、方法、结果、讨论、参考文献（简要）。避免虚构引用。" },
                  { title: "Minecraft 资深开发者", desc: "擅长高级 Java 开发及 Minecraft 开发", emoji: "🔻", prompt: "你是 Minecraft Mod 开发专家，针对 Forge/Fabric 与 Java 高级特性给出分步指导与示例代码，强调版本兼容与构建流程。" },
                  { title: "开源协议分析师", desc: "擅长开源协议分析与项目匹配", emoji: "📜", prompt: "你是开源协议分析师，比较不同许可证在分发、修改、商业化与衍生作品的约束，给出合规建议与风险提示。" },
                  { title: "Python RV 工具", desc: "Python 与 VS Code 等，提供实用高效支持", emoji: "🐍", prompt: "你是 Python 与 VS Code 效率专家，优先给出可运行的最小示例与调试步骤，强调依赖管理与跨平台兼容。" },
                  { title: "草莓种植专家", desc: "草莓栽培与病虫害防治、品种选择与全年管理专家", emoji: "🍓", prompt: "你是一名资深草莓种植专家。请围绕土壤与基质、品种选择、育苗与定植、肥水管理、花期与授粉、病虫害防治（白粉病、炭疽、螨类等）、温湿度与光照控制、采收与保鲜，给出分季节的可执行方案。回答务必结合中国华北/华东常见气候给出参数范围与预警阈值。遇到不确定的现场情况，先给快速排查清单与观察指标。" },
                ].map((c, idx) => (
                  <Col
                    key={idx}
                    xs={24}
                    sm={12}
                    md={12}
                    lg={8}
                    xl={6}
                    onClick={() => { setSelectedApp(c); setShowAppDetail(true); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      style={{
                        height: "100%",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                        borderRadius: 14,
                        padding: 14,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Avatar size={36} style={{ background: "transparent" }}>{c.emoji}</Avatar>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ color: "#9ca3af", fontSize: 12 }}>{c.desc}</div>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            )}

            {/* MCP Plugin 插件列表：仅在 MCP Plugin 标签显示 */}
            {marketTab === 'plugins' && (
              <Row gutter={[12, 12]}>
                {[
                  { title: "文件检索插件", desc: "在本地知识库中检索文档内容", emoji: "📂" },
                  { title: "图像分析插件", desc: "图像识别与标注能力", emoji: "🖼️" },
                  { title: "Web 抓取插件", desc: "抓取网页并提取可用信息", emoji: "🕸️" },
                  { title: "代码运行插件", desc: "在受控环境内执行安全代码片段", emoji: "⚙️" },
                ].map((p, idx) => (
                  <Col key={idx} xs={24} sm={12} md={12} lg={8} xl={6}>
                    <div
                      style={{
                        height: "100%",
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                        borderRadius: 14,
                        padding: 14,
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", gap: 10 }}>
                        <Avatar size={36} style={{ background: "transparent" }}>{p.emoji}</Avatar>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ fontWeight: 600 }}>{p.title}</div>
                          <div style={{ color: "#9ca3af", fontSize: 12 }}>{p.desc}</div>
                        </div>
                      </div>
                      <Button size="small" onClick={() => installPlugin(String(idx))}>安装</Button>
                    </div>
                  </Col>
                ))}
              </Row>
            )}

            {/* Model 模型市场：仅在 Model 标签显示 */}
            {marketTab === 'models' && (
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, minHeight: 0 }}>
                {/* 左侧：厂商分类（可固定上下滑动） */}
                <aside
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                    borderRadius: 12,
                    padding: 10,
                    position: 'sticky',
                    top: 8,
                    alignSelf: 'start',
                    maxHeight: 'calc(100vh - 140px)',
                    overflowY: 'auto'
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>厂商</div>
                  {(() => {
                    // 基于当前静态模型数据解析厂商名（desc 前缀 “供应商 · …”）
                    const allModels = [
                      { title: "GPT-4o-mini", desc: "OpenAI · 经济高效的多模态模型", emoji: "🟦" },
                      { title: "Claude 3.5 Sonnet", desc: "Anthropic · 强大的文本与推理", emoji: "🟨" },
                      { title: "Gemini 1.5 Pro", desc: "Google · 长上下文多模态", emoji: "🔷" },
                      { title: "Qwen-Plus", desc: "阿里巴巴 · 通义千问系列", emoji: "🟥" },
                      { title: "DeepSeek-R1", desc: "DeepSeek · 推理与性价比", emoji: "🟪" },
                    ];
                    const getVendor = (d: string) => (d.split('·')[0] || '').trim();
                    const vendors = ["全部", ...Array.from(new Set(allModels.map(m => getVendor(m.desc))))];
                    const count = (vendor: string) => vendor === "全部" ? allModels.length : allModels.filter(m => getVendor(m.desc) === vendor).length;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {vendors.map(v => (
                          <div
                            key={v}
                            onClick={() => setModelFilterVendor(v)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 10,
                              cursor: 'pointer',
                              background: modelFilterVendor === v ? 'rgba(255,255,255,0.10)' : 'transparent',
                              border: modelFilterVendor === v ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.10)',
                              color: '#eaeaf0'
                            }}
                          >
                            <span>{v}</span>
                            <Tag style={{ margin: 0, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}>
                              {count(v)}
                            </Tag>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </aside>

                {/* 右侧：模型网格（按厂商筛选） */}
                <div style={{ minWidth: 0 }}>
                  <Row gutter={[12, 12]}>
                    {(() => {
                      const data = [
                        { title: "GPT-4o-mini", desc: "OpenAI · 经济高效的多模态模型", emoji: "🟦" },
                        { title: "Claude 3.5 Sonnet", desc: "Anthropic · 强大的文本与推理", emoji: "🟨" },
                        { title: "Gemini 1.5 Pro", desc: "Google · 长上下文多模态", emoji: "🔷" },
                        { title: "Qwen-Plus", desc: "阿里巴巴 · 通义千问系列", emoji: "🟥" },
                        { title: "DeepSeek-R1", desc: "DeepSeek · 推理与性价比", emoji: "🟪" },
                      ];
                      const getVendor = (d: string) => (d.split('·')[0] || '').trim();
                      const filtered = modelFilterVendor === "全部" ? data : data.filter(m => getVendor(m.desc) === modelFilterVendor);
                      return filtered.map((m: any, idx: number) => (
                        <Col key={idx} xs={24} sm={12} md={12} lg={8} xl={6} onClick={() => { setSelectedModel(m); setShowAppDetail(true); }} style={{ cursor: 'pointer' }}>
                          <div
                            style={{
                              height: "100%",
                              border: "1px solid rgba(255,255,255,0.14)",
                              background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
                              borderRadius: 14,
                              padding: 14,
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", gap: 10 }}>
                              <Avatar size={36} style={{ background: "transparent" }}>{m.emoji}</Avatar>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <div style={{ fontWeight: 600 }}>{m.title}</div>
                                <div style={{ color: "#9ca3af", fontSize: 12 }}>{m.desc}</div>
                              </div>
                            </div>
                          </div>
                        </Col>
                      ));
                    })()}
                  </Row>
                </div>
              </div>
            )}
            </div>
            {showAppDetail && (
              <div style={{ padding: '12px 8px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
                <div>
                  <div style={{ color:'#9ca3af', fontSize:12, marginBottom:8 }}>
                    {selectedProvider ? <>Discover / 模型服务商 / {selectedProvider.key}</> : <>Discover / {selectedApp ? 'Assistant' : selectedModel ? 'Model' : 'Detail'} / {selectedApp?.title || selectedModel?.title || 'Detail'}</>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                    <Avatar size={40} style={{ background:'#fff', color:'#111' }}>{selectedApp?.emoji || selectedProvider?.emoji || selectedModel?.emoji || '💎'}</Avatar>
                    <div style={{ fontWeight:800, fontSize:20 }}>{selectedApp?.title || selectedProvider?.name || selectedModel?.title || 'Detail'}</div>
                    <Tag style={{ borderRadius:999, margin:0, padding:'2px 10px' }}>Programming</Tag>
                    <div style={{ color:'#9ca3af', fontSize:12 }}>448</div>
                  </div>
                  <div style={{ display:'flex', gap:16, borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:12 }}>
                    {(selectedProvider
                      ? [
                          { k: 'overview', t: '概览' },
                          { k: 'guide', t: '接入指南' },
                          { k: 'related', t: '相关推荐' },
                        ]
                      : [
                          { k: 'overview', t: 'Overview' },
                          { k: 'guide', t: 'Assistant Settings' },
                          { k: 'related', t: 'Related Recommendations' },
                        ]
                    ).map(({ k, t }) => {
                      const active = (k as any) === providerDetailTab;
                      return (
                        <div
                          key={k}
                          onClick={() => setProviderDetailTab(k as any)}
                          style={{
                            padding:'8px 0',
                            cursor:'pointer',
                            color: active ? '#eaeaf0' : '#9ca3af',
                            borderBottom: active ? '2px solid #eaeaf0':'2px solid transparent'
                          }}
                        >
                          {t}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:12, marginBottom:12 }}>
                    <div style={{ whiteSpace:'pre-wrap' }}>
                      {selectedApp?.desc || selectedProvider?.desc || selectedModel?.desc || '这是应用的概览描述区域……'}
                    </div>
                  </div>

                  {/* 模型服务商详情：支持模型表格（仅当选择了厂商时显示） */}
                  {selectedProvider && (
                    <div>
                      {providerDetailTab === 'overview' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                            <div style={{ fontWeight: 800 }}>支持模型</div>
                            <Tag style={{ borderRadius: 999, margin: 0 }}>{providerModels.length}</Tag>
                          </div>
                          <div style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                            <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 0.9fr 0.9fr 40px', padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'#9ca3af', fontSize:12 }}>
                              <div>模型名称</div>
                              <div>模型能力</div>
                              <div>最大上下文长度</div>
                              <div>最大输出长度</div>
                              <div>输入价格</div>
                              <div>输出价格</div>
                            </div>
                            {(providerModelsLoading ? Array.from({length:3}).map((_,i)=>(
                              <div key={i} style={{ padding:'12px', borderBottom:'1px solid rgba(255,255,255,0.08)', color:'#9ca3af' }}>加载中…</div>
                            )) : providerModels).map((m:any, idx:number)=>(
                              <div key={m.key || idx} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 0.9fr 0.9fr 40px', padding:'12px', borderBottom: idx === providerModels.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)', alignItems:'center' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                  <Avatar size={28} style={{ background:'#fff', color:'#111' }}>{selectedProvider.emoji}</Avatar>
                                  <div style={{ display:'flex', flexDirection:'column' }}>
                                    <div style={{ fontWeight:600 }}>{m.name || m.title}</div>
                                    <div style={{ fontSize:12, color:'#9ca3af' }}>{m.key || m.id}</div>
                                  </div>
                                </div>
                                <div style={{ display:'flex', gap:8, fontSize:16 }}>
                                  {(m.caps || []).map((c:string)=><span key={c} title={c}>{c==='vision'?'👁️':c==='tool'?'🧩':c==='json'?'🧱':c==='function'?'🧰':'💬'}</span>)}
                                </div>
                                <div>{m.context || m.maxContext || '-'}</div>
                                <div>{m.output || m.maxOutput || '-'}</div>
                                <div>{m.inPrice || m.inputPrice || '-'}</div>
                                <div>{m.outPrice || m.outputPrice || '-'}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {providerDetailTab === 'guide' && (
                        <div style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.04)', borderRadius:12, padding:12, color:'#eaeaf0' }}>
                          {renderProviderGuide(selectedProvider.key)}
                        </div>
                      )}

                      {providerDetailTab === 'related' && (
                        <>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin: '12px 0 8px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ fontWeight: 800 }}>相关推荐</div>
                              <Tag style={{ borderRadius: 999, margin: 0 }}>{getRelatedProviders(selectedProvider.key).length}</Tag>
                            </div>
                          </div>
                          <Row gutter={[12,12]}>
                            {getRelatedProviders(selectedProvider.key).map((r, i) => (
                              <Col key={r.key} xs={24} sm={12} md={12} lg={8}>
                                <div
                                  onClick={() => { setSelectedProvider({ key: r.key, name: r.name, desc: r.intro, emoji: r.emoji }); }}
                                  style={{
                                    height:'100%',
                                    border:'1px solid rgba(255,255,255,0.12)',
                                    background:'rgba(255,255,255,0.06)',
                                    borderRadius:12,
                                    padding:12,
                                    display:'grid',
                                    gridTemplateColumns:'40px 1fr',
                                    gap:10,
                                    cursor:'pointer'
                                  }}
                                >
                                  <Avatar size={32} style={{ background:'#fff', color:'#111' }}>{r.emoji}</Avatar>
                                  <div style={{ display:'flex', flexDirection:'column' }}>
                                    <div style={{ fontWeight:600 }}>{r.name}</div>
                                    <div style={{ color:'#9ca3af', fontSize:12, lineHeight:1.5 }}>{r.intro}</div>
                                  </div>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ fontWeight:700, marginTop:4 }}>Assistant Demo</div>
                  <div style={{ border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:12, marginTop:8 }}>
                    {(() => {
                      // 简单演示映射（避免在 JSX 中写类型/泛型）
                      const demos = {
                        "Tello智能代理": [
                          { role: "assistant", content: "你好，我是 Tello 智能代理。请用自然语言下达指令，例如：起飞、向前 50 厘米、顺时针旋转 90 度、开始视频。", avatar: "🚁" },
                          { role: "user", content: "起飞", avatar: "🙂" },
                          { role: "assistant", content: "🛫 Tello\n“开始无人机起飞”", avatar: "🚁" }
                        ],
                        "海龟汤主持人": [
                          { role: "assistant", content: "欢迎来到海龟汤游戏！我是你的主持人，将引导你通过提问逐步揭示题背后的真相。你可以用“是”、“否”或“无关”来回答，帮助你逐步推理。准备好挑战你的推理能力了吗？让我们开始吧！", avatar: "🐢" },
                          { role: "user", content: "汤面是：我在黑暗中醒来，发现自己被绑在一张椅子上，四周没有出口。", avatar: "🫣" },
                          { role: "assistant", content: "我们来玩海龟汤吧：汤面是：我在黑暗中醒来，发现自己被绑在一张椅子上，四周没有出口。", avatar: "🐢" },
                          { role: "user", content: "我被绑在椅子上与外界有没有联系有关吗？", avatar: "🫣" },
                          { role: "assistant", content: "是", avatar: "🐢" },
                          { role: "assistant", content: "否", avatar: "🐢" }
                        ],
                        "Just Chat": [
                          { role: "assistant", content: "Hi! 我是通用聊天助手，可以帮你写作、翻译、总结与代码问题。", avatar: "🦄" },
                          { role: "user", content: "用一句话解释量子纠缠。", avatar: "🙂" },
                          { role: "assistant", content: "量子纠缠是两个或多个粒子在量子态上彼此关联，以至于无论它们相距多远，一个粒子的测量会即时影响另一个粒子的状态。", avatar: "🦄" }
                        ]
                      };
                      const key = selectedApp?.title || "";
                      const list = (demos as Record<string, any[]>)[key] || [];
                      if (!list.length) {
                        return (
                          <div style={{
                            background: "#1f232b", color: "#9ca3af", border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 12, padding: 12
                          }}>
                            暂无演示内容。
                          </div>
                        );
                      }
                      return (
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                          {list.map((m: any, idx: number) => {
                            const isAssistant = m.role === 'assistant';
                            return (
                              <div key={idx} style={{ display:'flex', alignItems:'flex-start', gap:10, justifyContent: isAssistant ? 'flex-start' : 'flex-end' }}>
                                {isAssistant && (
                                  <div style={{
                                    width: 28, height: 28, borderRadius: 999, background: "#1f232b",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: "1px solid rgba(255,255,255,0.16)", color: "#eaeaf0", fontSize: 14
                                  }}>{m.avatar || "🤖"}</div>
                                )}
                                <div style={{
                                  maxWidth: "64%",
                                  background: isAssistant ? "#1f232b" : "#2563eb",
                                  color: isAssistant ? "#eaeaf0" : "#fff",
                                  borderRadius: isAssistant ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                                  border: isAssistant ? "1px solid rgba(255,255,255,0.16)" : "none",
                                  padding: "10px 12px",
                                  boxShadow: "0 8px 20px rgba(0,0,0,0.28)",
                                  lineHeight: 1.6,
                                  whiteSpace: "pre-wrap"
                                }}>
                                  {m.content}
                                </div>
                                {!isAssistant && (
                                  <div style={{
                                    width: 28, height: 28, borderRadius: 999, background: "#1f232b",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: "1px solid rgba(255,255,255,0.16)", color: "#eaeaf0", fontSize: 14
                                  }}>{m.avatar || "🙂"}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  {selectedApp ? (
                  <>
                    <Button
                      type="primary"
                      block
                      style={{ marginBottom:8 }}
                      onClick={() => {
                        if (selectedApp) {
                          // 将助手添加到侧边栏并切换到该助手
                          if (!assistantList.some(a => a.title === selectedApp.title)) {
                            setAssistantList(prev => [...prev, selectedApp]);
                          }
                          setCurrentAssistant(selectedApp);
                          onNewChat();
                          ensureOpeningForAssistant(selectedApp.title);
                          // 若为“Tello智能代理”，打开 IP 设置对话框
                          if (selectedApp.title === 'Tello智能代理') {
                            setTimeout(() => setShowTelloIpModal(true), 0);
                          }
                        }
                        setShowAppDetail(false);
                        setShowMarketplace(false);
                        message.success(`已启用助手：${selectedApp?.title}`);
                      }}
                    >
                      使用该助手进行聊天
                    </Button>
                    <Button block style={{ marginBottom:8 }} onClick={() => createAssistant(selectedApp)}>
                      Add Assistant and Converse
                    </Button>
                    <Button
                      block
                      style={{ marginBottom:8 }}
                      onClick={() => {
                        if (selectedApp) {
                          // 将当前选中的应用作为编辑对象，打开助手设置抽屉
                          setCurrentAssistant(selectedApp);
                          ensureOpeningForAssistant(selectedApp.title);
                        }
                        setShowAssistantSettings(true);
                      }}
                    >
                      设置该助手
                    </Button>
                    {selectedApp && (userRole === "admin") && (
                      <Button
                        block
                        style={{ marginBottom:8 }}
                        onClick={() => {
                          const k = (selectedApp?.title || "");
                          const s = getAssistantSettings(k);
                          const payload = {
                            assistant: {
                              title: (s?.name || k),
                              desc: (s?.description || selectedApp?.desc || ""),
                              emoji: (s?.avatarEmoji || selectedApp?.emoji || "🤖"),
                              prompt: (s?.systemPrompt || selectedApp?.prompt || "")
                            },
                            settings: s || {}
                          };
                          Modal.confirm({
                            title: "确认永久化保存到市场",
                            content: "保存后将作为市场应用长期展示，普通用户可见且可使用。若同名应用已存在，可能会被覆盖。是否继续？",
                            okText: "确认保存",
                            cancelText: "取消",
                            onOk: async () => {
                              try {
                                const resp = await fetch("/api/market/assistant/save", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(payload)
                                });
                                if (!resp.ok) {
                                  const txt = await resp.text().catch(() => "");
                                  message.error(`保存到市场失败：${txt || resp.status}`);
                                  return;
                                }
                                message.success("已永久保存到市场");
                              } catch (e:any) {
                                message.error(`保存异常：${e?.message || String(e)}`);
                              }
                            }
                          });
                        }}
                      >
                        保存到市场（管理员）
                      </Button>
                    )}
                  </>
                  ) : selectedProvider ? (
                  <Button type="primary" block style={{ marginBottom:8 }} onClick={() => {
                    setAiProvider(selectedProvider.key);
                    setProviderConfigKey(selectedProvider.key);
                    setShowProviderConfig(true);
                  }}>
                    Configure Provider
                  </Button>
                  ) : selectedModel ? (
                  <Button type="primary" block style={{ marginBottom:8 }} onClick={() => { setModel(selectedModel.title); message.success("已选择模型"); }}>
                    Use Model
                  </Button>
                  ) : null}
                  <div style={{ display:'flex', gap:8, marginBottom:12 }}>
                    <Button onClick={() => { setShowAppDetail(false); setSelectedApp(null); }} style={{ flex:1 }}>Back</Button>
                    <Button type="text" icon={<Share2 size={16} />} />
                  </div>
                  <div style={{ fontWeight:700, marginBottom:8 }}>{selectedProvider ? '相关服务商' : selectedApp ? 'Related Assistants' : selectedModel ? 'Related Models' : 'Related'}</div>
                  {selectedProvider ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {[
                        { key: 'azure-openai', name: 'Azure OpenAI', intro: 'Azure 提供多种先进的AI模型，包括GPT-3.5和最新的GPT-4系列，支持多种模型类型和部署方式。', emoji: '🟦' },
                        { key: 'azure-ai', name: 'Azure AI', intro: 'Azure 提供多种先进的AI模型，包含GPT-3.5和最新的GPT-4系列，支持多种模型类型和部署方式。', emoji: '🟦' },
                        { key: 'ollama', name: 'Ollama', intro: 'Ollama 本地模型运行时，适合隐私场景和快速原型。', emoji: '💻' },
                      ].map((r) => (
                        <div
                          key={r.key}
                          onClick={() => { setSelectedProvider({ key: r.key, name: r.name, desc: r.intro, emoji: r.emoji }); }}
                          style={{ display:'grid', gridTemplateColumns:'32px 1fr', alignItems:'center', gap:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:10, marginBottom:8, cursor:'pointer' }}
                        >
                          <Avatar size={28} style={{ background:'#fff', color:'#111' }}>{r.emoji}</Avatar>
                          <div style={{ display:'flex', flexDirection:'column' }}>
                            <div style={{ fontWeight:600 }}>{r.name}</div>
                            <div style={{ color:'#9ca3af', fontSize:12 }}>{r.intro}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    ['开源协议分析师','Mestre Python VSCode','小智IT架构安全运维专家'].map((name, i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, border:'1px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:10, marginBottom:8 }}>
                        <Avatar size={28} style={{ background:'transparent' }}>{i===0?'💡':i===1?'🔧':'🛡️'}</Avatar>
                        <div style={{ display:'flex', flexDirection:'column' }}>
                          <div style={{ fontWeight:600 }}>{name}</div>
                          <div style={{ color:'#9ca3af', fontSize:12 }}>{i===0?'擅长开源协议分析与项目匹配':i===1?'Python 和 VS Code 专家，提供高效支持':'企业系统架构与安全专家'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {/* 右侧内联：配置提供商覆盖层（放在助手组件右侧区域内） */}
            {showProviderConfig && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 50,
                  width: 'min(960px, 78vw)',
                  borderLeft: '1px solid rgba(255,255,255,0.12)',
                  background: 'var(--cfg-bg, #0f1115)',
                  boxShadow: '-28px 0 64px rgba(0,0,0,0.45)',
                  display: 'grid',
                  gridTemplateColumns: '260px 1fr'
                }}
              >
                <style>{`
                  :root {
                    --cfg-bg: #0f1115;
                    --cfg-card: rgba(255,255,255,0.06);
                    --cfg-border: rgba(255,255,255,0.12);
                    --cfg-muted: #9ca3af;
                    --cfg-text: #eaeaf0;
                    --cfg-divider: rgba(255,255,255,0.08);
                    --cfg-input-bg: rgba(255,255,255,0.06);
                    --cfg-input-border: rgba(255,255,255,0.18);
                  }
                  
                  .cfg-card { background: var(--cfg-card); border: 1px solid var(--cfg-border); border-radius: 12px; }
                  .cfg-scroll { overflow: auto; }
                `}</style>

                {/* 左侧：提供商列表 */}
                <aside className="cfg-scroll" style={{ padding: 16, borderRight: '1px solid var(--cfg-divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, color: 'var(--cfg-text)' }}>
                    <div style={{ fontWeight: 800 }}>模型服务商</div>
                    <Button size="small" onClick={() => setShowProviderConfig(false)}>Back</Button>
                  </div>
                  <Input placeholder="搜索服务商..." allowClear style={{ marginBottom: 10, background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([
                      { key: "openai", name: "OpenAI", emoji: "🟦" },
                      { key: "ollama", name: "Ollama", emoji: "💻" },
                      { key: "ollama-cloud", name: "Ollama Cloud", emoji: "☁️" },
                      { key: "fal", name: "Fal", emoji: "🟣" },
                      { key: "azure-openai", name: "Azure OpenAI", emoji: "🟦" },
                      { key: "azure-ai", name: "Azure AI", emoji: "🟦" },
                      { key: "vllm", name: "vLLM", emoji: "🧠" },
                      { key: "xinfer", name: "Xinference", emoji: "🧪" },
                      { key: "anthropic", name: "Anthropic", emoji: "🟨" },
                      { key: "bedrock", name: "Bedrock", emoji: "🟤" },
                      { key: "google", name: "Google", emoji: "🔷" },
                      { key: "vertex", name: "Vertex AI", emoji: "🔷" },
                      { key: "deepseek", name: "DeepSeek", emoji: "🟪" },
                      { key: "moonshot", name: "Moonshot", emoji: "🌙" },
                      { key: "aihubmix", name: "AiHubMix", emoji: "🧩" },
                      { key: "dify", name: "Dify", emoji: "🧩" },
                      { key: "openrouter", name: "OpenRouter", emoji: "🛣️" },
                    ] as Array<{key:string;name:string;emoji:string}>).map((it) => {
                      const active = providerConfigKey === it.key;
                      return (
                        <div
                          key={it.key}
                          onClick={() => { setProviderConfigKey(it.key); setAiProvider(it.key); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                            border: active ? '1px solid var(--cfg-border)' : '1px solid transparent',
                            background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: 'var(--cfg-text)'
                          }}
                        >
                          <Avatar size={28} style={{ background: '#fff', color: '#111' }}>{it.emoji}</Avatar>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontWeight: 600 }}>{it.name}</div>
                            <div style={{ color: 'var(--cfg-muted)', fontSize: 12 }}>{it.key}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* 右侧：配置表单 */}
                <main className="cfg-scroll" style={{ padding: 18, color: 'var(--cfg-text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar size={36} style={{ background: '#fff', color: '#111' }}>
                        {(providerConfigKey==='openai' && '🟦') || (providerConfigKey==='ollama' && '💻') || '💠'}
                      </Avatar>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{providerConfigKey}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Button onClick={() => setShowProviderConfig(false)}>取消</Button>
                      <Button
                        type="primary"
                        onClick={() => {
                          setStored(providerConfigKey, 'apiKey', apiKeyInput.trim());
                          setStored(providerConfigKey, 'apiBase', apiBaseInput.trim());
                          if (providerConfigKey === 'dify') {
                            try {
                              if (typeof window !== "undefined") {
                                localStorage.setItem("chat.appId.dify", appIdInput.trim());
                              }
                            } catch {}
                          }
                          setShowProviderConfig(false);
                          setShowMarketplace(false);
                          setShowAppDetail(false);
                          message.success(`已配置 ${providerConfigKey}`);
                        }}
                      >
                        保存
                      </Button>
                    </div>
                  </div>

                  <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>API Key</div>
                    <Input.Password
                      placeholder="请输入 API Key"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                    />
                  </div>

                  <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>API 代理地址</div>
                    <Input
                      placeholder={defaultBaseUrls[providerConfigKey] || 'https://api.example.com/v1'}
                      value={apiBaseInput}
                      onChange={(e) => setApiBaseInput(e.target.value)}
                      style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                    />
                    <div style={{ color: 'var(--cfg-muted)', fontSize: 12, marginTop: 6 }}>
                      必须包含 http(s)://
                    </div>
                  </div>
                  {providerConfigKey === 'dify' && (
                    <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>Dify App ID</div>
                      <Input
                        placeholder="请输入 Dify 应用或工作流 App ID"
                        value={appIdInput}
                        onChange={(e) => setAppIdInput(e.target.value)}
                        style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                      />
                      <div style={{ color: 'var(--cfg-muted)', fontSize: 12, marginTop: 6 }}>
                        将用于直连 Dify 应用/工作流。可在 Dify 控制台获取。
                      </div>
                    </div>
                  )}

                  <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{ fontWeight: 700 }}>连通性检查</div>
                      <Tag style={{ margin: 0, borderRadius: 999 }}>可选</Tag>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        placeholder="用于测试的模型（例如 gpt-4o-mini）"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                      />
                      <Button
                        onClick={async () => {
                          try {
                            const resp = await fetch('/api/market/test', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                provider: providerConfigKey,
                                apiKey: apiKeyInput.trim(),
                                baseUrl: apiBaseInput.trim(),
                                model
                              })
                            });
                            if (!resp.ok) {
                              const t = await resp.text().catch(() => '');
                              message.error(`检查失败：${t || resp.status}`);
                            } else {
                              message.success('连接正常');
                            }
                          } catch (e:any) {
                            message.error(`检查异常：${e?.message || String(e)}`);
                          }
                        }}
                      >
                        检查
                      </Button>
                    </div>
                  </div>

                  <div className="cfg-card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontWeight: 700 }}>模型列表</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Input placeholder="搜索模型…" allowClear style={{ width: 240, background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }} />
                        <Button
                          onClick={async () => {
                            try {
                              if (providerConfigKey === 'ollama') {
                                const data = await fetchOllamaLocalModels();
                                if (data.length) {
                                  setProviderModels(data);
                                  message.success('已读取本地 Ollama 模型');
                                } else {
                                  message.warning('未检测到本地模型，请先运行 “ollama serve” 并执行 “ollama pull xxx”');
                                }
                              } else {
                                const res = await fetch(`/api/market/models?provider=${encodeURIComponent(providerConfigKey)}`).then(r=>r.json()).catch(()=>[]);
                                if (Array.isArray(res) && res.length) {
                                  setProviderModels(res);
                                  message.success('已获取模型列表');
                                } else {
                                  message.warning('未返回模型列表');
                                }
                              }
                            } catch (e) {
                              message.error('获取模型失败');
                            }
                          }}
                        >
                          获取模型列表
                        </Button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 280 }} className="cfg-scroll">
                      {(providerModels.length ? providerModels : [
                        { name: 'GPT-5', key: 'gpt-5', caps: ['text','tool'], context:'400K', output:'128K', inPrice:'$1.25', outPrice:'$10.00' },
                        { name: 'GPT-5 mini', key: 'gpt-5-mini', caps: ['text'], context:'400K', output:'128K', inPrice:'$0.25', outPrice:'$2.00' },
                      ]).map((m:any, i:number)=>(
                        <div key={m.key || i} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 0.9fr 0.9fr', padding:'10px 12px', borderBottom:'1px solid var(--cfg-divider)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Avatar size={24} style={{ background:'#fff', color:'#111' }}>🧠</Avatar>
                            <div style={{ display:'flex', flexDirection:'column' }}>
                              <div style={{ fontWeight:600 }}>{m.name || m.title}</div>
                              <div style={{ fontSize:12, color:'var(--cfg-muted)' }}>{m.key || m.id}</div>
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:6, fontSize:16 }}>
                            {(m.caps || []).map((c:string)=><span key={c} title={c}>{c==='vision'?'👁️':c==='tool'?'🧩':c==='json'?'🧱':c==='function'?'🧰':'💬'}</span>)}
                          </div>
                          <div>{m.context || m.maxContext || '-'}</div>
                          <div>{m.output || m.maxOutput || '-'}</div>
                          <div>{m.inPrice || m.inputPrice || '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </main>
              </div>
            )}
          </MarketplaceWrap>
        )}

      </RootRow>

      {/* 配置提供商覆盖层（贴近截图布局：左侧列表 + 右侧表单），深浅色主题 */}
      {false && showProviderConfig && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            display: 'flex',
            // 右侧内联覆盖：无全屏遮罩
            pointerEvents: 'none'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(960px, 78vw)',
              height: '100%',
              borderLeft: '1px solid rgba(255,255,255,0.12)',
              background: 'var(--cfg-bg, #0f1115)',
              boxShadow: '-28px 0 64px rgba(0,0,0,0.45)',
              display: 'grid',
              gridTemplateColumns: '260px 1fr',
              pointerEvents: 'auto'
            }}
          >
            <style>{`
              :root {
                --cfg-bg: #0f1115;
                --cfg-card: rgba(255,255,255,0.06);
                --cfg-border: rgba(255,255,255,0.12);
                --cfg-muted: #9ca3af;
                --cfg-text: #eaeaf0;
                --cfg-divider: rgba(255,255,255,0.08);
                --cfg-input-bg: rgba(255,255,255,0.06);
                --cfg-input-border: rgba(255,255,255,0.18);
              }
              
              .cfg-card { background: var(--cfg-card); border: 1px solid var(--cfg-border); border-radius: 12px; }
              .cfg-scroll { overflow: auto; }
            `}</style>

            {/* 左侧：提供商列表 */}
            <aside className="cfg-scroll" style={{ padding: 16, borderRight: '1px solid var(--cfg-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, color: 'var(--cfg-text)' }}>
                <div style={{ fontWeight: 800 }}>模型服务商</div>
                <Button size="small" onClick={() => setShowProviderConfig(false)}>Back</Button>
              </div>
              <Input placeholder="搜索服务商..." allowClear style={{ marginBottom: 10, background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { key: "openai", name: "OpenAI", emoji: "🟦" },
                  { key: "ollama", name: "Ollama", emoji: "💻" },
                  { key: "ollama-cloud", name: "Ollama Cloud", emoji: "☁️" },
                  { key: "fal", name: "Fal", emoji: "🟣" },
                  { key: "azure-openai", name: "Azure OpenAI", emoji: "🟦" },
                  { key: "azure-ai", name: "Azure AI", emoji: "🟦" },
                  { key: "vllm", name: "vLLM", emoji: "🧠" },
                  { key: "xinfer", name: "Xinference", emoji: "🧪" },
                  { key: "anthropic", name: "Anthropic", emoji: "🟨" },
                  { key: "bedrock", name: "Bedrock", emoji: "🟤" },
                  { key: "google", name: "Google", emoji: "🔷" },
                  { key: "vertex", name: "Vertex AI", emoji: "🔷" },
                  { key: "deepseek", name: "DeepSeek", emoji: "🟪" },
                  { key: "moonshot", name: "Moonshot", emoji: "🌙" },
                  { key: "aihubmix", name: "AiHubMix", emoji: "🧩" },
                  { key: "openrouter", name: "OpenRouter", emoji: "🛣️" },
                ] as Array<{key:string;name:string;emoji:string}>).map((it) => {
                  const active = providerConfigKey === it.key;
                  return (
                    <div
                      key={it.key}
                      onClick={() => { setProviderConfigKey(it.key); setAiProvider(it.key); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                        border: active ? '1px solid var(--cfg-border)' : '1px solid transparent',
                        background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: 'var(--cfg-text)'
                      }}
                    >
                      <Avatar size={28} style={{ background: '#fff', color: '#111' }}>{it.emoji}</Avatar>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ color: 'var(--cfg-muted)', fontSize: 12 }}>{it.key}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* 右侧：配置表单 */}
            <main className="cfg-scroll" style={{ padding: 18, color: 'var(--cfg-text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar size={36} style={{ background: '#fff', color: '#111' }}>
                    {(providerConfigKey==='openai' && '🟦') || (providerConfigKey==='ollama' && '💻') || '💠'}
                  </Avatar>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{providerConfigKey}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Button onClick={() => setShowProviderConfig(false)}>取消</Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      setStored(providerConfigKey, 'apiKey', apiKeyInput.trim());
                      setStored(providerConfigKey, 'apiBase', apiBaseInput.trim());
                      setShowProviderConfig(false);
                      message.success('已保存提供商配置');
                    }}
                  >
                    保存
                  </Button>
                </div>
              </div>

              {/* API Key */}
              <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>API Key</div>
                <Input.Password
                  placeholder="请输入 API Key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                />
              </div>

              {/* API Base */}
              <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>API 代理地址</div>
                <Input
                  placeholder={defaultBaseUrls[providerConfigKey] || 'https://api.example.com/v1'}
                  value={apiBaseInput}
                  onChange={(e) => setApiBaseInput(e.target.value)}
                  style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                />
                <div style={{ color: 'var(--cfg-muted)', fontSize: 12, marginTop: 6 }}>
                  必须包含 http(s)://
                </div>
              </div>

              {/* 连通性检查 */}
              <div className="cfg-card" style={{ padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700 }}>连通性检查</div>
                  <Tag style={{ margin: 0, borderRadius: 999 }}>可选</Tag>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    placeholder="用于测试的模型（例如 gpt-4o-mini）"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    style={{ background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }}
                  />
                  <Button
                    onClick={async () => {
                      try {
                        const resp = await fetch('/api/market/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            provider: providerConfigKey,
                            apiKey: apiKeyInput.trim(),
                            baseUrl: apiBaseInput.trim(),
                            model
                          })
                        });
                        if (!resp.ok) {
                          const t = await resp.text().catch(() => '');
                          message.error(`检查失败：${t || resp.status}`);
                        } else {
                          message.success('连接正常');
                        }
                      } catch (e:any) {
                        message.error(`检查异常：${e?.message || String(e)}`);
                      }
                    }}
                  >
                    检查
                  </Button>
                </div>
              </div>

              {/* 模型列表工具条 */}
              <div className="cfg-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700 }}>模型列表</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Input placeholder="搜索模型…" allowClear style={{ width: 240, background: 'var(--cfg-input-bg)', border: '1px solid var(--cfg-input-border)' }} />
                    <Button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/market/models?provider=${encodeURIComponent(providerConfigKey)}`).then(r=>r.json()).catch(()=>[]);
                          if (Array.isArray(res) && res.length) {
                            setProviderModels(res);
                            message.success('已获取模型列表');
                          } else {
                            message.warning('未返回模型列表');
                          }
                        } catch {}
                      }}
                    >
                      获取模型列表
                    </Button>
                  </div>
                </div>
                <div style={{ maxHeight: 280 }} className="cfg-scroll">
                  {(providerModels.length ? providerModels : [
                    { name: 'GPT-5', key: 'gpt-5', caps: ['text','tool'], context:'400K', output:'128K', inPrice:'$1.25', outPrice:'$10.00' },
                    { name: 'GPT-5 mini', key: 'gpt-5-mini', caps: ['text'], context:'400K', output:'128K', inPrice:'$0.25', outPrice:'$2.00' },
                  ]).map((m:any, i:number)=>(
                    <div key={m.key || i} style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 0.9fr 0.9fr', padding:'10px 12px', borderBottom:'1px solid var(--cfg-divider)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Avatar size={24} style={{ background:'#fff', color:'#111' }}>🧠</Avatar>
                        <div style={{ display:'flex', flexDirection:'column' }}>
                          <div style={{ fontWeight:600 }}>{m.name || m.title}</div>
                          <div style={{ fontSize:12, color:'var(--cfg-muted)' }}>{m.key || m.id}</div>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, fontSize:16 }}>
                        {(m.caps || []).map((c:string)=><span key={c} title={c}>{c==='vision'?'👁️':c==='tool'?'🧩':c==='json'?'🧱':c==='function'?'🧰':'💬'}</span>)}
                      </div>
                      <div>{m.context || m.maxContext || '-'}</div>
                      <div>{m.output || m.maxOutput || '-'}</div>
                      <div>{m.inPrice || m.inputPrice || '-'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* 助手设置抽屉（包含：助手信息/角色设定/开场设置/聊天偏好/模型设置） */}
      <Drawer
        title="助手设置"
        placement="right"
        open={showAssistantSettings}
        onClose={() => setShowAssistantSettings(false)}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button
              onClick={() => {
                // 取消：若处于创建流程，恢复到原助手
                if (creatingAssistant && prevAssistantRef.current) {
                  setCurrentAssistant(prevAssistantRef.current);
                }
                setCreatingAssistant(false);
                setShowAssistantSettings(false);
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={() => {
                const k = currentAssistantKey();
                const s = getAssistantSettings(k);
                const name = (s.name || k).trim();
                const desc = (s.description || currentAssistant?.desc || "").toString();
                const emoji = currentAssistant?.emoji || "🤖";
                const prompt = (s.systemPrompt || currentAssistant?.prompt || "").toString();
                const newAssistant: Assistant = { title: name, desc, emoji, prompt };

                // 列表中写入/更新
                setAssistantList((list) => {
                  const exists = list.some(a => a.title === name);
                  if (exists) {
                    return list.map(a => (a.title === k ? newAssistant : a));
                  } else {
                    // 若是新建，将草稿写入为新项
                    // 也尝试更新同名旧键（k）为新名称
                    const replaced = list.map(a => (a.title === k ? newAssistant : a));
                    return replaced.some(a => a.title === name) ? replaced : [...replaced, newAssistant];
                  }
                });

                // 会话键重命名（如果改名）
                if (name !== k) {
                  setChatSessions((prev) => {
                    const msgs = prev[k] || [];
                    const { [k]: _, ...rest } = prev;
                    return { ...rest, [name]: msgs };
                  });
                  // 同步迁移设置键
                  setAssistantSettingsMap((prev) => {
                    const data = prev[k];
                    if (!data) return prev;
                    const { [k]: __, ...rest } = prev;
                    return { ...rest, [name]: data };
                  });
                }

                setCurrentAssistant(newAssistant);
                setCreatingAssistant(false);
                setShowAssistantSettings(false);
                message.success('助手已保存');
              }}
            >
              保存
            </Button>
          </div>
        }
      >
        {(() => {
          const k = currentAssistantKey();
          const s = getAssistantSettings(k);
          const setS = (p: any) => updateAssistantSettings(p, k);
          return (
            <Tabs
              items={[
                {
                  key: 'info',
                  label: '助手信息',
                  children: (
                    <Form layout="vertical">
                      <Form.Item label="头像 URL">
                        <Input placeholder="https://example.com/avatar.png" value={s.avatarUrl} onChange={e => setS({ avatarUrl: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="头像 Emoji">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Avatar size={28} style={{ background: s.avatarBg || 'transparent' }}>{s.avatarEmoji || currentAssistant?.emoji || '🤖'}</Avatar>
                          <Input
                            placeholder="选择或填写一个 Emoji（可留空）"
                            value={s.avatarEmoji || ''}
                            onChange={e => setS({ avatarEmoji: e.target.value })}
                            style={{ flex: 1 }}
                          />
                          <Popover
                            trigger="click"
                            placement="bottom"
                            overlayInnerStyle={{ padding: 8, width: 320 }}
                            content={
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Input
                                  allowClear
                                  placeholder="搜索 Emoji（名称/关键词）"
                                  value={emojiSearch}
                                  onChange={e => setEmojiSearch(e.target.value)}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.18)' }}
                                />
                                <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 8 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 28px)', gap: 6 }}>
                                    {(() => {
                                      const q = (emojiSearch || "").toLowerCase().trim();
                                      const data = q
                                        ? emojiList.filter(e =>
                                            (e.name || "").toLowerCase().includes(q) ||
                                            (e.keywords || "").toLowerCase().includes(q)
                                          )
                                        : emojiList;
                                      const sliced = data.slice(0, 600); // 控制首屏数量，避免过大渲染
                                      return sliced.map((e, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => setS({ avatarEmoji: e.char })}
                                          title={e.name || ""}
                                          style={{
                                            width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)'
                                          }}
                                        >
                                          {e.char}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              </div>
                            }
                          >
                            <Button size="small">选择 Emoji</Button>
                          </Popover>
                        </div>
                      </Form.Item>
                      <Form.Item label="头像背景色">
                        <Input placeholder="#1677ff" value={s.avatarBg} onChange={e => setS({ avatarBg: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="名称">
                        <Input placeholder={k} value={s.name} onChange={e => setS({ name: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="助手描述">
                        <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} value={s.description} onChange={e => setS({ description: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="标签（用逗号分隔）">
                        <Input placeholder="NLP, 多模态" value={s.tags} onChange={e => setS({ tags: e.target.value })} />
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'role',
                  label: '角色设定',
                  children: (
                    <Form layout="vertical">
                      <Form.Item label="自定义 Prompt（System）">
                        <Input.TextArea autoSize={{ minRows: 6, maxRows: 12 }} placeholder="在此编写系统提示词..." value={s.systemPrompt} onChange={e => setS({ systemPrompt: e.target.value })} />
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'opening',
                  label: '开场设置',
                  children: (
                    <Form layout="vertical">
                      <Form.Item label="开场消息（打开会话时的介绍）">
                        <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} value={s.openingMessage} onChange={e => setS({ openingMessage: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="开场问题（每行一个引导问题）">
                        <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} value={s.openingQuestions} onChange={e => setS({ openingQuestions: e.target.value })} />
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'chat',
                  label: '聊天偏好',
                  children: (
                    <Form layout="vertical">
                      <Form.Item label="用户输入预处理（{input} 为占位符）">
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="例如：请用中文回答：{input}" value={s.preprocessTemplate} onChange={e => setS({ preprocessTemplate: e.target.value })} />
                      </Form.Item>
                      <Form.Item label="自动创建话题">
                        <Switch checked={!!s.autoCreateTopic} onChange={v => setS({ autoCreateTopic: v })} />
                      </Form.Item>
                      <Form.Item label="消息阈值（超过后自动创建话题，仅临时话题生效）">
                        <Slider min={1} max={200} value={s.autoCreateTopicThreshold ?? 20} onChange={(v:number) => setS({ autoCreateTopicThreshold: v })} />
                      </Form.Item>
                      <Form.Item label="限制历史消息数">
                        <Slider min={0} max={500} value={s.historyLimit ?? 0} onChange={(v:number) => setS({ historyLimit: v })} />
                      </Form.Item>
                      <Form.Item label="附带消息数（每次请求携带的最近消息数）">
                        <Slider min={1} max={100} value={s.attachCount ?? 20} onChange={(v:number) => setS({ attachCount: v })} />
                      </Form.Item>
                      <Form.Item label="开启历史消息自动总结">
                        <Switch checked={!!s.enableAutoSummary} onChange={v => setS({ enableAutoSummary: v })} />
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: 'model',
                  label: '模型设置',
                  children: (
                    <Form layout="vertical">
                      <Form.Item label="启用流式输出">
                        <Switch checked={!!s.stream} onChange={v => setS({ stream: v })} />
                      </Form.Item>
                      <Form.Item label={`创意活跃度：${(s.creativity ?? 0.7).toFixed(2)}`}>
                        <Slider min={0} max={2} step={0.01} value={s.creativity ?? 0.7} onChange={(v:number)=>setS({ creativity: v })} />
                      </Form.Item>
                      <Form.Item label={`思维开放度：${(s.openness ?? 1.0).toFixed(2)}`}>
                        <Slider min={0} max={2} step={0.01} value={s.openness ?? 1.0} onChange={(v:number)=>setS({ openness: v })} />
                      </Form.Item>
                      <Form.Item label={`表述发散度：${(s.divergence ?? 1.0).toFixed(2)}`}>
                        <Slider min={0} max={2} step={0.01} value={s.divergence ?? 1.0} onChange={(v:number)=>setS({ divergence: v })} />
                      </Form.Item>
                      <Form.Item label={`词汇丰富度：${(s.vocabulary ?? 1.0).toFixed(2)}`}>
                        <Slider min={0} max={2} step={0.01} value={s.vocabulary ?? 1.0} onChange={(v:number)=>setS({ vocabulary: v })} />
                      </Form.Item>
                      <Form.Item label="开启单次回复限制">
                        <Switch checked={!!s.singleReplyLimitEnabled} onChange={v => setS({ singleReplyLimitEnabled: v })} />
                      </Form.Item>
                      <Form.Item label={`单次回复最大 Tokens：${s.singleReplyLimit ?? 2048}`}>
                        <Slider min={128} max={65536} step={128} value={s.singleReplyLimit ?? 2048} onChange={(v:number)=>setS({ singleReplyLimit: v })} />
                      </Form.Item>
                      <Form.Item label="开启推理强度调整">
                        <Switch checked={!!s.reasoningStrengthEnabled} onChange={v => setS({ reasoningStrengthEnabled: v })} />
                      </Form.Item>
                      <Form.Item label={`推理强度：${s.reasoningStrength ?? 1}`}>
                        <Slider min={0} max={2} step={0.01} value={s.reasoningStrength ?? 1} onChange={(v:number)=>setS({ reasoningStrength: v })} />
                      </Form.Item>

                      {/* UniPixel-3B 分割配置：支持本地/云端 */}
                      <Divider />
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>UniPixel-3B 分割配置</div>
                      <Form.Item label="启用 UniPixel-3B 分割">
                        <Switch checked={!!s.unipixelEnabled} onChange={(v)=>setS({ unipixelEnabled: v })} />
                      </Form.Item>
                      <Form.Item label="模式">
                        <Select
                          value={s.unipixelMode || 'cloud'}
                          onChange={(v)=>setS({ unipixelMode: v })}
                          options={[
                            { label: '本地（默认 http://localhost:8000/infer_unipixel_base64）', value: 'local' },
                            { label: '云端（默认 https://huggingface.co/spaces/PolyU-ChenLab/UniPixel/api/predict/partial）', value: 'cloud' },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item label="自定义端点（可选）">
                        <Input
                          placeholder="本地默认：http://localhost:8000/infer_unipixel_base64；云端默认：https://huggingface.co/spaces/PolyU-ChenLab/UniPixel/api/predict/partial"
                          value={s.unipixelEndpoint || ''}
                          onChange={(e)=>setS({ unipixelEndpoint: e.target.value })}
                        />
                        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 6 }}>
                          留空时：本地模式默认 http://localhost:8000/infer_unipixel_base64；云端模式默认 https://huggingface.co/spaces/PolyU-ChenLab/UniPixel/api/predict/partial。
                        </div>
                      </Form.Item>
                    </Form>
                  ),
                },
              ]}
            />
          );
        })()}
      </Drawer>

      {/* 设置抽屉（保留聊天参数，不与服务商模态冲突） */}
      <Drawer
        title="聊天设置"
        placement="right"
        open={showSettings}
        onClose={() => setShowSettings(false)}
        width={360}
      >
        <Form layout="vertical">
          <Form.Item label="服务提供商">
            <Button
              block
              onClick={() => {
                setShowMarketplace(true);
                setMarketTab('providers');
                setShowAppDetail(false);
              }}
            >
              前往市场选择厂商（当前：{aiProvider}）
            </Button>
          </Form.Item>

          <Form.Item label="模型">
            <Select
              value={model}
              onChange={setModel}
              options={
                availableModels.length
                  ? availableModels
                  : [
                      { label: "gpt-4o-mini", value: "gpt-4o-mini" },
                      { label: "gpt-4o", value: "gpt-4o" },
                      { label: "claude-3.5-sonnet", value: "claude-3.5-sonnet" },
                      { label: "qwen-plus", value: "qwen-plus" },
                    ]
              }
            />
          </Form.Item>

          <Form.Item label={`温度: ${temperature.toFixed(2)}`}>
            <Slider min={0} max={1} step={0.01} value={temperature} onChange={setTemperature} />
          </Form.Item>

          <Form.Item label={`最大 Tokens: ${maxTokens}`}>
            <Slider min={512} max={32000} step={128} value={maxTokens} onChange={setMaxTokens} />
          </Form.Item>

          <Form.Item label="输出格式">
            <Select
              value={outputFormat}
              onChange={setOutputFormat}
              options={[
                { label: "text", value: "text" },
                { label: "markdown", value: "markdown" },
                { label: "json", value: "json" },
              ]}
            />
          </Form.Item>

          <Divider />

          <Form.Item label="流式输出">
            <Switch checked={streaming} onChange={setStreaming} />
          </Form.Item>
          <Form.Item label="自动滚动">
            <Switch checked={autoScroll} onChange={setAutoScroll} />
          </Form.Item>
          <Form.Item label="Enter 发送">
            <Switch checked={enterToSend} onChange={setEnterToSend} />
          </Form.Item>
          <Form.Item label="思维链（显示思考过程）">
            <Switch checked={thinkingChain} onChange={setThinkingChain} />
          </Form.Item>
        </Form>

        {/* 仅在“Tello智能代理”时显示的无人机 IP 设置 */}
        {currentAssistant?.title === 'Tello智能代理' && (
          <div style={{ marginTop: 12 }}>
            <Divider />
            <Form layout="vertical">
              <Form.Item label="Tello 无人机 IP">
                <div style={{ display:'flex', gap:8 }}>
                  <Input
                    placeholder="192.168.10.1"
                    value={telloIp}
                    onChange={(e) => setTelloIp(e.target.value)}
                  />
                  <Button
                    onClick={async () => {
                      try {
                        const ip = (telloIp || "").trim() || "192.168.10.1";
                        if (typeof window !== "undefined") {
                          localStorage.setItem("tello.ip", ip);
                        }
                        const resp = await fetch("/api/drone/connect", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ ip }),
                        });
                        if (!resp.ok) {
                          const txt = await resp.text().catch(() => "");
                          message.error(`连接失败：${txt || resp.status}`);
                          return;
                        }
                        message.success("已连接到 Tello");
                      } catch (e:any) {
                        message.error(`连接异常：${e?.message || String(e)}`);
                      }
                    }}
                  >
                    连接
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>
      {/* 设置模态窗口：厂商列表与跳转 */}
      {/* 为避免循环依赖，延迟加载组件 */}
      {showSettingsModal && (() => {
        const SettingsModal = require("../SettingsModal").default;
        return (
          <SettingsModal
            open={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            onJumpToConfig={(vendor: string) => {
              setShowSettingsModal(false);
              // 跳到图3的 API 配置页面
              window.location.href = `/providers/${vendor}`;
            }}
          />
        );
      })()}
    </Card>
  );
};

export default PureChat;