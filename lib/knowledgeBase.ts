// 知识库核心管理系统
// 支持文档存储、向量化、语义检索和智能问答

// 知识条目接口
export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  source?: string; // 来源：manual, import, web等
  type: 'document' | 'faq' | 'technical' | 'manual' | 'troubleshooting';
  embedding?: number[]; // 向量表示
  metadata?: Record<string, any>;
}

// 检索结果接口
export interface SearchResult {
  item: KnowledgeItem;
  score: number; // 相似度分数
  highlights: string[]; // 高亮片段
}

// 知识库查询接口
export interface KnowledgeQuery {
  query: string;
  category?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  threshold?: number; // 相似度阈值
}

// 知识库统计信息
export interface KnowledgeStats {
  totalItems: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  lastUpdated: number;
}

// 知识库管理器类
export class KnowledgeBaseManager {
  private static instance: KnowledgeBaseManager;
  private knowledgeItems: Map<string, KnowledgeItem> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private vectorIndex: Array<{ id: string; embedding: number[] }> = [];
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): KnowledgeBaseManager {
    if (!KnowledgeBaseManager.instance) {
      KnowledgeBaseManager.instance = new KnowledgeBaseManager();
    }
    return KnowledgeBaseManager.instance;
  }

  // 初始化知识库
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 从本地存储加载知识库数据
      await this.loadFromStorage();
      
      // 如果没有数据，加载默认知识库
      if (this.knowledgeItems.size === 0) {
        await this.loadDefaultKnowledge();
      }

      this.isInitialized = true;
      console.log('✅ 知识库初始化完成，共加载', this.knowledgeItems.size, '条知识');
    } catch (error) {
      console.error('❌ 知识库初始化失败:', error);
      throw error;
    }
  }

  // 从本地存储加载数据
  private async loadFromStorage(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      const storedData = localStorage.getItem('knowledgeBase');
      if (!storedData) return;

      const data = JSON.parse(storedData);
      
      // 恢复知识条目
      if (data.items) {
        data.items.forEach((item: any) => {
          // 确保tags字段是数组
          const normalizedItem: KnowledgeItem = {
            ...item,
            tags: Array.isArray(item.tags) ? item.tags : []
          };
          this.knowledgeItems.set(normalizedItem.id, normalizedItem);
          this.updateIndices(normalizedItem);
        });
      }

      // 恢复向量索引
      if (data.vectorIndex) {
        this.vectorIndex = data.vectorIndex;
      }

      console.log('📚 从本地存储加载了', this.knowledgeItems.size, '条知识');
    } catch (error) {
      console.error('⚠️ 从本地存储加载知识库失败:', error);
    }
  }

  // 保存到本地存储
  private async saveToStorage(): Promise<void> {
    try {
      if (typeof window === 'undefined') return;

      const data = {
        items: Array.from(this.knowledgeItems.values()),
        vectorIndex: this.vectorIndex,
        lastSaved: Date.now()
      };

      localStorage.setItem('knowledgeBase', JSON.stringify(data));
      console.log('💾 知识库已保存到本地存储');
    } catch (error) {
      console.error('⚠️ 保存知识库到本地存储失败:', error);
    }
  }

  // 加载默认知识库
  private async loadDefaultKnowledge(): Promise<void> {
    const defaultKnowledge: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: '无人机连接问题',
        content: `无人机连接问题排查步骤：
1. 检查无人机电源是否开启
2. 确认WiFi连接是否正常
3. 检查无人机与设备距离（建议10米内）
4. 重启无人机和设备WiFi
5. 检查防火墙设置
6. 尝试重新配对设备

常见错误代码：
- ERR_NETWORK_TIMEOUT: 网络超时，检查信号强度
- ERR_AUTH_FAILED: 认证失败，重新配对
- ERR_DEVICE_NOT_FOUND: 设备未找到，检查无人机状态`,
        category: '设备连接',
        type: 'troubleshooting',
        tags: ['连接', '网络', '故障排除'],
        source: 'manual'
      },
      {
        title: '草莓成熟度检测原理',
        content: `草莓成熟度检测基于计算机视觉技术：

检测原理：
1. 颜色分析：通过HSV色彩空间分析红色饱和度
2. 形状识别：识别草莓的典型形状特征
3. 纹理分析：成熟草莓表面纹理特征
4. 大小评估：成熟草莓的尺寸范围

成熟度等级：
- 0级：完全未成熟（绿色）
- 1级：初步转色（绿红相间）
- 2级：半成熟（红色占50%以上）
- 3级：完全成熟（深红色）
- 4级：过熟（暗红色，可能有软化迹象）

最佳采收时机：2-3级成熟度`,
        category: '检测算法',
        type: 'technical',
        tags: ['草莓检测', '成熟度', '计算机视觉'],
        source: 'manual'
      },
      {
        title: 'QR码检测最佳实践',
        content: `QR码检测优化指南：

硬件要求：
- 摄像头分辨率：至少720p
- 光照条件：均匀光照，避免强光直射
- 距离控制：QR码占画面的10-50%

软件配置：
- 检测算法：使用多尺度检测
- 预处理：自动亮度调整和对比度增强
- 容错机制：支持轻微倾斜和部分遮挡

提高检测率的方法：
1. 保持QR码平整，避免弯曲
2. 确保充足且均匀的光照
3. 控制适当的检测距离
4. 避免背景干扰
5. 使用高对比度的QR码`,
        category: '检测算法',
        type: 'technical',
        tags: ['QR码', '检测优化', '最佳实践'],
        source: 'manual'
      },
      {
        title: 'AI模型配置指南',
        content: `本地AI模型配置和优化：

Ollama配置：
1. 安装Ollama服务
2. 下载模型：ollama pull redule26/huihui_ai_qwen2.5-vl-7b-abliterated
3. 启动服务：ollama serve
4. 验证服务：http://localhost:11434/v1

模型参数优化：
- temperature: 0.7 (创造性和准确性平衡)
- max_tokens: 1024 (足够的响应长度)
- top_p: 0.9 (多样性控制)

性能优化：
- 内存需求：至少8GB RAM
- GPU支持：推荐使用GPU加速
- 缓存策略：启用模型缓存
- 并发控制：限制同时请求数

故障排除：
- 端口占用：检查11434端口
- 内存不足：关闭其他程序
- 模型加载失败：重新下载模型`,
        category: 'AI配置',
        type: 'technical',
        tags: ['AI模型', 'Ollama', '配置'],
        source: 'manual'
      },
      {
        title: '系统性能监控',
        content: `系统性能监控和优化建议：

关键性能指标：
1. CPU使用率：建议保持在80%以下
2. 内存使用率：建议保持在85%以下
3. 网络延迟：无人机连接延迟应低于100ms
4. 处理帧率：视频处理保持15fps以上

性能优化策略：
- 检测频率：根据需要调整检测间隔
- 图像分辨率：平衡质量和性能
- 缓存策略：合理使用内存缓存
- 资源清理：及时释放未使用资源

预警机制：
- 温度过高：CPU/GPU温度监控
- 内存泄漏：长时间运行内存增长
- 网络异常：连接中断和重连
- 存储空间：磁盘空间不足预警`,
        category: '系统监控',
        type: 'technical',
        tags: ['性能监控', '优化', '预警'],
        source: 'manual'
      },
      {
        title: '常见问题解答',
        content: `无人机农业检测系统常见问题：

Q: 为什么检测结果不准确？
A: 1.检查光照条件是否适宜 2.确认摄像头焦距是否清晰 3.验证检测对象是否在有效范围内 4.检查AI模型是否正常加载

Q: 无人机连接频繁断开怎么办？
A: 1.检查信号强度和距离 2.确认电池电量充足 3.检查WiFi网络稳定性 4.重启设备和无人机

Q: 如何提高检测精度？
A: 1.优化光照条件 2.调整检测参数 3.更新AI模型 4.增加训练数据

Q: 系统运行缓慢如何解决？
A: 1.关闭不必要的程序 2.调整检测频率 3.降低视频分辨率 4.清理缓存文件

Q: 如何备份和恢复设置？
A: 系统设置自动保存在本地，可以通过导出/导入功能进行备份恢复`,
        category: '常见问题',
        type: 'faq',
        tags: ['FAQ', '问题解答', '故障排除'],
        source: 'manual'
      }
    ];

    for (const knowledge of defaultKnowledge) {
      await this.addKnowledge(knowledge);
    }

    console.log('📖 已加载默认知识库，共', defaultKnowledge.length, '条');
  }

  // 添加知识条目
  public async addKnowledge(knowledge: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const now = Date.now();
      const item: KnowledgeItem = {
        id: this.generateId(),
        ...knowledge,
        tags: Array.isArray(knowledge.tags) ? knowledge.tags : [], // 确保tags是数组
        createdAt: now,
        updatedAt: now
      };

      // 生成向量嵌入
      if (!item.embedding) {
        item.embedding = await this.generateEmbedding(item.title + ' ' + item.content);
      }

      this.knowledgeItems.set(item.id, item);
      this.updateIndices(item);
      
      // 更新向量索引
      if (item.embedding) {
        this.vectorIndex.push({ id: item.id, embedding: item.embedding });
      }

      await this.saveToStorage();
      
      console.log('✅ 知识条目已添加:', item.title);
      return item.id;
    } catch (error) {
      console.error('❌ 添加知识条目失败:', error);
      throw error;
    }
  }

  // 更新知识条目
  public async updateKnowledge(id: string, updates: Partial<KnowledgeItem>): Promise<boolean> {
    const item = this.knowledgeItems.get(id);
    if (!item) return false;

    // 先从索引中移除旧项
    this.removeFromIndices(item);

    const updatedItem: KnowledgeItem = {
      ...item,
      ...updates,
      tags: Array.isArray(updates.tags) ? updates.tags : (Array.isArray(item.tags) ? item.tags : []), // 确保tags是数组
      id, // 保持ID不变
      updatedAt: Date.now()
    };

    // 如果内容发生变化，重新生成向量
    if (updates.content && updates.content !== item.content) {
      updatedItem.embedding = await this.generateEmbedding(updates.content);
      
      // 更新向量索引
      const vectorIndex = this.vectorIndex.findIndex(v => v.id === id);
      if (vectorIndex >= 0 && updatedItem.embedding) {
        this.vectorIndex[vectorIndex] = { id, embedding: updatedItem.embedding };
      }
    }

    this.knowledgeItems.set(id, updatedItem);
    this.updateIndices(updatedItem);
    await this.saveToStorage();

    console.log('📝 已更新知识条目:', updatedItem.title);
    return true;
  }

  // 删除知识条目
  public async deleteKnowledge(id: string): Promise<boolean> {
    const item = this.knowledgeItems.get(id);
    if (!item) return false;

    this.knowledgeItems.delete(id);
    this.removeFromIndices(item);
    
    // 删除向量索引
    this.vectorIndex = this.vectorIndex.filter(v => v.id !== id);
    
    await this.saveToStorage();
    
    console.log('🗑️ 已删除知识条目:', item.title);
    return true;
  }

  // 更新索引
  private updateIndices(item: KnowledgeItem): void {
    // 更新分类索引
    if (!this.categoryIndex.has(item.category)) {
      this.categoryIndex.set(item.category, new Set());
    }
    this.categoryIndex.get(item.category)!.add(item.id);

    // 更新标签索引 - 添加容错处理
    const tags = Array.isArray(item.tags) ? item.tags : [];
    tags.forEach(tag => {
      if (tag && typeof tag === 'string') {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(item.id);
      }
    });
  }

  // 从索引中移除
  private removeFromIndices(item: KnowledgeItem): void {
    // 从分类索引移除
    this.categoryIndex.get(item.category)?.delete(item.id);
    
    // 从标签索引移除 - 添加容错处理
    const tags = Array.isArray(item.tags) ? item.tags : [];
    tags.forEach(tag => {
      if (tag && typeof tag === 'string') {
        this.tagIndex.get(tag)?.delete(item.id);
      }
    });
  }

  // 生成向量表示
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // 这里使用简单的TF-IDF向量化作为后备
      // 在实际应用中可以调用本地embedding API
      return this.simpleTextEmbedding(text);
    } catch (error) {
      console.warn('⚠️ 向量生成失败，使用简单向量化:', error);
      return this.simpleTextEmbedding(text);
    }
  }

  // 简单文本向量化（后备方案）
  private simpleTextEmbedding(text: string): number[] {
    // 简单的字符级别特征提取
    const features = new Array(128).fill(0);
    const normalizedText = text.toLowerCase();
    
    // 字符频率特征
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      if (charCode < features.length) {
        features[charCode % features.length] += 1;
      }
    }
    
    // 归一化
    const norm = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? features.map(f => f / norm) : features;
  }

  // 计算向量相似度
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // 生成ID
  private generateId(): string {
    return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取统计信息
  public getStats(): KnowledgeStats {
    const categories: Record<string, number> = {};
    const types: Record<string, number> = {};

    this.knowledgeItems.forEach(item => {
      categories[item.category] = (categories[item.category] || 0) + 1;
      types[item.type] = (types[item.type] || 0) + 1;
    });

    return {
      totalItems: this.knowledgeItems.size,
      categories,
      types,
      lastUpdated: Math.max(...Array.from(this.knowledgeItems.values()).map(item => item.updatedAt))
    };
  }

  // 获取所有知识条目
  public getAllKnowledge(): KnowledgeItem[] {
    return Array.from(this.knowledgeItems.values());
  }

  // 根据ID获取知识条目
  public getKnowledgeById(id: string): KnowledgeItem | undefined {
    return this.knowledgeItems.get(id);
  }

  // 获取分类列表
  public getCategories(): string[] {
    return Array.from(this.categoryIndex.keys());
  }

  // 获取标签列表
  public getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }
}

// 导出单例实例
export const knowledgeBaseManager = KnowledgeBaseManager.getInstance();