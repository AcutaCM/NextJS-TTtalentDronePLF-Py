// AI知识生成器 - 自动从对话中提取并生成知识条目
export interface GeneratedKnowledge {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number; // 0-1的置信度
  source: 'ai_generated';
  extractedFrom: string; // 来源消息
}

export interface KnowledgeGenerationRequest {
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: string;
  domain?: string; // 无人机、农业等领域
}

export interface KnowledgeGenerationResponse {
  success: boolean;
  knowledge?: GeneratedKnowledge[];
  reason?: string;
  error?: string;
}

export class AIKnowledgeGenerator {
  private static instance: AIKnowledgeGenerator;
  private lastGenerationTime: number = 0;
  private readonly MIN_GENERATION_INTERVAL = 30000; // 30秒最小间隔
  private readonly MIN_CONFIDENCE = 0.6; // 最小置信度阈值

  private constructor() {}

  public static getInstance(): AIKnowledgeGenerator {
    if (!AIKnowledgeGenerator.instance) {
      AIKnowledgeGenerator.instance = new AIKnowledgeGenerator();
    }
    return AIKnowledgeGenerator.instance;
  }

  // 主要的知识生成功能
  public async generateKnowledgeFromConversation(
    request: KnowledgeGenerationRequest
  ): Promise<KnowledgeGenerationResponse> {
    const now = Date.now();
    
    // 频率限制检查
    if (now - this.lastGenerationTime < this.MIN_GENERATION_INTERVAL) {
      return {
        success: false,
        reason: 'Generation too frequent'
      };
    }

    // 检查对话是否包含有价值的知识
    if (!this.shouldGenerateKnowledge(request.conversation)) {
      return {
        success: false,
        reason: 'No valuable knowledge detected in conversation'
      };
    }

    try {
      this.lastGenerationTime = now;
      
      // 首先尝试基于规则的知识提取（快速且可靠）
      const ruleBasedKnowledge = this.extractKnowledgeByRules(request);
      
      if (ruleBasedKnowledge.length > 0) {
        console.log('✅ 基于规则提取到知识:', ruleBasedKnowledge.length, '条');
        return {
          success: true,
          knowledge: ruleBasedKnowledge
        };
      }
      
      // 如果规则提取没有结果，尝试AI分析
      console.log('🤖 尝试AI知识提取...');
      const aiKnowledge = await this.extractKnowledgeByAI(request);
      
      if (aiKnowledge.length > 0) {
        console.log('✨ AI提取到知识:', aiKnowledge.length, '条');
        return {
          success: true,
          knowledge: aiKnowledge
        };
      }
      
      return {
        success: false,
        reason: 'No valuable knowledge extracted'
      };
      
    } catch (error: any) {
      console.error('❌ AI知识生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 基于规则的知识提取（快速且可靠）
  private extractKnowledgeByRules(request: KnowledgeGenerationRequest): GeneratedKnowledge[] {
    const knowledge: GeneratedKnowledge[] = [];
    const conversation = request.conversation;
    
    // 分析最近的几轮对话
    const recentMessages = conversation.slice(-6); // 最近3轮对话
    
    for (let i = 0; i < recentMessages.length - 1; i += 2) {
      const userMessage = recentMessages[i];
      const assistantMessage = recentMessages[i + 1];
      
      if (!userMessage || !assistantMessage || userMessage.role !== 'user' || assistantMessage.role !== 'assistant') {
        continue;
      }
      
      const userText = userMessage.content.toLowerCase();
      const assistantText = assistantMessage.content;
      
      // 检测问题-解答模式
      if (this.isQuestionAnswerPattern(userText, assistantText)) {
        const extractedKnowledge = this.extractFromQA(userMessage.content, assistantText);
        if (extractedKnowledge) {
          knowledge.push({
            ...extractedKnowledge,
            source: 'ai_generated',
            extractedFrom: `用户问题: ${userMessage.content.substring(0, 50)}...`,
            confidence: 0.8
          });
        }
      }
      
      // 检测错误-解决方案模式
      if (this.isErrorSolutionPattern(userText, assistantText)) {
        const extractedKnowledge = this.extractFromErrorSolution(userMessage.content, assistantText);
        if (extractedKnowledge) {
          knowledge.push({
            ...extractedKnowledge,
            source: 'ai_generated',
            extractedFrom: `错误报告: ${userMessage.content.substring(0, 50)}...`,
            confidence: 0.85
          });
        }
      }
      
      // 检测操作-指导模式
      if (this.isOperationGuidePattern(userText, assistantText)) {
        const extractedKnowledge = this.extractFromOperationGuide(userMessage.content, assistantText);
        if (extractedKnowledge) {
          knowledge.push({
            ...extractedKnowledge,
            source: 'ai_generated',
            extractedFrom: `操作请求: ${userMessage.content.substring(0, 50)}...`,
            confidence: 0.75
          });
        }
      }
    }
    
    return knowledge.filter(k => k.confidence >= this.MIN_CONFIDENCE);
  }

  // 检测是否是问答模式
  private isQuestionAnswerPattern(userText: string, assistantText: string): boolean {
    const questionWords = ['怎么', '如何', '为什么', '什么', '哪里', '哪个', '怎样', '是否', '能否', '可以', '？', '?'];
    const hasQuestion = questionWords.some(word => userText.includes(word));
    
    const hasSubstantialAnswer = assistantText.length > 50 && 
      !assistantText.includes('我不知道') && 
      !assistantText.includes('无法回答');
    
    return hasQuestion && hasSubstantialAnswer;
  }

  // 检测是否是错误-解决方案模式
  private isErrorSolutionPattern(userText: string, assistantText: string): boolean {
    const errorKeywords = ['错误', '失败', '问题', '不工作', '无法', '异常', '报错', '故障', 'error', 'fail', 'bug'];
    const solutionKeywords = ['解决', '修复', '尝试', '检查', '确认', '重启', '配置', '步骤'];
    
    const hasError = errorKeywords.some(word => userText.includes(word));
    const hasSolution = solutionKeywords.some(word => assistantText.includes(word)) && assistantText.length > 100;
    
    return hasError && hasSolution;
  }

  // 检测是否是操作指导模式
  private isOperationGuidePattern(userText: string, assistantText: string): boolean {
    const operationKeywords = ['启动', '开始', '设置', '配置', '安装', '连接', '运行', '执行', '操作'];
    const guideKeywords = ['步骤', '首先', '然后', '接下来', '最后', '注意', '确保'];
    
    const hasOperation = operationKeywords.some(word => userText.includes(word));
    const hasGuide = guideKeywords.some(word => assistantText.includes(word)) && assistantText.length > 80;
    
    return hasOperation && hasGuide;
  }

  // 从问答中提取知识
  private extractFromQA(question: string, answer: string): Omit<GeneratedKnowledge, 'source' | 'extractedFrom' | 'confidence'> | null {
    // 生成标题
    let title = this.generateTitleFromQuestion(question);
    if (!title) return null;
    
    // 确定分类
    const category = this.categorizeContent(question + ' ' + answer);
    
    // 提取标签
    const tags = this.extractTags(question + ' ' + answer);
    
    // 格式化内容
    const content = this.formatKnowledgeContent(question, answer, 'qa');
    
    return { title, content, category, tags };
  }

  // 从错误解决方案中提取知识
  private extractFromErrorSolution(errorDesc: string, solution: string): Omit<GeneratedKnowledge, 'source' | 'extractedFrom' | 'confidence'> | null {
    // 生成标题
    let title = this.generateTitleFromError(errorDesc);
    if (!title) return null;
    
    const category = '故障排除';
    const tags = this.extractTags(errorDesc + ' ' + solution);
    const content = this.formatKnowledgeContent(errorDesc, solution, 'error_solution');
    
    return { title, content, category, tags };
  }

  // 从操作指导中提取知识
  private extractFromOperationGuide(operation: string, guide: string): Omit<GeneratedKnowledge, 'source' | 'extractedFrom' | 'confidence'> | null {
    let title = this.generateTitleFromOperation(operation);
    if (!title) return null;
    
    const category = this.categorizeContent(operation + ' ' + guide);
    const tags = this.extractTags(operation + ' ' + guide);
    const content = this.formatKnowledgeContent(operation, guide, 'operation_guide');
    
    return { title, content, category, tags };
  }

  // 生成标题的辅助函数
  private generateTitleFromQuestion(question: string): string {
    // 清理问题文本
    let cleanQuestion = question.replace(/[？?]/g, '').trim();
    
    // 常见问题模式匹配
    const patterns = [
      { regex: /如何(.+)/, template: '$1方法' },
      { regex: /怎么(.+)/, template: '$1步骤' },
      { regex: /(.+)是什么/, template: '$1介绍' },
      { regex: /为什么(.+)/, template: '$1原因分析' },
      { regex: /(.+)怎样/, template: '$1操作指南' }
    ];
    
    for (const pattern of patterns) {
      const match = cleanQuestion.match(pattern.regex);
      if (match) {
        return pattern.template.replace('$1', match[1].trim());
      }
    }
    
    // 如果没有匹配到模式，生成通用标题
    if (cleanQuestion.length > 5 && cleanQuestion.length < 50) {
      return cleanQuestion + '解答';
    }
    
    return '';
  }

  private generateTitleFromError(errorDesc: string): string {
    // 提取关键词
    const keywords = this.extractKeywords(errorDesc);
    if (keywords.length > 0) {
      return `${keywords[0]}故障解决方案`;
    }
    return '常见故障解决方案';
  }

  private generateTitleFromOperation(operation: string): string {
    const keywords = this.extractKeywords(operation);
    if (keywords.length > 0) {
      return `${keywords[0]}操作指南`;
    }
    return '操作指南';
  }

  // 内容分类
  private categorizeContent(text: string): string {
    const categories = [
      { keywords: ['连接', '网络', '通信', '信号'], category: '设备连接' },
      { keywords: ['检测', '识别', '算法', '模型'], category: '检测算法' },
      { keywords: ['AI', '智能', '机器学习', '配置'], category: 'AI配置' },
      { keywords: ['监控', '状态', '系统', '性能'], category: '系统监控' },
      { keywords: ['错误', '故障', '问题', '修复'], category: '故障排除' },
      { keywords: ['无人机', 'drone', '飞行', '航拍'], category: '设备操作' }
    ];
    
    for (const cat of categories) {
      if (cat.keywords.some(keyword => text.toLowerCase().includes(keyword))) {
        return cat.category;
      }
    }
    
    return '通用知识';
  }

  // 提取标签
  private extractTags(text: string): string[] {
    const tagMap = {
      '无人机': ['无人机', 'drone', 'uav'],
      '连接': ['连接', '网络', '通信'],
      '检测': ['检测', '识别', '算法'],
      'AI': ['AI', '人工智能', '机器学习'],
      '配置': ['配置', '设置', '参数'],
      '故障': ['故障', '错误', '问题'],
      '操作': ['操作', '使用', '控制']
    };
    
    const tags: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const [tag, keywords] of Object.entries(tagMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        tags.push(tag);
      }
    }
    
    return tags.slice(0, 5); // 最多5个标签
  }

  // 提取关键词
  private extractKeywords(text: string): string[] {
    const commonWords = ['的', '是', '在', '有', '和', '与', '或', '但', '而', '了', '也', '就', '都', '要', '可以', '能够', '这', '那', '什么', '如何', '怎么', '为什么'];
    const words = text.split(/[\s，。！？、]+/).filter(word => 
      word.length > 1 && !commonWords.includes(word)
    );
    return words.slice(0, 3);
  }

  // 格式化知识内容
  private formatKnowledgeContent(input: string, output: string, type: 'qa' | 'error_solution' | 'operation_guide'): string {
    switch (type) {
      case 'qa':
        return `## 问题描述\n\n${input}\n\n## 解答\n\n${output}`;
      case 'error_solution':
        return `## 问题现象\n\n${input}\n\n## 解决方案\n\n${output}`;
      case 'operation_guide':
        return `## 操作需求\n\n${input}\n\n## 操作步骤\n\n${output}`;
      default:
        return output;
    }
  }

  // 使用AI进行知识提取（备用方案）
  private async extractKnowledgeByAI(request: KnowledgeGenerationRequest): Promise<GeneratedKnowledge[]> {
    try {
      const prompt = this.buildKnowledgeExtractionPrompt(request);
      
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'redule26/huihui_ai_qwen2.5-vl-7b-abliterated',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的知识提取专家，专门从对话中识别并提取有价值的知识条目。'
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
        })
      });

      if (!response.ok) {
        throw new Error(`AI服务请求失败: ${response.status}`);
      }

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

      return this.parseAIKnowledgeResponse(result.trim());
      
    } catch (error) {
      console.error('AI知识提取失败:', error);
      return [];
    }
  }

  // 构建AI提取提示词
  private buildKnowledgeExtractionPrompt(request: KnowledgeGenerationRequest): string {
    const conversationText = request.conversation
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
      .join('\n\n');

    return `请分析以下对话，识别其中有价值的知识点并提取为结构化的知识条目。

对话内容：
${conversationText}

请按以下JSON格式返回提取到的知识：
{
  "knowledge": [
    {
      "title": "知识标题（简洁明了）",
      "content": "详细的知识内容（包含问题描述和解答）",
      "category": "知识分类（从以下选择：设备连接、检测算法、AI配置、系统监控、故障排除、通用知识）",
      "tags": ["相关标签数组"],
      "confidence": 0.85
    }
  ]
}

提取规则：
1. 只提取有实用价值的知识点
2. 确保知识内容完整且准确
3. 标题要简洁明了，便于搜索
4. 置信度范围0.6-1.0，低于0.6的不要提取
5. 如果没有有价值的知识，返回空数组

请仅返回JSON格式的结果：`;
  }

  // 解析AI响应
  private parseAIKnowledgeResponse(aiResponse: string): GeneratedKnowledge[] {
    try {
      // 尝试提取JSON
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.knowledge || !Array.isArray(parsed.knowledge)) {
        return [];
      }

      return parsed.knowledge
        .filter((k: any) => k.confidence >= this.MIN_CONFIDENCE)
        .map((k: any) => ({
          title: k.title || '',
          content: k.content || '',
          category: k.category || '通用知识',
          tags: Array.isArray(k.tags) ? k.tags : [],
          confidence: k.confidence || 0.6,
          source: 'ai_generated' as const,
          extractedFrom: 'AI分析对话内容'
        }));

    } catch (error) {
      console.error('解析AI知识响应失败:', error);
      return [];
    }
  }

  // 判断是否应该生成知识
  private shouldGenerateKnowledge(conversation: Array<{ role: 'user' | 'assistant'; content: string }>): boolean {
    if (conversation.length < 2) return false;
    
    const recentMessages = conversation.slice(-4); // 检查最近2轮对话
    const totalLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    
    // 对话内容太短，不值得提取知识
    if (totalLength < 100) return false;
    
    // 检查是否包含有价值的关键词
    const valuableKeywords = [
      '问题', '解决', '方法', '步骤', '配置', '设置', '错误', '故障',
      '如何', '怎么', '为什么', '原因', '注意', '建议', '操作'
    ];
    
    const conversationText = recentMessages.map(m => m.content).join(' ').toLowerCase();
    const hasValuableContent = valuableKeywords.some(keyword => 
      conversationText.includes(keyword)
    );
    
    return hasValuableContent;
  }
}

// 导出单例实例
export const aiKnowledgeGenerator = AIKnowledgeGenerator.getInstance();