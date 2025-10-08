import React, { useEffect, useMemo, useRef, useState } from 'react';
import MessageMarkdown from './markdown/MessageMarkdown';
import { useDrone } from '../contexts/DroneContext';
import { useTheme } from '../contexts/ThemeContext';
import { systemStatusCollector } from '../lib/systemStatusCollector';
import { aiSuggestionGenerator } from '../lib/aiSuggestionGenerator';
import { aiComponentScheduler } from '../lib/aiComponentScheduler';
import { knowledgeBaseManager } from '../lib/knowledgeBase';
import { knowledgeEnhancedQA, QARequest } from '../lib/knowledgeEnhancedQA';
import KnowledgeSearch from './KnowledgeSearch';
import AIKnowledgePanel from './AIKnowledgePanel';
import { aiKnowledgeGenerator, GeneratedKnowledge } from '../lib/aiKnowledgeGenerator';
import { 
  Bug, 
  Leaf, 
  Cherry, 
  Search, 
  ShieldAlert, 
  Mountain, 
  ChevronDown,
  Bot,
  Plus,
  X,
  Square,
  Send,
  Settings,
  Paperclip,
  Info,
  AlertTriangle,
  Zap,
  BarChart3,
  Plane,
  RotateCcw,
  Cpu,
  CheckCircle,
  RefreshCw,
  Brain
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

interface SelectedFileMeta {
  id: string;
  name: string;
  size: number;
  type?: string;
  url?: string;
}

// 新增：AI 助手 API 配置
interface ChatApiConfig {
  baseUrl: string; // 例如: https://dashscope.aliyuncs.com/compatible-mode/v1 或 http://localhost:8000/v1
  apiKey: string;  // Bearer Key，例如 QWEN_API_KEY 或 OPENAI_API_KEY
  model: string;   // 模型名称
}

// 预设提示词配置
interface PromptTemplate {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  content: string;
  category: string;
  requiresImage?: boolean;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'disease-analysis',
    name: '病害分析',
    icon: Bug,
    description: '专业农作物病害诊断',
    category: 'agriculture',
    requiresImage: true,
    content: `请作为一位资深的农业专家和植物病理学家，对这张农作物图片进行专业分析。

分析要求：
1. 【作物识别】：识别具体的作物类型（如叶菜类的生菜、菠菜，果菜类的番茄、辣椒，根茎类等）
2. 【生长阶段】：判断当前生长阶段（苗期、生长期、成熟期等）
3. 【病害诊断】：识别可能的病害（如叶斑病、炭疽病、根腐病、霜霉病等）
4. 【营养状态】：分析可能的营养缺乏（氮、磷、钾、铁、镁等元素）
5. 【环境评估】：评估光照、湿度、通风等环境条件
6. 【治疗方案】：提供具体的农药使用建议和管理措施`
  },
  {
    id: 'crop-health',
    name: '作物健康',
    icon: Leaf,
    description: '作物生长状态评估',
    category: 'agriculture',
    requiresImage: true,
    content: `请分析这张农作物图片的健康状况，包括：

1. 【整体健康状态】：评估作物的整体生长情况
2. 【叶片状态】：分析叶片颜色、形状、大小是否正常
3. 【茎干状况】：检查茎干是否健壮，有无病变
4. 【根系推测】：基于地上部分推测根系健康状况
5. 【营养状况】：判断是否存在营养过剩或缺乏
6. 【改善建议】：提供具体的改善措施`
  },
  {
    id: 'maturity-assessment',
    name: '成熟度评估',
    icon: Cherry,
    description: '果实成熟度分析',
    category: 'agriculture',
    requiresImage: true,
    content: `请对图片中的果实进行成熟度分析：

1. 【果实识别】：识别果实类型和品种
2. 【成熟度等级】：判断成熟度（未成熟、半成熟、完全成熟、过熟）
3. 【采收建议】：建议最佳采收时机
4. 【品质评估】：预测果实的品质和口感
5. 【储存建议】：提供采收后的储存方案
6. 【产量估算】：如果可能，估算产量情况`
  },
  {
    id: 'general-analysis',
    name: '通用分析',
    icon: Search,
    description: '通用图片分析',
    category: 'general',
    requiresImage: false,
    content: '请详细分析这张图片的内容，包括主要对象、场景、颜色、构图等方面。'
  },
  {
    id: 'pest-identification',
    name: '虫害识别',
    icon: ShieldAlert,
    description: '害虫识别与防治',
    category: 'agriculture',
    requiresImage: true,
    content: `请识别图片中的害虫并提供防治方案：

1. 【害虫识别】：准确识别害虫种类和发育阶段
2. 【危害程度】：评估当前害虫的危害程度
3. 【生活习性】：介绍害虫的生活习性和繁殖特点
4. 【防治方法】：提供生物防治、物理防治、化学防治方案
5. 【预防措施】：建议预防害虫再次发生的措施
6. 【用药建议】：如需用药，提供具体的药剂和使用方法`
  },
  {
    id: 'soil-analysis',
    name: '土壤分析',
    icon: Mountain,
    description: '土壤状态评估',
    category: 'agriculture',
    requiresImage: true,
    content: `请分析图片中的土壤状况：

1. 【土壤类型】：判断土壤的基本类型（沙土、黏土、壤土等）
2. 【物理性状】：评估土壤的结构、紧实度、透气性
3. 【水分状态】：判断土壤的水分含量和排水情况
4. 【有机质】：评估土壤中有机质的含量
5. 【改良建议】：提供土壤改良的具体措施
6. 【适种作物】：推荐适合该土壤条件的作物`
  }
];

const MODEL_OPTIONS = [
  { id: 'local-echo', label: 'Local Echo' },
  { id: 'gpt-4o', label: 'OpenAI gpt-4o' },
  { id: 'gpt-4-vision-preview', label: 'OpenAI gpt-4-vision' }
];

const identityGuard = (text: string) => {
  const q = (text || '').toLowerCase();
  const keywords = ['你是什么模型', 'what model', 'who are you', '是谁', '模型是什么', '是什么模型', '你是谁'];
  if (keywords.some(k => q.includes(k))) {
    return '我是TTAnswer,一个农业智能助手，我能帮你解决农业问题。';
  }
  return null;
};

// 文件转base64函数
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const ChatbotChat: React.FC = () => {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: '你好，我是无人机助手。可以向我咨询任务、视频分析或设备状态。'
  }]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileMeta[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].id);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 新增：配置面板状态
  const [showSettings, setShowSettings] = useState(false);
  const [apiConfig, setApiConfig] = useState<ChatApiConfig>({
    baseUrl: '',
    apiKey: '',
    model: 'Qwen/Qwen2.5-VL-7B-Instruct',
  });

  // 新增：提示词状态
  const [showPrompts, setShowPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // 新增：无人机状态和智能建议
  const { droneState, getStatusText } = useDrone();
  const [currentDetectionType, setCurrentDetectionType] = useState<'strawberry' | 'qr' | 'general'>('strawberry');
  
  // 新增：智能建议状态
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [lastAISuggestionTime, setLastAISuggestionTime] = useState(0);
  
  // 新增：知识库功能状态
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(true);
  const [isKnowledgeBaseInitialized, setIsKnowledgeBaseInitialized] = useState(false);
  const [showKnowledgeSearch, setShowKnowledgeSearch] = useState(false);
  const [showQuickAddKnowledge, setShowQuickAddKnowledge] = useState(false);
  const [showAIKnowledgePanel, setShowAIKnowledgePanel] = useState(false);
  const [quickKnowledgeForm, setQuickKnowledgeForm] = useState({
    title: '',
    content: '',
    category: '通用知识',
    tags: [] as string[]
  });
  
  // 新增：AI自动知识生成状态
  const [aiGeneratedKnowledge, setAiGeneratedKnowledge] = useState<GeneratedKnowledge[]>([]);
  const [showAIKnowledgeModal, setShowAIKnowledgeModal] = useState(false);
  const [pendingKnowledgeForApproval, setPendingKnowledgeForApproval] = useState<GeneratedKnowledge | null>(null);
  
  // 新增：Agent模式状态
  const [isAgentMode, setIsAgentMode] = useState(true);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);
  const selectedModelLabel = useMemo(() => MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || selectedModel, [selectedModel]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // 新增：初始化知识库
  useEffect(() => {
    const initializeKnowledgeBase = async () => {
      try {
        await knowledgeBaseManager.initialize();
        setIsKnowledgeBaseInitialized(true);
        console.log('✅ 知识库初始化成功');
      } catch (error) {
        console.error('❌ 知识库初始化失败:', error);
        setIsKnowledgeBaseInitialized(false);
      }
    };
    
    initializeKnowledgeBase();
  }, []);

  // 新增：监听无人机状态变化，智能生成AI建议
  useEffect(() => {
    const checkAndGenerateAISuggestion = async () => {
      const systemStatus = systemStatusCollector.collectSystemStatus(droneState);
      
      // 检查是否需要主动提供建议
      if (aiSuggestionGenerator.shouldProvideSuggestion(systemStatus)) {
        const now = Date.now();
        // 防止频繁建议，至少60秒间隔
        if (now - lastAISuggestionTime > 60000) {
          await generateAISuggestion(systemStatus);
        }
      }
    };
    
    const timer = setTimeout(checkAndGenerateAISuggestion, 3000); // 状态变化后3秒检查
    return () => clearTimeout(timer);
  }, [droneState.isConnected, droneState.batteryLevel, droneState.missionStatus, droneState.cruiseStatus, lastAISuggestionTime]);

  // 读取本地保存的聊天 API 配置
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('chatApiConfig') : null;
      if (saved) {
        const parsed = JSON.parse(saved) as ChatApiConfig;
        setApiConfig(parsed);
        if (parsed.model && parsed.model !== 'local-echo') {
          setSelectedModel(parsed.model);
        }
      }
    } catch {}
  }, []);

  // 新增：AI驱动的智能建议功能
  const generateAISuggestion = async (systemStatus?: any, context?: string) => {
    if (isGeneratingSuggestion) return;
    
    setIsGeneratingSuggestion(true);
    
    try {
      // 如果没有传入系统状态，则收集当前状态
      const currentSystemStatus = systemStatus || systemStatusCollector.collectSystemStatus(droneState);
      
      // 记录用户活动
      systemStatusCollector.recordUserActivity('请求AI建议');
      
      // 更新系统状态
      systemStatusCollector.updateDetectionStatus({
        currentType: currentDetectionType,
        isActive: droneState.missionStatus === 'executing'
      });
      
      // 生成AI建议
      const suggestionResponse = await aiSuggestionGenerator.generateSuggestion(
        currentSystemStatus,
        context
      );
      
      if (suggestionResponse.success && suggestionResponse.suggestion) {
        // 根据优先级和类别设置样式
        const priorityStyles = {
          low: 'bg-blue-600/20 border-blue-600/40',
          medium: 'bg-yellow-600/20 border-yellow-600/40', 
          high: 'bg-orange-600/20 border-orange-600/40',
          critical: 'bg-red-600/20 border-red-600/40'
        };
        
        const categoryIcons = {
          safety: '🛡️',
          efficiency: '⚡',
          maintenance: '🔧',
          operation: '🎯',
          general: '💬'
        };
        
        const icon = categoryIcons[suggestionResponse.category] || '🤖';
        const priorityText = {
          low: '低优先级',
          medium: '中优先级',
          high: '高优先级',
          critical: '紧急'
        }[suggestionResponse.priority];
        
        const formattedContent = `${icon} **AI智能建议** (${priorityText})\n\n${suggestionResponse.suggestion}`;
        
        setMessages(prev => [...prev, {
          id: `ai-suggestion-${Date.now()}`,
          role: 'assistant',
          content: formattedContent
        }]);
        
        setLastAISuggestionTime(Date.now());
      } else {
        // AI服务不可用，显示错误信息和建议
        console.warn('AI建议生成失败:', suggestionResponse.error);
        const errorMsg = suggestionResponse.error?.includes('AI服务请求失败') 
          ? '💻 AI服务暂时不可用，请检查Ollama服务是否正常运行。\n\n您可以：\n1. 检查 `ollama serve` 是否正在运行\n2. 验证模型 `qwen2.5-vl:7b` 是否已下载\n3. 检查端口 11434 是否可用'
          : `⚠️ ${suggestionResponse.error || 'AI建议服务遇到问题'}`;
          
        setMessages(prev => [...prev, {
          id: `ai-error-${Date.now()}`,
          role: 'assistant',
          content: errorMsg
        }]);
      }
      
    } catch (error: any) {
      console.error('AI建议生成错误:', error);
      setMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        role: 'assistant',
        content: '💬 AI建议服务暂时不可用，请稍后再试。'
      }]);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // 新增：YOLO检测切换功能
  const switchDetectionType = async (keyword: string) => {
    let detectionType: 'strawberry' | 'qr' | 'general' = 'general';
    
    if (keyword.includes('草莓') || keyword.includes('strawberry') || keyword.includes('成熟')) {
      detectionType = 'strawberry';
    } else if (keyword.includes('QR') || keyword.includes('二维码') || keyword.includes('条码')) {
      detectionType = 'qr';
    }
    
    if (detectionType !== currentDetectionType) {
      setCurrentDetectionType(detectionType);
      
      // 更新系统状态收集器
      systemStatusCollector.updateDetectionStatus({
        currentType: detectionType,
        isActive: droneState.missionStatus === 'executing'
      });
      
      // 记录用户活动
      systemStatusCollector.recordUserActivity(`切换检测类型到${detectionType}`);
      
      try {
        // 发送检测类型切换指令到后端
        const response = await fetch('/api/detection/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ detection_type: detectionType })
        });
        
        const result = await response.json();
        
        // 反馈给用户
        const typeNames = {
          'strawberry': '草莓成熟度检测',
          'qr': 'QR码检测',
          'general': '通用检测'
        };
        
        if (result.success) {
          setMessages(prev => [...prev, {
            id: `detection-switch-${Date.now()}`,
            role: 'assistant',
            content: `已切换到 ${typeNames[detectionType]} 模式。`
          }]);
        } else {
          console.error('检测类型切换失败:', result.error);
        }
      } catch (error) {
        console.error('检测类型切换请求失败:', error);
      }
    }
  };

  // 新增：提示词选择函数
  const selectPrompt = (prompt: PromptTemplate) => {
    if (prompt.requiresImage && selectedFiles.filter(f => f.type?.startsWith('image/')).length === 0) {
      setMessages(prev => [...prev, {
        id: `prompt-warning-${Date.now()}`,
        role: 'assistant',
        content: `该提示词需要上传图片才能使用，请先上传相关图片。`
      }]);
      return;
    }
    
    // 记录用户活动
    systemStatusCollector.recordUserActivity(`选择提示词: ${prompt.name}`);
    
    setInput(prompt.content);
    setShowPrompts(false);
  };

  // 相关的计算属性和其他函数保持不变...

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).slice(0, 5).forEach(async (f) => {
      const meta: SelectedFileMeta = {
        id: `${f.name}-${f.size}-${Date.now()}`,
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.type?.startsWith('image/') ? await convertFileToBase64(f) : undefined
      };
      setSelectedFiles((prev) => [...prev, meta].slice(0, 5));
    });
    e.currentTarget.value = '';
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (!f) continue;
        const meta: SelectedFileMeta = {
          id: `${f.name}-${f.size}-${Date.now()}`,
          name: f.name,
          size: f.size,
          type: f.type,
          url: await convertFileToBase64(f)
        };
        setSelectedFiles(prev => [...prev, meta].slice(0, 5));
      }
    }
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).slice(0, 5).forEach(async (f) => {
      const meta: SelectedFileMeta = {
        id: `${f.name}-${f.size}-${Date.now()}`,
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.type?.startsWith('image/') ? await convertFileToBase64(f) : undefined
      };
      setSelectedFiles(prev => [...prev, meta].slice(0, 5));
    });
  };

  const removeFile = (id: string) => setSelectedFiles((prev) => prev.filter(f => f.id !== id));

  const handleStop = () => {
    try { abortRef.current?.abort(); } catch {}
    setIsSending(false);
    setMessages(prev => [...prev, { id: `stopped-${Date.now()}`, role: 'assistant', content: '⏹ 已停止生成' }]);
  };

  // 新增：AI组件调度处理函数 - 增强调试日志
  const handleAIComponentScheduling = async (userText: string): Promise<string | null> => {
    try {
      console.log('🔍 检查用户输入:', userText);
      
      // 检测是否是组件调度指令
      const isComponentCommand = detectComponentCommand(userText);
      console.log('🔧 组件指令检测结果:', isComponentCommand);
      
      if (isComponentCommand) {
        console.log('🤖 检测到组件调度指令，使用AI调度器处理');
        
        // 收集当前系统状态
        const systemStatus = systemStatusCollector.collectSystemStatus(droneState);
        console.log('📊 系统状态已收集');
        
        // 使用AI组件调度器处理
        const scheduleResult = await aiComponentScheduler.scheduleWithAI(userText, systemStatus);
        console.log('✅ 调度结果:', scheduleResult.response);
        
        return scheduleResult.response;
      }
      
      console.log('💬 不是组件调度指令，使用普通聊天');
      return null; // 不是组件调度指令，使用普通聊天
      
    } catch (error: any) {
      console.error('❌ AI组件调度失败:', error);
      return `组件调度遇到问题: ${error.message}`;
    }
  };
  
  // 新增：知识库增强的AI问答处理
  const handleKnowledgeBasedQA = async (userText: string): Promise<string | null> => {
    if (!isKnowledgeBaseInitialized || !useKnowledgeBase) {
      return null; // 知识库未初始化或未启用
    }

    try {
      console.log('📚 使用RAG增强知识库问答：', userText);
      
      // 检查是否有图像
      const imageUrls = selectedFiles.filter(f => !!f.url && f.type?.startsWith('image/')).map(f => f.url as string);
      const hasImages = imageUrls.length > 0;
      
      // 构建增强RAG请求
      const qaRequest: QARequest = {
        query: userText,
        useKnowledge: true,
        maxKnowledgeItems: 5,
        includeSystemContext: true,
        // RAG增强功能
        images: hasImages ? imageUrls : undefined,
        conversationHistory: messages.slice(-10).map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          images: msg.images
        })),
        useMultimodal: hasImages,
        contextWindow: 6
      };
      
      const qaResponse = await knowledgeEnhancedQA.askQuestion(qaRequest);
      
      if (qaResponse.success) {
        console.log(`✅ RAG问答成功，置信度: ${(qaResponse.confidence * 100).toFixed(1)}%`);
        console.log(`🔍 检索策略: ${qaResponse.retrievalStrategy}`);
        
        // 如果置信度较高或使用了知识库，直接使用答案
        if (qaResponse.confidence > 0.5 && qaResponse.usedKnowledge) {
          // 添加RAG增强标识
          let enhancedAnswer = `🤖 **RAG智能助手** (置信度: ${(qaResponse.confidence * 100).toFixed(1)}%)\n\n${qaResponse.answer}`;
          
          // 添加功能标识
          const features = [];
          if (qaResponse.usedKnowledge) features.push('📚 知识库');
          if (qaResponse.contextUsed) features.push('🗨️ 上下文');
          if (qaResponse.domainSpecific) features.push('🎯 专业领域');
          if (qaResponse.multimodalSources && qaResponse.multimodalSources.length > 0) {
            features.push('🖼️ 多模态');
          }
          
          if (features.length > 0) {
            enhancedAnswer = `🤖 **RAG智能助手** [${features.join(' ')}] (置信度: ${(qaResponse.confidence * 100).toFixed(1)}%)\n\n${qaResponse.answer}`;
          }
          
          return enhancedAnswer;
        }
        
        // 否则作为上下文传递给普通聊天
        return null;
      } else {
        console.warn('⚠️ RAG问答失败:', qaResponse.error);
        return null;
      }
      
    } catch (error: any) {
      console.error('❌ RAG问答错误:', error);
      return null;
    }
  };

  // 新增：快速添加知识函数
  const handleQuickAddKnowledge = async () => {
    if (!quickKnowledgeForm.title.trim() || !quickKnowledgeForm.content.trim()) {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ 请填写知识标题和内容'
      }]);
      return;
    }

    try {
      // 添加知识到知识库
      await knowledgeBaseManager.addKnowledge({
        title: quickKnowledgeForm.title,
        content: quickKnowledgeForm.content,
        category: quickKnowledgeForm.category,
        type: 'manual' as const,
        tags: quickKnowledgeForm.tags,
        source: 'user_input'
      });

      // 刷新知识库缓存，确保AI能立即使用新知识
      knowledgeEnhancedQA.clearCache();
      
      // 显示成功消息
      setMessages(prev => [...prev, {
        id: `knowledge-added-${Date.now()}`,
        role: 'assistant',
        content: `✅ **知识已成功添加**

📚 **标题**: ${quickKnowledgeForm.title}
📚 **分类**: ${quickKnowledgeForm.category}
🏷️ **标签**: ${quickKnowledgeForm.tags.join(', ') || '无'}

现在AI可以使用这个知识来回答相关问题了！`
      }]);

      // 重置表单
      setQuickKnowledgeForm({
        title: '',
        content: '',
        category: '通用知识',
        tags: []
      });
      setShowQuickAddKnowledge(false);

      // 记录用户活动
      systemStatusCollector.recordUserActivity(`添加知识: ${quickKnowledgeForm.title}`);
      
    } catch (error: any) {
      console.error('❗ 添加知识失败:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ 添加知识失败: ${error.message}`
      }]);
    }
  };

  // 添加标签函数
  const addQuickKnowledgeTag = (tag: string) => {
    if (tag.trim() && !quickKnowledgeForm.tags.includes(tag.trim())) {
      setQuickKnowledgeForm(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  // 删除标签函数
  const removeQuickKnowledgeTag = (tagToRemove: string) => {
    setQuickKnowledgeForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  // 新增：AI自动知识生成功能
  const handleAIKnowledgeGeneration = async (conversation: ChatMessage[]) => {
    // 只有在使用真实AI模型且启用知识库时才进行知识生成
    if (!isKnowledgeBaseInitialized || !useKnowledgeBase || selectedModel === 'local-echo') {
      return;
    }
    
    // 检查API配置
    if (!apiConfig.apiKey || !apiConfig.baseUrl) {
      return;
    }
    
    try {
      console.log('🤖 检测对话中的知识价值...');
      
      // 只对有实际内容的对话进行分析
      const meaningfulMessages = conversation.filter(msg => 
        msg.content.length > 10 && 
        !msg.content.includes('Echo:') && 
        !msg.content.includes('未配置') &&
        !msg.content.includes('本地占位')
      );
      
      if (meaningfulMessages.length < 2) {
        return; // 对话内容不足，不进行知识生成
      }
      
      // 准备对话数据供AI分析
      const conversationForAnalysis = meaningfulMessages
        .slice(-6) // 最近6条有意义的消息
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
      
      // 使用AI知识生成器分析对话
      const generationResponse = await aiKnowledgeGenerator.generateKnowledgeFromConversation({
        conversation: conversationForAnalysis,
        domain: '无人机农业应用',
        context: '无人机智能分析平台对话'
      });
      
      if (generationResponse.success && generationResponse.knowledge && generationResponse.knowledge.length > 0) {
        console.log('✨ AI检测到有价值的知识:', generationResponse.knowledge.length, '条');
        
        // 处理生成的知识
        for (const knowledge of generationResponse.knowledge) {
          // 显示AI生成的知识建议
          const suggestionMessage = `🤖 **AI发现了有价值的知识**

**标题**: ${knowledge.title}
**分类**: ${knowledge.category}
**标签**: ${knowledge.tags.join(', ')}
**置信度**: ${(knowledge.confidence * 100).toFixed(1)}%

**内容预览**:
${knowledge.content.substring(0, 200)}${knowledge.content.length > 200 ? '...' : ''}

---

💡 这个知识看起来很有用！要添加到知识库吗？`;
          
          setMessages(prev => [...prev, {
            id: `ai-knowledge-suggestion-${Date.now()}`,
            role: 'assistant',
            content: suggestionMessage
          }]);
          
          // 设置待批准的知识
          setPendingKnowledgeForApproval(knowledge);
          setShowAIKnowledgeModal(true);
          
          // 暂时只处理第一个知识建议，避免用户界面过于复杂
          break;
        }
      } else {
        console.log('💭 对话中没有检测到特别有价值的知识');
      }
      
    } catch (error: any) {
      console.error('❌ AI知识生成失败:', error);
      // 不向用户显示错误，避免干扰正常对话
    }
  };
  
  // 新增：处理AI生成知识的批准
  const handleApproveAIKnowledge = async (knowledge: GeneratedKnowledge, approved: boolean) => {
    if (approved && knowledge) {
      try {
        // 添加知识到知识库
        await knowledgeBaseManager.addKnowledge({
          title: knowledge.title,
          content: knowledge.content,
          category: knowledge.category,
          type: 'manual' as const,
          tags: knowledge.tags,
          source: 'ai_generated'
        });
        
        // 刷新知识库缓存
        knowledgeEnhancedQA.clearCache();
        
        // 显示成功消息
        setMessages(prev => [...prev, {
          id: `ai-knowledge-approved-${Date.now()}`,
          role: 'assistant',
          content: `✅ **AI生成的知识已添加到知识库**

📚 **标题**: ${knowledge.title}
🎯 **置信度**: ${(knowledge.confidence * 100).toFixed(1)}%

现在这个知识可以帮助AI提供更准确的答案了！`
        }]);
        
        // 记录用户活动
        systemStatusCollector.recordUserActivity(`批准AI生成的知识: ${knowledge.title}`);
        
      } catch (error: any) {
        console.error('❗ 添加AI生成的知识失败:', error);
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `❌ 添加知识失败: ${error.message}`
        }]);
      }
    } else {
      // 用户拒绝了建议
      setMessages(prev => [...prev, {
        id: `ai-knowledge-rejected-${Date.now()}`,
        role: 'assistant',
        content: '📝 好的，我会继续学习和改进知识检测。如果您后续发现有价值的信息，可以手动添加到知识库。'
      }]);
    }
    
    // 清理状态
    setPendingKnowledgeForApproval(null);
    setShowAIKnowledgeModal(false);
  };
  
  // 检测是否是组件调度指令 - 增强语言理解
  const detectComponentCommand = (text: string): boolean => {
    // 增强的关键词匹配，支持中英文和同义词
    const input = text.toLowerCase();
    
    const componentKeywords = [
      // 无人机相关
      '无人机', '飞机', 'drone', 'uav', '飞行器', '航拍器',
      '起飞', 'takeoff', 'take off', '上升', '升空',
      '降落', 'land', 'landing', '着陆', '下降', '落地',
      '悬停', 'hover', 'hovering', '保持', '停留', '定点',
      '连接', 'connect', '接入', '连上',
      '断开', 'disconnect', '断连', '分离',
      
      // 检测系统相关
      '检测', 'detect', 'detection', '识别', '扫描', '分析',
      '草莓', 'strawberry', '莓果', '红莓',
      'qr', 'qr码', '二维码', '条码', 'barcode',
      '开始', 'start', '启动', '开启',
      '停止', 'stop', '关闭', '结束', '暂停',
      '切换', 'switch', '改变', '转换',
      
      // 截图和视频相关
      '截图', 'screenshot', '拍照', '截屏', '拍摄',
      '保存', 'save', '存储', '储存',
      '视频', 'video', '视频流', '画面', '直播',
      '播放', 'play', '开启视频',
      '检测框', 'detection box', '绘制', '画框', '标记',
      
      // 系统状态相关
      '状态', 'status', '情况', '信息', '怎么样',
      '系统', 'system', '整体', '全部',
      '健康', 'health', '检查', '诊断',
      '电池', 'battery', '电量', '电力',
      '移动', 'move', 'movement', '飞行', '操作'
    ];
    
    // 更智能的匹配：检查是否包含任何组件关键词
    const hasComponentKeyword = componentKeywords.some(keyword => {
      const normalizedKeyword = keyword.toLowerCase();
      return input.includes(normalizedKeyword);
    });
    
    // 额外检查：常见的组合词和短语
    const commonPhrases = [
      '现在无人机', '草莓检测', '截图保存', '视频流',
      '系统状态', '连接状态', '飞行状态', 'drone status',
      'take screenshot', 'start detection', 'stop detection'
    ];
    
    const hasCommonPhrase = commonPhrases.some(phrase => 
      input.includes(phrase.toLowerCase())
    );
    
    return hasComponentKeyword || hasCommonPhrase;
  };

  // 保存API配置
  const saveApiConfig = () => {
    try {
      localStorage.setItem('chatApiConfig', JSON.stringify(apiConfig));
      setMessages(prev => [...prev, { id: `cfg-${Date.now()}`, role: 'assistant', content: '✅ 已保存聊天 API 配置' }]);
      if (apiConfig.model && apiConfig.model !== 'local-echo') {
        setSelectedModel(apiConfig.model);
      }
      setShowSettings(false);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: `cfgerr-${Date.now()}`, role: 'assistant', content: `保存配置失败：${e?.message || '未知错误'}` }]);
    }
  };

  const sendCore = async (userText: string, baseMessages: ChatMessage[]) => {
    setIsSending(true); // 设置发送状态
    
    try {
      // 新增：优先检查是否是AI组件调度指令
      const componentScheduleResponse = await handleAIComponentScheduling(userText);
      
      if (componentScheduleResponse) {
        // 这是组件调度指令，显示结果后直接返回
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: componentScheduleResponse
        }]);
        return;
      }
      
      // 新增：检查是否使用知识库增强问答
      const knowledgeResponse = await handleKnowledgeBasedQA(userText);
      
      if (knowledgeResponse) {
        // 知识库给出了高置信度答案，直接使用
        setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: knowledgeResponse
        }]);
        return;
      }
    } catch (error) {
      console.warn('快速响应处理失败，继续使用AI模型:', error);
    }
    
    // 如果快速响应都没有匹配，则使用AI模型
    const imageUrls = baseMessages[baseMessages.length - 1]?.images || [];
    const nextMessages: ChatMessage[] = baseMessages;
    
    // 新增：记录用户活动
    systemStatusCollector.recordUserActivity(`发送消息: ${userText.substring(0, 20)}${userText.length > 20 ? '...' : ''}`);
    
    // 新增：检测关键词并切换YOLO检测类型
    switchDetectionType(userText);

    const controller = new AbortController();
    abortRef.current = controller;

    // 检查是否有图片，如果有则使用vision API
    const hasImages = imageUrls.length > 0;
    const apiEndpoint = hasImages ? '/api/vision/qwen' : '/api/ai-chat';
    
    // 立即添加一个"正在思考"的占位消息
    const assistantId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { 
      id: assistantId, 
      role: 'assistant', 
      content: '🤔 正在思考...' 
    }]);
    
    let payload: any;
    
    if (hasImages) {
      // 使用vision API格式
      payload = {
        model: selectedModel === 'local-echo' ? 'qwen2.5-vl-7b-instruct' : (apiConfig.model || selectedModel),
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        images: imageUrls,
        max_tokens: 1024,
        temperature: 0.7
      };
    } else {
      // 使用普通聊天API
      payload = {
        model: selectedModel,
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      };
      
      // 将配置传递给后端（不在浏览器持久化以外的地方保存）
      if (selectedModel !== 'local-echo') {
        payload.config = {
          baseUrl: apiConfig.baseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.model || selectedModel,
        } as ChatApiConfig;
      }
    }

    const resp = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    let acc = '';

    if (hasImages) {
      // Vision API 返回 JSON 格式
      const data = await resp.json();
      if (data.ok && data.data) {
        acc = data.data?.choices?.[0]?.message?.content || '无法获取响应内容';
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      } else {
        throw new Error(data.error || '视觉模型API错误');
      }
    } else {
      // 普通聊天API 返回流式数据
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        // 先清空"正在思考"消息
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: '' } : m));
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
        }
      } else {
        const text = await resp.text();
        acc = text;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      }
    }
    
    // 新增：对话完成后，检测是否可以生成知识
    const finalMessages = [...nextMessages, { id: assistantId, role: 'assistant' as const, content: acc }];
    
    // 延迟一下让用户看到完整的对话后再进行AI分析
    setTimeout(() => {
      handleAIKnowledgeGeneration(finalMessages);
    }, 2000);
  };
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${errorText}`);
    }

    let acc = '';

    if (hasImages) {
      // Vision API 返回 JSON 格式
      const data = await resp.json();
      if (data.ok && data.data) {
        acc = data.data?.choices?.[0]?.message?.content || '无法获取响应内容';
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      } else {
        throw new Error(data.error || '视觉模型API错误');
      }
    } else {
      // 普通聊天API 返回流式数据
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        // 先清空"正在思考"消息
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: '' } : m));
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
        }
      } else {
        const text = await resp.text();
        acc = text;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      }
    }
    
    // 新增：对话完成后，检测是否可以生成知识
    const finalMessages = [...nextMessages, { id: assistantId, role: 'assistant' as const, content: acc }];
    
    // 延迟一下让用户看到完整的对话后再进行AI分析
    setTimeout(() => {
      handleAIKnowledgeGeneration(finalMessages);
    }, 2000);
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const guard = identityGuard(input);
    if (guard) {
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: guard }]);
      setInput('');
      return;
    }

    const userText = input.trim();
    setInput(''); // 立即清空输入框，提升响应性
    
    // 立即添加用户消息到界面，避免阻塞感
    const imageUrls = selectedFiles.filter(f => !!f.url && f.type?.startsWith('image/')).map(f => f.url as string);
    const userMessage: ChatMessage = { 
      id: `user-${Date.now()}`, 
      role: 'user', 
      content: userText, 
      images: imageUrls 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setSelectedFiles([]); // 清空文件选择
    
    // 异步处理AI响应，不阻塞UI
    setTimeout(async () => {
      try {
        await sendCore(userText, [...messages, userMessage]);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setMessages(prev => [...prev, { 
            id: `err-${Date.now()}`, 
            role: 'assistant', 
            content: `请求失败：${e?.message || '未知错误'}` 
          }]);
        }
      } finally {
        setIsSending(false);
      }
    }, 0);
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditingContent(text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const idx = messages.findIndex(m => m.id === editingId);
    if (idx < 0) return cancelEdit();
    const newHistory = messages.slice(0, idx).filter(m => m.role !== 'assistant');
    setEditingId(null);
    setEditingContent('');
    try {
      await sendCore(editingContent.trim(), newHistory);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: `请求失败：${e?.message || '未知错误'}` }]);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    handleSend();
  };

  const scrollToBottom = () => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  const scrollToTop = () => listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const copyMessage = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 1200);
  };
  const deleteMessage = (id: string) => setMessages(prev => prev.filter(m => m.id !== id));
  const regenerateFrom = async (id: string) => {
    const idx = messages.findIndex(m => m.id === id);
    if (idx < 0) return;
    const history = messages.slice(0, idx + 1).filter(m => m.role !== 'assistant');
    try {
      await sendCore(history[history.length - 1].content, history.slice(0, -1));
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: `请求失败：${e?.message || '未知错误'}` }]);
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-full w-full min-h-0 flex-col" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      {/* 顶部标题栏 + 模式切换 + 模型选择 + 设置 */}
      <div className={`flex min-h-[44px] items-center justify-between border-b text-sm font-medium px-3 ${
        isDark 
          ? 'border-white/10 text-white/90' 
          : 'border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          <span>TTtalent-Aibot</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>模型：</span>
          <select
            className={`text-xs rounded px-2 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDark 
                ? 'bg-white/5 text-white border-white/10' 
                : 'bg-gray-50 text-gray-900 border-gray-200'
            }`}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            aria-label="选择模型"
          >
            {MODEL_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id} className={isDark ? "bg-slate-900" : "bg-white"}>{opt.label}</option>
            ))}
          </select>
          <button
            className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            onClick={() => setShowSettings(s => !s)}
            title="配置AI API"
          >设置</button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className={`border-b p-3 text-xs space-y-2 ${
          isDark 
            ? 'border-white/10 bg-black/30 text-white' 
            : 'border-gray-200 bg-gray-50 text-gray-900'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className={isDark ? 'text-white/70' : 'text-gray-600'}>Base URL</span>
              <input
                className={`border rounded px-2 py-1 outline-none ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/50' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1 或 http://localhost:8000/v1"
                value={apiConfig.baseUrl}
                onChange={(e) => setApiConfig(v => ({ ...v, baseUrl: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={isDark ? 'text-white/70' : 'text-gray-600'}>API Key</span>
              <input
                className={`border rounded px-2 py-1 outline-none ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/50' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="输入 QWEN_API_KEY 或 OPENAI_API_KEY"
                type="password"
                value={apiConfig.apiKey}
                onChange={(e) => setApiConfig(v => ({ ...v, apiKey: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className={isDark ? 'text-white/70' : 'text-gray-600'}>Model</span>
              <input
                className={`border rounded px-2 py-1 outline-none ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-white/50' 
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="例如：Qwen/Qwen2.5-VL-7B-Instruct 或 gpt-4o"
                value={apiConfig.model}
                onChange={(e) => setApiConfig(v => ({ ...v, model: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className={isDark ? 'text-white/50' : 'text-gray-500'}>说明：仅保存在浏览器本地，不会上传服务器。</div>
            <div className="flex gap-2">
              <button 
                className={`px-3 py-1 rounded transition-colors ${
                  isDark 
                    ? 'bg-white/10 hover:bg-white/20 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`} 
                onClick={() => setShowSettings(false)}
              >取消</button>
              <button 
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white" 
                onClick={saveApiConfig}
              >保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 聊天主体（消息+输入） */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* 聊天消息列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto" ref={listRef}>
          <div className="p-4 pb-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`relative group px-3 py-2 rounded-xl max-w-[80%] whitespace-pre-wrap break-words ${
                  m.role === 'user' 
                    ? 'bg-blue-600/80 text-white' 
                    : isDark 
                      ? 'bg-white/10 text-white' 
                      : 'bg-gray-100 text-gray-900'
                } ${m.role === 'assistant' ? 'max-h-[65vh] overflow-y-auto overscroll-contain' : ''}`}>
                  {m.role === 'assistant' && (
                    <button
                      onClick={() => copyMessage(m.id, m.content)}
                      className={`absolute top-1 right-1 z-10 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark 
                          ? 'bg-white/10 hover:bg-white/20 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}
                      title="复制"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                  )}
                  {m.images && m.images.length > 0 && (
                    <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {m.images.map((src, idx) => (
                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="block">
                          <img src={src} alt={`image-${idx}`} className="max-h-40 rounded object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <MessageMarkdown content={m.content} />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区 */}
        <div className={`border-t p-3 backdrop-blur-sm ${
          isDark 
            ? 'border-white/10 bg-black/40' 
            : 'border-gray-200 bg-white/80'
        }`}>
          {/* 新增：提示词快捷面板 */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowPrompts(!showPrompts)}
                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                    isDark 
                      ? 'bg-white/10 hover:bg-white/20 text-white/90' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title="切换提示词面板"
                >
                  <Search className="w-3 h-3" />
                  <span>提示词</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showPrompts ? 'rotate-180' : ''}`} />
                </button>
                
                {/* 将无人机状态指示器替换为模式切换下拉框 */}
                <div className="relative">
                  <select
                    value={isAgentMode ? 'agent' : 'chat'}
                    onChange={(e) => setIsAgentMode(e.target.value === 'agent')}
                    className={`text-xs rounded-lg px-3 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 backdrop-blur-sm ${
                      isDark 
                        ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border-blue-500/30' 
                        : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-gray-900 border-blue-300'
                    }`}
                    aria-label="切换模式"
                  >
                    <option value="chat">智能问答</option>
                    <option value="agent">智能体</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className={`w-4 h-4 fill-none stroke-current ${isDark ? 'text-white/80' : 'text-gray-600'}`} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* 知识库功能按钮组 */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowKnowledgeSearch(!showKnowledgeSearch)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                    showKnowledgeSearch 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                      : isDark 
                        ? 'bg-white/10 hover:bg-white/20 text-white/80 hover:shadow-md' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
                  }`}
                  title="知识库搜索"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>搜索</span>
                </button>
                
                <button 
                  onClick={() => {
                    // 快速添加知识的模态框
                    setShowQuickAddKnowledge(true);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:shadow-purple-500/25"
                  title="快速添加知识"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加</span>
                </button>
                
                <button 
                  onClick={() => setShowAIKnowledgePanel(!showAIKnowledgePanel)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                    showAIKnowledgePanel 
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25' 
                      : isDark 
                        ? 'bg-white/10 hover:bg-white/20 text-white/80 hover:shadow-md' 
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:shadow-md'
                  }`}
                  title="AI知识助手"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>AI助手</span>
                </button>
              </div>
              <button 
                onClick={() => generateAISuggestion()}
                disabled={isGeneratingSuggestion}
                className={`px-4 py-1.5 text-xs rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isGeneratingSuggestion 
                    ? 'bg-gray-600/80 text-white/60 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/25'
                }`}
                title="获取AI智能建议"
              >
                <Bot className={`w-3.5 h-3.5 ${isGeneratingSuggestion ? 'animate-spin' : ''}`} />
                <span>{isGeneratingSuggestion ? 'AI分析中...' : 'AI建议'}</span>
              </button>
            </div>
            
            {/* 快速添加知识弹窗 - 修复布局 */}
            {showQuickAddKnowledge && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                <div className={`border rounded-xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl ${
                  isDark 
                    ? 'bg-gray-900/95 border-white/20' 
                    : 'bg-white/95 border-gray-300'
                }`}>
                  {/* 弹窗头部 - 固定不滚动 */}
                  <div className={`flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b shrink-0 ${
                    isDark ? 'border-white/10' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Plus className="w-5 h-5 text-purple-400" />
                      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>快速添加知识</h3>
                    </div>
                    <button
                      onClick={() => setShowQuickAddKnowledge(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark 
                          ? 'hover:bg-white/10 text-white/70' 
                          : 'hover:bg-gray-100 text-gray-500'
                      }`}
                      title="关闭添加知识窗口"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* 弹窗内容 - 可滚动区域 */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-3 sm:pt-4 min-h-0">
                    <div className="space-y-4">
                    {/* 标题输入 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        📚 知识标题 *
                      </label>
                      <input
                        type="text"
                        value={quickKnowledgeForm.title}
                        onChange={(e) => setQuickKnowledgeForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="输入知识标题，例如：无人机连接问题解决方案"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          isDark 
                            ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    
                    {/* 分类选择 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        📁 知识分类
                      </label>
                      <select
                        value={quickKnowledgeForm.category}
                        onChange={(e) => setQuickKnowledgeForm(prev => ({ ...prev, category: e.target.value }))}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          isDark 
                            ? 'bg-white/10 border-white/20 text-white' 
                            : 'bg-white border-gray-200 text-gray-900'
                        }`}
                        title="选择知识分类"
                      >
                        <option value="通用知识">通用知识</option>
                        <option value="设备连接">设备连接</option>
                        <option value="检测算法">检测算法</option>
                        <option value="AI配置">AI配置</option>
                        <option value="系统监控">系统监控</option>
                        <option value="故障排除">故障排除</option>
                        <option value="常见问题">常见问题</option>
                      </select>
                    </div>
                    
                    {/* 标签输入 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        🏷️ 知识标签
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {quickKnowledgeForm.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-sm flex items-center gap-1.5 text-white"
                          >
                            {tag}
                            <button
                              onClick={() => removeQuickKnowledgeTag(tag)}
                              className="hover:bg-white/20 rounded-full p-0.5"
                              title={`删除标签: ${tag}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="输入标签后按回车添加，例如：连接、网络、故障"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            addQuickKnowledgeTag(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          isDark 
                            ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    
                    {/* 内容输入 */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                        📝 知识内容 *
                      </label>
                      <textarea
                        value={quickKnowledgeForm.content}
                        onChange={(e) => setQuickKnowledgeForm(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="请详细描述知识内容，支持Markdown格式。例如：&#10;&#10;1. 检查设备连接状态&#10;2. 确认网络配置&#10;3. 重启相关服务&#10;&#10;**注意事项**：请确保操作安全。"
                        rows={6}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical min-h-[120px] max-h-[200px] ${
                          isDark 
                            ? 'bg-white/10 border-white/20 text-white placeholder-white/50' 
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                        }`}
                      />
                    </div>
                    </div>
                  </div>
                  
                  {/* 弹窗底部 - 固定操作区域 */}
                  <div className={`border-t p-4 sm:p-6 pt-3 sm:pt-4 shrink-0 ${
                    isDark ? 'border-white/10 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50'
                  }`}>
                    {/* 操作按钮 */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleQuickAddKnowledge}
                        disabled={!quickKnowledgeForm.title.trim() || !quickKnowledgeForm.content.trim()}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-white"
                      >
                        <Plus className="w-4 h-4" />
                        添加知识
                      </button>
                      <button
                        onClick={() => {
                          setShowQuickAddKnowledge(false);
                          setQuickKnowledgeForm({ title: '', content: '', category: '通用知识', tags: [] });
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                          isDark 
                            ? 'bg-white/10 hover:bg-white/20 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                      >
                        取消
                      </button>
                    </div>
                    
                    {/* 提示信息 */}
                    <div className={`mt-3 p-3 rounded-lg border ${
                      isDark 
                        ? 'bg-blue-600/20 border-blue-600/40' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <Bot className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div className={`text-sm ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                          <div className="font-medium mb-1">🤖 AI集成提示</div>
                          <div>添加的知识将自动集成到AI问答系统中，帮助AI提供更准确的专业答案。请确保知识内容的准确性和完整性。</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* AI知识助手面板 */}
            {showAIKnowledgePanel && (
              <div className="mb-3">
                <AIKnowledgePanel
                  onAskAI={(question: string, context?: string) => {
                    const fullQuestion = context ? `${context}\n\n${question}` : question;
                    setInput(fullQuestion);
                    // 自动发送问题
                    setTimeout(() => {
                      handleSend();
                    }, 100);
                  }}
                  className="max-h-96 overflow-y-auto"
                />
              </div>
            )}
            
            {/* 知识库搜索面板 */}
            {showKnowledgeSearch && (
              <div className="mb-3">
                <KnowledgeSearch
                  onSelectResult={(result) => {
                    // 将选中的知识条目作为上下文添加到输入框
                    const contextText = `基于知识库"${result.title}"：

${result.content}

请问：`;
                    setInput(contextText);
                    setShowKnowledgeSearch(false);
                  }}
                  className="max-h-64"
                />
              </div>
            )}
            
            {/* 提示词面板 */}
            {showPrompts && (
              <div className={`rounded-lg border p-3 mb-3 ${
                isDark 
                  ? 'bg-white/5 border-white/10' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {/* 分类筛选 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>分类:</span>
                  {['all', 'agriculture', 'general'].map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        selectedCategory === category 
                          ? 'bg-blue-600 text-white' 
                          : isDark 
                            ? 'bg-white/10 hover:bg-white/20 text-white/80' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                    >
                      {category === 'all' ? '全部' : 
                       category === 'agriculture' ? '农业' : '通用'}
                    </button>
                  ))}
                </div>
                
                {/* 提示词列表 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PROMPT_TEMPLATES
                    .filter(prompt => selectedCategory === 'all' || prompt.category === selectedCategory)
                    .map(prompt => (
                    <button
                      key={prompt.id}
                      onClick={() => selectPrompt(prompt)}
                      className={`flex items-start gap-2 p-2 text-left rounded-lg border transition-colors ${
                        isDark 
                          ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white' 
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900'
                      }`}
                      title={prompt.description}
                    >
                      <prompt.icon className={`w-5 h-5 mt-0.5 ${isDark ? 'text-white/70' : 'text-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-xs mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{prompt.name}</div>
                        <div className={`text-xs line-clamp-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{prompt.description}</div>
                        {prompt.requiresImage && (
                          <div className="mt-1">
                            <span className="inline-block px-1 py-0.5 bg-orange-600/80 text-white text-xs rounded">
                              需要图片
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  <div className="relative w-full">
                    <select
                      value={isAgentMode ? 'agent' : 'chat'}
                      onChange={(e) => setIsAgentMode(e.target.value === 'agent')}
                      className={`text-xs rounded-lg px-3 py-1 border focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 ${
                        isDark 
                          ? 'bg-white/10 text-white border-white/20' 
                          : 'bg-white text-gray-900 border-gray-200'
                      }`}
                      aria-label="切换模式"
                    >
                      <option value="chat">智能问答</option>
                      <option value="agent">智能体</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className={`w-4 h-4 fill-none stroke-current ${isDark ? 'text-white/60' : 'text-gray-500'}`} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit}>
            {selectedFiles.length > 0 && (
              <div className="mb-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {selectedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-purple-600/70 text-white text-xs">
                    {f.url && f.type?.startsWith('image/') ? (
                      <img src={f.url} alt={f.name} className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828"/></svg>
                    )}
                    <span className="max-w-[160px] truncate" title={f.name}>{f.name}</span>
                    <span className="opacity-80">{Math.round(f.size / 1024)}KB</span>
                    <button className="opacity-80 hover:opacity-100" onClick={() => removeFile(f.id)} title="移除">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={`relative flex items-end gap-2 rounded-xl border px-3 py-2 ${
              isDark 
                ? 'bg-white/5 border-white/10' 
                : 'bg-gray-50 border-gray-200'
            }`}>
                <button 
                  onClick={handlePickFile} 
                  className={`absolute bottom-[10px] left-3 p-1 transition-colors ${
                    isDark 
                      ? 'text-white/90 hover:text-white' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`} 
                  title="添加附件"
                >
                  <Paperclip className="w-6 h-6" />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFilesSelected} aria-label="选择附件" title="选择附件" />

                <textarea
                  className={`flex-1 bg-transparent outline-none resize-none text-sm max-h-40 min-h-[36px] pl-10 ${
                    isDark 
                      ? 'text-white placeholder:text-white/40' 
                      : 'text-gray-900 placeholder:text-gray-500'
                  }`}
                  placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                />

                {isSending ? (
                  <button 
                    onClick={handleStop} 
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isDark 
                        ? 'bg-white/10 text-white hover:bg-white/20' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`} 
                    title="停止"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      canSend 
                        ? 'bg-blue-600 text-white hover:bg-blue-500' 
                        : isDark 
                          ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={handleSend}
                    disabled={!canSend}
                    title="发送"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className={`text-[11px] mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                当前模型：{selectedModelLabel}{selectedModel !== 'local-echo' ? (apiConfig.apiKey && apiConfig.baseUrl ? '（已配置）' : '（未配置）') : ''}
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatbotChat;