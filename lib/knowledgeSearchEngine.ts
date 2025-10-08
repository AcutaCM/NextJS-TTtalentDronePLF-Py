// 知识库搜索引擎
// 支持语义搜索、关键词匹配、分类筛选等多种检索方式

import { 
  KnowledgeItem, 
  SearchResult, 
  KnowledgeQuery, 
  knowledgeBaseManager 
} from './knowledgeBase';

// 搜索选项接口
export interface SearchOptions {
  useSemanticSearch: boolean; // 是否使用语义搜索
  useKeywordSearch: boolean;  // 是否使用关键词搜索
  useFuzzySearch: boolean;    // 是否使用模糊搜索
  combineResults: boolean;    // 是否合并多种搜索结果
  boostFactors: {            // 权重因子
    title: number;           // 标题匹配权重
    content: number;         // 内容匹配权重
    tags: number;           // 标签匹配权重
    category: number;       // 分类匹配权重
    semantic: number;       // 语义相似度权重
  };
}

// 默认搜索选项
const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  useSemanticSearch: true,
  useKeywordSearch: true,
  useFuzzySearch: true,
  combineResults: true,
  boostFactors: {
    title: 2.0,
    content: 1.0,
    tags: 1.5,
    category: 1.2,
    semantic: 1.8
  }
};

// 搜索结果类型
export interface DetailedSearchResult extends SearchResult {
  matchReasons: string[];      // 匹配原因
  semanticScore?: number;      // 语义相似度分数
  keywordScore?: number;       // 关键词匹配分数
  titleMatch?: boolean;        // 标题是否匹配
  categoryMatch?: boolean;     // 分类是否匹配
  tagMatches?: string[];       // 匹配的标签
}

// 知识库搜索引擎类
export class KnowledgeSearchEngine {
  private static instance: KnowledgeSearchEngine;
  private searchHistory: Array<{ query: string; timestamp: number; resultCount: number }> = [];
  private searchCache: Map<string, DetailedSearchResult[]> = new Map();
  private readonly CACHE_TTL = 300000; // 5分钟缓存过期时间

  private constructor() {}

  public static getInstance(): KnowledgeSearchEngine {
    if (!KnowledgeSearchEngine.instance) {
      KnowledgeSearchEngine.instance = new KnowledgeSearchEngine();
    }
    return KnowledgeSearchEngine.instance;
  }

  // 主要搜索方法
  public async search(
    query: KnowledgeQuery, 
    options: Partial<SearchOptions> = {}
  ): Promise<DetailedSearchResult[]> {
    const searchOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options };
    const cacheKey = this.generateCacheKey(query, searchOptions);

    // 检查缓存
    const cachedResults = this.searchCache.get(cacheKey);
    if (cachedResults) {
      console.log('🎯 使用搜索缓存结果');
      return cachedResults;
    }

    console.log('🔍 开始知识库搜索:', query.query);

    try {
      let allResults: DetailedSearchResult[] = [];

      // 语义搜索
      if (searchOptions.useSemanticSearch) {
        const semanticResults = await this.semanticSearch(query, searchOptions);
        allResults = this.mergeResults(allResults, semanticResults);
        console.log(`📊 语义搜索找到 ${semanticResults.length} 个结果`);
      }

      // 关键词搜索
      if (searchOptions.useKeywordSearch) {
        const keywordResults = await this.keywordSearch(query, searchOptions);
        allResults = this.mergeResults(allResults, keywordResults);
        console.log(`🔑 关键词搜索找到 ${keywordResults.length} 个结果`);
      }

      // 应用过滤器
      allResults = this.applyFilters(allResults, query);

      // 排序和限制结果数量
      allResults = this.rankResults(allResults, searchOptions);
      
      if (query.limit) {
        allResults = allResults.slice(0, query.limit);
      }

      // 缓存结果
      this.searchCache.set(cacheKey, allResults);
      setTimeout(() => this.searchCache.delete(cacheKey), this.CACHE_TTL);

      // 记录搜索历史
      this.recordSearch(query.query, allResults.length);

      console.log(`✅ 搜索完成，共找到 ${allResults.length} 个相关结果`);
      return allResults;

    } catch (error) {
      console.error('❌ 知识库搜索失败:', error);
      return [];
    }
  }

  // 语义搜索
  private async semanticSearch(
    query: KnowledgeQuery, 
    options: SearchOptions
  ): Promise<DetailedSearchResult[]> {
    const results: DetailedSearchResult[] = [];
    const queryEmbedding = await this.generateQueryEmbedding(query.query);
    
    if (!queryEmbedding) {
      console.warn('⚠️ 无法生成查询向量，跳过语义搜索');
      return results;
    }

    const allKnowledge = knowledgeBaseManager.getAllKnowledge();
    
    for (const item of allKnowledge) {
      if (!item.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);
      
      if (similarity > (query.threshold || 0.1)) {
        const highlights = this.extractHighlights(item.content, query.query, 3);
        
        results.push({
          item,
          score: similarity * options.boostFactors.semantic,
          highlights,
          matchReasons: ['语义相似'],
          semanticScore: similarity
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // 关键词搜索
  private async keywordSearch(
    query: KnowledgeQuery, 
    options: SearchOptions
  ): Promise<DetailedSearchResult[]> {
    const results: DetailedSearchResult[] = [];
    const searchTerms = this.extractSearchTerms(query.query);
    const allKnowledge = knowledgeBaseManager.getAllKnowledge();

    for (const item of allKnowledge) {
      let totalScore = 0;
      const matchReasons: string[] = [];
      let titleMatch = false;
      let categoryMatch = false;
      const tagMatches: string[] = [];

      // 标题匹配
      const titleScore = this.calculateTextScore(item.title, searchTerms);
      if (titleScore > 0) {
        totalScore += titleScore * options.boostFactors.title;
        matchReasons.push('标题匹配');
        titleMatch = true;
      }

      // 内容匹配
      const contentScore = this.calculateTextScore(item.content, searchTerms);
      if (contentScore > 0) {
        totalScore += contentScore * options.boostFactors.content;
        matchReasons.push('内容匹配');
      }

      // 标签匹配
      for (const tag of item.tags) {
        const tagScore = this.calculateTextScore(tag, searchTerms);
        if (tagScore > 0) {
          totalScore += tagScore * options.boostFactors.tags;
          tagMatches.push(tag);
        }
      }
      if (tagMatches.length > 0) {
        matchReasons.push('标签匹配');
      }

      // 分类匹配
      const categoryScore = this.calculateTextScore(item.category, searchTerms);
      if (categoryScore > 0) {
        totalScore += categoryScore * options.boostFactors.category;
        matchReasons.push('分类匹配');
        categoryMatch = true;
      }

      if (totalScore > 0) {
        const highlights = this.extractHighlights(item.content, query.query, 3);
        
        results.push({
          item,
          score: totalScore,
          highlights,
          matchReasons,
          keywordScore: totalScore,
          titleMatch,
          categoryMatch,
          tagMatches
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // 提取搜索词
  private extractSearchTerms(query: string): string[] {
    // 移除标点符号，分割成词
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 0);

    // 去重
    return Array.from(new Set(terms));
  }

  // 计算文本匹配分数
  private calculateTextScore(text: string, searchTerms: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    let matchCount = 0;

    for (const term of searchTerms) {
      if (lowerText.includes(term)) {
        // 完全匹配得分更高
        if (lowerText === term) {
          score += 10;
        } else if (lowerText.startsWith(term) || lowerText.endsWith(term)) {
          score += 5;
        } else {
          score += 2;
        }
        matchCount++;
      }
    }

    // 奖励匹配多个词的结果
    if (matchCount > 1) {
      score *= (1 + matchCount * 0.2);
    }

    return score;
  }

  // 提取高亮片段
  private extractHighlights(content: string, query: string, maxHighlights: number = 3): string[] {
    const highlights: string[] = [];
    const searchTerms = this.extractSearchTerms(query);
    const sentences = content.split(/[。！？.!?]/);

    for (const sentence of sentences) {
      if (highlights.length >= maxHighlights) break;

      const lowerSentence = sentence.toLowerCase();
      const hasMatch = searchTerms.some(term => lowerSentence.includes(term));

      if (hasMatch && sentence.trim().length > 10) {
        // 高亮关键词
        let highlightedSentence = sentence.trim();
        searchTerms.forEach(term => {
          const regex = new RegExp(`(${term})`, 'gi');
          highlightedSentence = highlightedSentence.replace(regex, '**$1**');
        });
        highlights.push(highlightedSentence);
      }
    }

    return highlights;
  }

  // 应用过滤器
  private applyFilters(results: DetailedSearchResult[], query: KnowledgeQuery): DetailedSearchResult[] {
    let filtered = results;

    // 分类过滤
    if (query.category) {
      filtered = filtered.filter(result => result.item.category === query.category);
    }

    // 类型过滤
    if (query.type) {
      filtered = filtered.filter(result => result.item.type === query.type);
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter(result => 
        query.tags!.some(tag => result.item.tags.includes(tag))
      );
    }

    // 相似度阈值过滤
    if (query.threshold) {
      filtered = filtered.filter(result => result.score >= query.threshold!);
    }

    return filtered;
  }

  // 合并多种搜索结果
  private mergeResults(
    existing: DetailedSearchResult[], 
    newResults: DetailedSearchResult[]
  ): DetailedSearchResult[] {
    const resultMap = new Map<string, DetailedSearchResult>();

    // 添加现有结果
    existing.forEach(result => {
      resultMap.set(result.item.id, result);
    });

    // 合并新结果
    newResults.forEach(newResult => {
      const existingResult = resultMap.get(newResult.item.id);
      if (existingResult) {
        // 合并分数和匹配原因
        existingResult.score = Math.max(existingResult.score, newResult.score);
        existingResult.matchReasons = Array.from(new Set([
          ...existingResult.matchReasons,
          ...newResult.matchReasons
        ]));
        
        // 保留最佳的高亮结果
        if (newResult.highlights.length > existingResult.highlights.length) {
          existingResult.highlights = newResult.highlights;
        }
        
        // 合并其他属性
        if (newResult.semanticScore) {
          existingResult.semanticScore = newResult.semanticScore;
        }
        if (newResult.keywordScore) {
          existingResult.keywordScore = newResult.keywordScore;
        }
      } else {
        resultMap.set(newResult.item.id, newResult);
      }
    });

    return Array.from(resultMap.values());
  }

  // 结果排序
  private rankResults(
    results: DetailedSearchResult[], 
    options: SearchOptions
  ): DetailedSearchResult[] {
    return results.sort((a, b) => {
      // 首先按总分数排序
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // 其次按匹配原因数量排序
      if (a.matchReasons.length !== b.matchReasons.length) {
        return b.matchReasons.length - a.matchReasons.length;
      }

      // 最后按更新时间排序
      return b.item.updatedAt - a.item.updatedAt;
    });
  }

  // 生成查询向量
  private async generateQueryEmbedding(query: string): Promise<number[] | null> {
    try {
      // 这里可以调用实际的embedding API
      // 现在使用简单向量化作为后备
      return this.simpleTextEmbedding(query);
    } catch (error) {
      console.warn('⚠️ 生成查询向量失败:', error);
      return null;
    }
  }

  // 简单文本向量化
  private simpleTextEmbedding(text: string): number[] {
    const features = new Array(128).fill(0);
    const normalizedText = text.toLowerCase();
    
    for (let i = 0; i < normalizedText.length; i++) {
      const charCode = normalizedText.charCodeAt(i);
      if (charCode < features.length) {
        features[charCode % features.length] += 1;
      }
    }
    
    const norm = Math.sqrt(features.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? features.map(f => f / norm) : features;
  }

  // 计算余弦相似度
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

  // 记录搜索历史
  private recordSearch(query: string, resultCount: number): void {
    this.searchHistory.push({
      query,
      timestamp: Date.now(),
      resultCount
    });

    // 只保留最近100条搜索记录
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100);
    }
  }

  // 生成缓存键
  private generateCacheKey(query: KnowledgeQuery, options: SearchOptions): string {
    return JSON.stringify({ query, options });
  }

  // 获取搜索历史
  public getSearchHistory(): Array<{ query: string; timestamp: number; resultCount: number }> {
    return [...this.searchHistory].reverse(); // 最新的在前
  }

  // 清除搜索缓存
  public clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 已清除搜索缓存');
  }

  // 获取热门搜索
  public getPopularSearches(limit: number = 10): Array<{ query: string; count: number }> {
    const queryCount = new Map<string, number>();
    
    this.searchHistory.forEach(search => {
      const count = queryCount.get(search.query) || 0;
      queryCount.set(search.query, count + 1);
    });

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // 智能建议搜索词
  public suggestQueries(partial: string): string[] {
    const suggestions = new Set<string>();
    const lowerPartial = partial.toLowerCase();

    // 从搜索历史中找建议
    this.searchHistory.forEach(search => {
      if (search.query.toLowerCase().includes(lowerPartial)) {
        suggestions.add(search.query);
      }
    });

    // 从知识库内容中找建议
    const allKnowledge = knowledgeBaseManager.getAllKnowledge();
    allKnowledge.forEach(item => {
      // 检查标题
      if (item.title.toLowerCase().includes(lowerPartial)) {
        suggestions.add(item.title);
      }
      
      // 检查标签
      item.tags.forEach(tag => {
        if (tag.toLowerCase().includes(lowerPartial)) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, 10);
  }
}

// 导出单例实例
export const knowledgeSearchEngine = KnowledgeSearchEngine.getInstance();