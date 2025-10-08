// 知识库增强的AI问答系统 (RAG优化版本)
// 结合多模态知识库检索和本地Ollama模型，提供准确和专业的答案
// 支持文本+图像的混合检索、对话上下文记忆、专业领域增强

import { knowledgeBaseManager, KnowledgeItem } from './knowledgeBase';
import { knowledgeSearchEngine, DetailedSearchResult } from './knowledgeSearchEngine';
import { systemStatusCollector } from './systemStatusCollector';

// 问答请求接口 (RAG增强版本)
export interface QARequest {
  query: string;
  context?: string; // 额外上下文
  useKnowledge: boolean; // 是否使用知识库
  maxKnowledgeItems?: number; // 最大知识库条目数
  includeSystemContext?: boolean; // 是否包含系统状态上下文
  // RAG增强功能
  images?: string[]; // 图像数据（base64）
  conversationHistory?: ChatMessage[]; // 对话历史用于上下文理解
  domainFocus?: 'agriculture' | 'drone' | 'general'; // 专业领域聚焦
  useMultimodal?: boolean; // 是否启用多模态检索
  contextWindow?: number; // 上下文窗口大小
}

// 对话消息接口
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp?: number;
}

// 问答响应接口 (RAG增强版本)
export interface QAResponse {
  success: boolean;
  answer: string;
  sources: KnowledgeSource[]; // 知识来源
  confidence: number; // 置信度 0-1
  responseTime: number; // 响应时间(ms)
  usedKnowledge: boolean; // 是否使用了知识库
  error?: string;
  // RAG增强字段
  multimodalSources?: MultimodalSource[]; // 多模态来源
  contextUsed?: boolean; // 是否使用了对话上下文
  domainSpecific?: boolean; // 是否使用了领域专业知识
  retrievalStrategy?: string; // 使用的检索策略
  reasoning?: string; // AI推理过程（调试用）
}

// 多模态知识来源
export interface MultimodalSource {
  type: 'text' | 'image' | 'hybrid';
  content: string;
  relevanceScore: number;
  modality: string;
}

// 知识来源接口
export interface KnowledgeSource {
  item: KnowledgeItem;
  relevanceScore: number;
  usedInAnswer: boolean;
  excerpts: string[]; // 使用的片段
}

// 问答历史记录
export interface QAHistory {
  id: string;
  query: string;
  answer: string;
  timestamp: number;
  sources: KnowledgeSource[];
  confidence: number;
  userFeedback?: 'helpful' | 'not_helpful' | 'partially_helpful';
}

// 知识库增强的AI问答系统 (RAG优化版本)
export class KnowledgeEnhancedQA {
  private static instance: KnowledgeEnhancedQA;
  private qaHistory: QAHistory[] = [];
  private responseCache: Map<string, QAResponse> = new Map();
  private readonly CACHE_TTL = 600000; // 10分钟缓存过期时间
  private readonly MAX_HISTORY = 1000; // 最大历史记录数
  
  // RAG增强功能
  private conversationMemory: Map<string, ChatMessage[]> = new Map(); // 对话记忆
  private domainKnowledge: Map<string, string[]> = new Map(); // 领域专业知识
  private imageAnalysisCache: Map<string, any> = new Map(); // 图像分析缓存
  private readonly MAX_CONVERSATION_LENGTH = 20; // 最大对话轮数
  private readonly DOMAIN_BOOST_FACTOR = 1.3; // 领域相关性提升系数

  private constructor() {
    this.initializeDomainKnowledge();
  }

  public static getInstance(): KnowledgeEnhancedQA {
    if (!KnowledgeEnhancedQA.instance) {
      KnowledgeEnhancedQA.instance = new KnowledgeEnhancedQA();
    }
    return KnowledgeEnhancedQA.instance;
  }

  // 初始化领域专业知识
  private initializeDomainKnowledge(): void {
    // 农业领域关键词
    this.domainKnowledge.set('agriculture', [
      '草莓', '成熟度', '作物', '植物', '病虫害', '施肥', '灌溉', '收获',
      '土壤', '气候', '阳光', '温度', '湿度', '生长', '种植', '营养',
      '农药', '化肥', '有机', '绿色', '环保', '生态', '农业现代化'
    ]);
    
    // 无人机领域关键词
    this.domainKnowledge.set('drone', [
      '无人机', '航拍', '飞行', '起飞', '降落', '悬停', '航程',
      '电池', '信号', '遥控', 'GPS', '传感器', '稳定器', '螺旋桨',
      '相机', '云台', '视频', '图传', '实时', '自主', '智能', '路径规划'
    ]);
    
    // 通用技术关键词
    this.domainKnowledge.set('general', [
      '系统', '配置', '访问', '连接', '网络', '数据库', 'API',
      '算法', '模型', 'AI', '机器学习', '深度学习', '计算机视觉',
      '检测', '识别', '分析', '处理', '优化', '调试', '测试'
    ]);
  }

  // 检测问题的领域归属
  private detectDomain(query: string): 'agriculture' | 'drone' | 'general' {
    const queryLower = query.toLowerCase();
    
    let agricultureScore = 0;
    let droneScore = 0;
    
    // 计算各领域的关键词匹配度
    this.domainKnowledge.get('agriculture')?.forEach(keyword => {
      if (queryLower.includes(keyword)) agricultureScore++;
    });
    
    this.domainKnowledge.get('drone')?.forEach(keyword => {
      if (queryLower.includes(keyword)) droneScore++;
    });
    
    // 返回得分最高的领域
    if (agricultureScore > droneScore && agricultureScore > 0) return 'agriculture';
    if (droneScore > agricultureScore && droneScore > 0) return 'drone';
    return 'general';
  }

  // 主要问答方法 (RAG增强版本)
  public async askQuestion(request: QARequest): Promise<QAResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // 检测领域归属
    const detectedDomain = request.domainFocus || this.detectDomain(request.query);
    console.log('🎯 检测到领域:', detectedDomain);

    // 检查缓存（如果用户刚添加了新知识，跳过缓存）
    const recentlyAddedKnowledge = this.hasRecentlyAddedKnowledge();
    const cachedResponse = !recentlyAddedKnowledge ? this.responseCache.get(cacheKey) : null;
    if (cachedResponse && !request.useMultimodal) {
      console.log('💾 使用缓存的问答结果');
      return {
        ...cachedResponse,
        responseTime: Date.now() - startTime
      };
    }

    console.log('🤔 开始RAG增强AI问答:', request.query);

    try {
      let sources: KnowledgeSource[] = [];
      let multimodalSources: MultimodalSource[] = [];
      let knowledgeContext = '';
      let confidence = 0.5; // 基础置信度
      let contextUsed = false;
      let domainSpecific = false;
      let retrievalStrategy = 'basic';

      // 处理对话上下文
      if (request.conversationHistory && request.conversationHistory.length > 0) {
        this.updateConversationMemory(request.conversationHistory);
        contextUsed = true;
      }

      // 搜索知识库
      if (request.useKnowledge) {
        // 强制重新初始化知识库以获取最新内容
        await knowledgeBaseManager.initialize();
        
        // 使用增强检索算法
        const searchResults = await this.enhancedKnowledgeSearch(request, detectedDomain);
        sources = this.processSearchResults(searchResults);
        knowledgeContext = this.buildKnowledgeContext(sources, detectedDomain);
        retrievalStrategy = 'enhanced_domain_aware';
        
        // 根据知识库匹配度调整置信度
        if (sources.length > 0) {
          const avgScore = sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length;
          confidence = Math.min(0.95, 0.5 + avgScore * 0.45);
          
          // 领域专业知识加成
          const domainRelevantSources = sources.filter(s => 
            this.isDomainRelevant(s.item, detectedDomain)
          );
          if (domainRelevantSources.length > 0) {
            confidence = Math.min(0.98, confidence * this.DOMAIN_BOOST_FACTOR);
            domainSpecific = true;
            console.log('🎯 检测到领域专业知识，提升置信度');
          }
          
          // 如果找到高相关度的新添加知识，进一步提升置信度
          const hasRecentKnowledge = sources.some(s => 
            s.item.source === 'user_input' && 
            (Date.now() - s.item.createdAt) < 300000 // 5分钟内添加的
          );
          if (hasRecentKnowledge) {
            confidence = Math.min(0.98, confidence + 0.1);
            console.log('🆕 检测到新添加的相关知识，提升置信度');
          }
        }
        
        console.log(`📚 找到 ${sources.length} 个相关知识条目`);
      }

      // 多模态检索（如果有图像）
      if (request.useMultimodal && request.images && request.images.length > 0) {
        multimodalSources = await this.analyzeImages(request.images, request.query);
        retrievalStrategy += '_multimodal';
        console.log(`🖼️ 多模态分析完成，找到 ${multimodalSources.length} 个相关图像源`);
      }

      // 构建增强提示词
      const enhancedPrompt = this.buildAdvancedPrompt(
        request, 
        knowledgeContext, 
        detectedDomain,
        multimodalSources
      );

      // 调用AI模型
      const aiResponse = await this.callAIModel(enhancedPrompt, request.images);

      // 处理AI响应
      const processedAnswer = this.processAIResponse(aiResponse, sources, multimodalSources);

      // 评估答案质量
      const finalConfidence = this.evaluateAnswerQuality(
        processedAnswer, 
        request.query, 
        sources,
        confidence,
        domainSpecific
      );

      const response: QAResponse = {
        success: true,
        answer: processedAnswer,
        sources,
        confidence: finalConfidence,
        responseTime: Date.now() - startTime,
        usedKnowledge: request.useKnowledge && sources.length > 0,
        multimodalSources,
        contextUsed,
        domainSpecific,
        retrievalStrategy,
        reasoning: `领域: ${detectedDomain}, 检索策略: ${retrievalStrategy}, 知识源: ${sources.length}, 多模态源: ${multimodalSources.length}`
      };

      // 只有在没有新知识的情况下才缓存结果
      if (!recentlyAddedKnowledge && !request.useMultimodal) {
        this.responseCache.set(cacheKey, response);
        setTimeout(() => this.responseCache.delete(cacheKey), this.CACHE_TTL);
      }

      // 记录历史
      this.recordQAHistory(request.query, response);

      console.log(`✅ RAG问答完成，置信度: ${(finalConfidence * 100).toFixed(1)}%`);
      return response;

    } catch (error: any) {
      console.error('❌ RAG问答失败:', error);
      return {
        success: false,
        answer: '抱歉，AI服务暂时不可用，请稍后再试。',
        sources: [],
        confidence: 0,
        responseTime: Date.now() - startTime,
        usedKnowledge: false,
        error: error.message,
        multimodalSources: [],
        contextUsed: false,
        domainSpecific: false,
        retrievalStrategy: 'error'
      };
    }
  }

  // 增强的知识库检索（支持领域感知）
  private async enhancedKnowledgeSearch(
    request: QARequest, 
    domain: 'agriculture' | 'drone' | 'general'
  ): Promise<DetailedSearchResult[]> {
    const baseQuery = {
      query: request.query,
      limit: request.maxKnowledgeItems || 5,
      threshold: 0.1
    };

    // 基本检索
    const searchResults = await knowledgeSearchEngine.search(baseQuery, {
      useSemanticSearch: true,
      useKeywordSearch: true,
      useFuzzySearch: true,
      combineResults: true,
      boostFactors: {
        title: 2.5,
        content: 1.0,
        tags: 2.0,
        category: domain === 'general' ? 1.5 : 2.5, // 领域专业知识加成
        semantic: 2.0
      }
    });

    // 领域相关性过滤和加成
    const enhancedResults = searchResults.map(result => {
      let score = result.score;
      
      // 领域相关性加成
      if (this.isDomainRelevant(result.item, domain)) {
        score *= this.DOMAIN_BOOST_FACTOR;
      }
      
      // 上下文相关性加成
      if (request.conversationHistory) {
        const contextRelevance = this.calculateContextRelevance(
          result.item.content, 
          request.conversationHistory
        );
        score *= (1 + contextRelevance * 0.3);
      }
      
      return {
        ...result,
        score
      };
    });

    // 按增强后的分数重新排序
    return enhancedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, request.maxKnowledgeItems || 5);
  }

  // 判断知识是否与领域相关
  private isDomainRelevant(item: KnowledgeItem, domain: string): boolean {
    const domainKeywords = this.domainKnowledge.get(domain) || [];
    const itemText = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
    
    return domainKeywords.some(keyword => itemText.includes(keyword.toLowerCase()));
  }

  // 计算上下文相关性
  private calculateContextRelevance(
    content: string, 
    conversationHistory: ChatMessage[]
  ): number {
    if (!conversationHistory || conversationHistory.length === 0) return 0;
    
    const recentMessages = conversationHistory.slice(-6); // 最近6条消息
    const contextText = recentMessages
      .map(msg => msg.content)
      .join(' ')
      .toLowerCase();
    
    // 简单的关键词匹配相关性计算
    const contentWords = content.toLowerCase().split(/\s+/);
    const contextWords = contextText.split(/\s+/);
    
    let matchCount = 0;
    contentWords.forEach(word => {
      if (word.length > 2 && contextWords.includes(word)) {
        matchCount++;
      }
    });
    
    return Math.min(1.0, matchCount / Math.max(contentWords.length, 1));
  }

  // 更新对话记忆
  private updateConversationMemory(history: ChatMessage[]): void {
    const sessionId = 'current'; // 简化处理，实际可以根据用户ID生成
    
    // 保持最近的对话
    const limitedHistory = history.slice(-this.MAX_CONVERSATION_LENGTH);
    this.conversationMemory.set(sessionId, limitedHistory);
  }

  // 图像分析（多模态RAG）
  private async analyzeImages(
    images: string[], 
    query: string
  ): Promise<MultimodalSource[]> {
    const sources: MultimodalSource[] = [];
    
    for (const imageData of images) {
      try {
        // 检查缓存
        const imageHash = this.hashString(imageData.substring(0, 100));
        const cached = this.imageAnalysisCache.get(imageHash);
        
        if (cached) {
          sources.push({
            type: 'image',
            content: cached.description,
            relevanceScore: this.calculateImageRelevance(cached.description, query),
            modality: 'vision'
          });
          continue;
        }
        
        // 调用视觉模型分析图像
        const imageAnalysis = await this.analyzeImageWithVision(imageData, query);
        
        if (imageAnalysis) {
          // 缓存结果
          this.imageAnalysisCache.set(imageHash, imageAnalysis);
          
          sources.push({
            type: 'image',
            content: imageAnalysis.description,
            relevanceScore: this.calculateImageRelevance(imageAnalysis.description, query),
            modality: 'vision'
          });
        }
      } catch (error) {
        console.error('图像分析失败:', error);
      }
    }
    
    return sources;
  }

  // 使用视觉模型分析图像
  private async analyzeImageWithVision(
    imageData: string, 
    query: string
  ): Promise<{ description: string; confidence: number } | null> {
    try {
      const response = await fetch('/api/vision/qwen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated',
          messages: [{
            role: 'user',
            content: `请分析这张图像并描述其内容，特别关注与以下问题相关的信息：${query}`
          }],
          images: [imageData],
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        throw new Error(`视觉模型请求失败: ${response.status}`);
      }
      
      const result = await response.json();
      const description = result.data?.choices?.[0]?.message?.content || '';
      
      return {
        description,
        confidence: 0.8 // 基本置信度
      };
    } catch (error) {
      console.error('视觉模型调用失败:', error);
      return null;
    }
  }

  // 计算图像与查询的相关性
  private calculateImageRelevance(description: string, query: string): number {
    const descWords = description.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    let matchCount = 0;
    queryWords.forEach(word => {
      if (word.length > 2 && descWords.some(dw => dw.includes(word))) {
        matchCount++;
      }
    });
    
    return Math.min(1.0, matchCount / Math.max(queryWords.length, 1));
  }

  // 生成字符串哈希
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转据为32位整数
    }
    return hash.toString();
  }

  // 处理搜索结果
  private processSearchResults(searchResults: DetailedSearchResult[]): KnowledgeSource[] {
    return searchResults.map(result => ({
      item: result.item,
      relevanceScore: result.score,
      usedInAnswer: false, // 初始状态
      excerpts: result.highlights || []
    }));
  }

  // 构建增强知识库上下文（支持领域专业化）
  private buildKnowledgeContext(
    sources: KnowledgeSource[], 
    domain: 'agriculture' | 'drone' | 'general'
  ): string {
    if (sources.length === 0) return '';

    let context = `# 相关知识库信息（领域：${domain}）\n\n`;
    
    // 按领域相关性分组
    const domainSources = sources.filter(s => this.isDomainRelevant(s.item, domain));
    const generalSources = sources.filter(s => !this.isDomainRelevant(s.item, domain));
    
    // 优先显示领域相关知识
    const orderedSources = [...domainSources, ...generalSources];
    
    orderedSources.forEach((source, index) => {
      const isDomainSpecific = domainSources.includes(source);
      const prefix = isDomainSpecific ? '🎯' : '📚';
      
      context += `${prefix} ## 知识条目 ${index + 1}: ${source.item.title}\n`;
      context += `**分类**: ${source.item.category}\n`;
      context += `**类型**: ${source.item.type}\n`;
      context += `**标签**: ${source.item.tags.join(', ')}\n`;
      context += `**相关度**: ${(source.relevanceScore * 100).toFixed(1)}%\n`;
      
      if (isDomainSpecific) {
        context += `**领域专业**: ✅\n`;
      }
      
      // 如果有高亮片段，优先使用高亮片段
      if (source.excerpts.length > 0) {
        context += '**相关内容片段**:\n';
        source.excerpts.forEach(excerpt => {
          context += `- ${excerpt}\n`;
        });
      } else {
        // 否则使用内容的前500个字符
        const content = source.item.content.length > 500 
          ? source.item.content.substring(0, 500) + '...'
          : source.item.content;
        context += `**内容**: ${content}\n`;
      }
      context += '\n---\n\n';
    });

    return context;
  }

  // 构建高级增强提示词（支持多模态和领域专业化）
  private buildAdvancedPrompt(
    request: QARequest, 
    knowledgeContext: string,
    domain: 'agriculture' | 'drone' | 'general',
    multimodalSources: MultimodalSource[]
  ): string {
    // 极简化prompt，只包含必要信息
    let prompt = request.query;

    // 只在有相关知识时才添加
    if (knowledgeContext && knowledgeContext.trim()) {
      prompt = `基于以下信息回答问题：

${knowledgeContext}

问题：${request.query}`;
    }
    
    // 只在有图像分析时才添加
    if (multimodalSources.length > 0) {
      const imageInfo = multimodalSources.map(source => source.content).join('；');
      prompt += `\n\n图像信息：${imageInfo}`;
    }

    return prompt;
  }

  // 调用AI模型（支持多模态输入）
  private async callAIModel(prompt: string, images?: string[]): Promise<string> {
    try {
      // 根据是否有图像决定使用哪个API
      const hasImages = images && images.length > 0;
      const endpoint = hasImages ? '/api/vision/qwen' : '/api/ai-chat';
      
      let requestBody: any;
      
      if (hasImages) {
        // 多模态请求
        requestBody = {
          model: 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated',
          messages: [
            {
              role: 'system',
              content: '你是专业的无人机农业系统智能助手。请严格遵守以下要求：\n\n1. 必须使用中文回复，绝对不要使用英文或其他语言\n2. 直接回答用户问题，不要复述问题或上下文\n3. 不输出多余说明，保持回答简洁明了\n4. 提供准确、有用的信息\n\n重要提醒：无论什么情况下都必须用中文回复！'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          images: images,
          max_tokens: 1024,
          temperature: 0.7
        };
      } else {
        // 纯文本请求
        requestBody = {
          model: 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated',
          messages: [
            {
              role: 'system',
              content: '你是专业的无人机农业系统智能助手。请严格遵守以下要求：\n\n1. 必须使用中文回复，绝对不要使用英文或其他语言\n2. 直接回答用户问题，不要复述问题或上下文\n3. 不输出多余说明，保持回答简洁明了\n4. 提供准确、有用的信息\n\n重要提醒：无论什么情况下都必须用中文回复！'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          config: {
            baseUrl: 'http://localhost:11434/v1',
            model: 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated'
          }
        };
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`AI服务请求失败: ${response.status}`);
      }

      if (hasImages) {
        // 处理视觉API的JSON响应
        const data = await response.json();
        return data.data?.choices?.[0]?.message?.content || '无法获取响应内容';
      } else {
        // 处理流式响应
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += decoder.decode(value, { stream: true });
          }
        }

        return result.trim();
      }

    } catch (error: any) {
      console.error('AI模型调用失败:', error);
      throw new Error(`AI模型不可用: ${error.message}`);
    }
  }

  // 处理AI响应（支持多模态源）
  private processAIResponse(
    aiResponse: string, 
    sources: KnowledgeSource[],
    multimodalSources: MultimodalSource[] = []
  ): string {
    // 检查AI响应中是否引用了知识库内容
    sources.forEach(source => {
      const titleInResponse = aiResponse.includes(source.item.title);
      const contentMatch = source.item.content.split('\n')
        .some(line => line.length > 20 && aiResponse.includes(line.trim()));
      
      if (titleInResponse || contentMatch) {
        source.usedInAnswer = true;
      }
    });

    // 检查是否使用了多模态信息
    multimodalSources.forEach(source => {
      // 简单检查是否在回答中提到了图像相关内容
      const hasImageReference = aiResponse.includes('图像') || 
                               aiResponse.includes('图片') ||
                               aiResponse.includes('视觉') ||
                               source.content.split(' ').some(word => 
                                 word.length > 3 && aiResponse.includes(word)
                               );
      if (hasImageReference) {
        // 没有直接的usedInAnswer字段，但可以通过其他方式记录
      }
    });

    // 确保回答格式良好
    let processedAnswer = aiResponse;

    // 如果回答太短，添加提醒
    if (processedAnswer.length < 50) {
      processedAnswer += '\n\n💡 如需更详细的信息，请提供更具体的问题描述。';
    }

    // 如果使用了知识库，添加来源说明
    const usedSources = sources.filter(s => s.usedInAnswer);
    if (usedSources.length > 0) {
      processedAnswer += '\n\n---\n📚 **参考来源**:\n';
      usedSources.forEach((source, index) => {
        processedAnswer += `${index + 1}. ${source.item.title} (${source.item.category})\n`;
      });
    }

    // 如枟使用了多模态数据，添加说明
    if (multimodalSources.length > 0) {
      const imageCount = multimodalSources.filter(s => s.type === 'image').length;
      if (imageCount > 0) {
        processedAnswer += `\n\n🖼️ **多模态分析**: 本回答结合了 ${imageCount} 张图像的视觉分析结果`;
      }
    }

    return processedAnswer;
  }

  // 评估答案质量（增强版本）
  private evaluateAnswerQuality(
    answer: string, 
    query: string, 
    sources: KnowledgeSource[],
    baseConfidence: number,
    domainSpecific: boolean = false
  ): number {
    let confidence = baseConfidence;

    // 答案长度评估
    if (answer.length > 100) confidence += 0.1;
    if (answer.length > 300) confidence += 0.1;
    if (answer.length > 600) confidence += 0.05; // 详细答案加分

    // 知识库使用评估
    const usedSources = sources.filter(s => s.usedInAnswer);
    if (usedSources.length > 0) {
      confidence += 0.2;
      if (usedSources.length > 1) confidence += 0.1;
      if (usedSources.length > 2) confidence += 0.05; // 多源交叉验证
    }

    // 领域专业性加分
    if (domainSpecific) {
      confidence += 0.15;
      console.log('🎯 领域专业知识加分');
    }

    // 结构化程度评估
    const hasListItems = /[•\-\*]\s/.test(answer) || /\d+\.\s/.test(answer);
    const hasHeadings = /^#+\s/m.test(answer) || /\*\*.*?\*\*/.test(answer);
    const hasEmojis = /[🌀-�￿]/.test(answer); // emoji使用
    
    if (hasListItems) confidence += 0.05;
    if (hasHeadings) confidence += 0.05;
    if (hasEmojis) confidence += 0.03; // 可读性加分

    // 专业术语评估
    const technicalTerms = [
      '无人机', '检测', '算法', '系统', '配置', '优化', '分析',
      '草莓', '成熟度', '农业', '作物', '植物', 'AI', '模型'
    ];
    const termCount = technicalTerms.filter(term => answer.includes(term)).length;
    confidence += Math.min(0.1, termCount * 0.02);

    // 安全提示评估（如果涉及安全相关内容）
    const safetyKeywords = ['安全', '注意', '警告', '小心', '禁止', '避免'];
    const hasSafetyContent = safetyKeywords.some(keyword => 
      query.includes(keyword) || answer.includes(keyword)
    );
    if (hasSafetyContent && answer.includes('安全')) {
      confidence += 0.08; // 安全意识加分
    }

    // 具体性评估（是否提供具体步骤或参数）
    const hasSpecificInstructions = /\d+[\.\uff1a\uff09]/.test(answer) || // 数字步骤
                                  /参数|设置|配置|步骤/.test(answer);
    if (hasSpecificInstructions) {
      confidence += 0.06;
    }

    // 置信度上下限控制
    return Math.min(0.98, Math.max(0.1, confidence));
  }

  // 记录问答历史
  private recordQAHistory(query: string, response: QAResponse): void {
    const historyItem: QAHistory = {
      id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      query,
      answer: response.answer,
      timestamp: Date.now(),
      sources: response.sources,
      confidence: response.confidence
    };

    this.qaHistory.push(historyItem);

    // 保持历史记录数量限制
    if (this.qaHistory.length > this.MAX_HISTORY) {
      this.qaHistory = this.qaHistory.slice(-this.MAX_HISTORY);
    }

    // 保存到本地存储
    this.saveHistoryToStorage();
  }

  // 检查是否有近期添加的知识
  private hasRecentlyAddedKnowledge(): boolean {
    try {
      const allKnowledge = knowledgeBaseManager.getAllKnowledge();
      const fiveMinutesAgo = Date.now() - 300000; // 5分钟
      
      return allKnowledge.some(item => 
        item.source === 'user_input' && item.createdAt > fiveMinutesAgo
      );
    } catch (error) {
      return false;
    }
  }

  // 生成缓存键
  private generateCacheKey(request: QARequest): string {
    return JSON.stringify({
      query: request.query,
      useKnowledge: request.useKnowledge,
      maxKnowledgeItems: request.maxKnowledgeItems,
      context: request.context
    });
  }

  // 保存历史到本地存储
  private saveHistoryToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('qaHistory', JSON.stringify(this.qaHistory));
      }
    } catch (error) {
      console.warn('保存问答历史失败:', error);
    }
  }

  // 从本地存储加载历史
  public loadHistoryFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('qaHistory');
        if (stored) {
          this.qaHistory = JSON.parse(stored);
          console.log('📜 加载了', this.qaHistory.length, '条问答历史');
        }
      }
    } catch (error) {
      console.warn('加载问答历史失败:', error);
    }
  }

  // 获取问答历史
  public getHistory(limit?: number): QAHistory[] {
    const history = [...this.qaHistory].reverse(); // 最新的在前
    return limit ? history.slice(0, limit) : history;
  }

  // 添加用户反馈
  public addUserFeedback(historyId: string, feedback: 'helpful' | 'not_helpful' | 'partially_helpful'): boolean {
    const historyItem = this.qaHistory.find(item => item.id === historyId);
    if (historyItem) {
      historyItem.userFeedback = feedback;
      this.saveHistoryToStorage();
      console.log('👍 已记录用户反馈:', feedback);
      return true;
    }
    return false;
  }

  // 获取统计信息
  public getStats(): {
    totalQuestions: number;
    avgConfidence: number;
    knowledgeUsageRate: number;
    userFeedback: Record<string, number>;
  } {
    const total = this.qaHistory.length;
    const avgConfidence = total > 0 
      ? this.qaHistory.reduce((sum, item) => sum + item.confidence, 0) / total 
      : 0;
    
    const knowledgeUsed = this.qaHistory.filter(item => item.sources.length > 0).length;
    const knowledgeUsageRate = total > 0 ? knowledgeUsed / total : 0;

    const userFeedback: Record<string, number> = {
      helpful: 0,
      not_helpful: 0,
      partially_helpful: 0
    };

    this.qaHistory.forEach(item => {
      if (item.userFeedback) {
        userFeedback[item.userFeedback]++;
      }
    });

    return {
      totalQuestions: total,
      avgConfidence,
      knowledgeUsageRate,
      userFeedback
    };
  }

  // 清除缓存
  public clearCache(): void {
    this.responseCache.clear();
    console.log('🧹 已清除问答缓存');
  }

  // 智能问答建议
  public suggestQuestions(): string[] {
    const commonQuestions = [
      '无人机连接失败怎么办？',
      '如何提高草莓检测精度？',
      'QR码检测的最佳距离是多少？',
      '系统运行缓慢如何优化？',
      '如何配置AI模型？',
      '电池电量低时应该怎么处理？',
      '视频流中断如何解决？',
      '检测结果不准确的原因是什么？',
      '如何备份系统设置？',
      '无人机信号强度弱怎么改善？'
    ];

    // 可以基于历史记录和知识库内容生成更智能的建议
    return commonQuestions;
  }
}

// 导出单例实例
export const knowledgeEnhancedQA = KnowledgeEnhancedQA.getInstance();