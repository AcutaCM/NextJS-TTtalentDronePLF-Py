import React, { useState, useEffect } from 'react';
import { 
  searchKnowledge, 
  KnowledgeSearchRequest,
  KnowledgeSearchResponse 
} from '../lib/knowledgeAPI';
import {
  Search,
  Filter,
  Clock,
  Tag,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Star
} from 'lucide-react';

interface KnowledgeSearchProps {
  onSelectResult?: (result: any) => void;
  initialQuery?: string;
  className?: string;
}

const KnowledgeSearch: React.FC<KnowledgeSearchProps> = ({ 
  onSelectResult, 
  initialQuery = '',
  className = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<KnowledgeSearchResponse['results']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [responseTime, setResponseTime] = useState(0);
  
  // 筛选选项
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
    loadSearchHistory();
  }, [initialQuery]);

  // 加载搜索历史
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('knowledgeSearchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.warn('加载搜索历史失败:', error);
    }
  };

  // 保存搜索历史
  const saveSearchHistory = (searchQuery: string) => {
    try {
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('knowledgeSearchHistory', JSON.stringify(newHistory));
    } catch (error) {
      console.warn('保存搜索历史失败:', error);
    }
  };

  // 执行搜索
  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const searchRequest: KnowledgeSearchRequest = {
        query: searchQuery,
        category: selectedCategory || undefined,
        type: selectedType || undefined,
        limit: 20,
        threshold: 0.1
      };

      console.log('🔍 开始知识库搜索:', searchRequest);
      
      const response = await searchKnowledge(searchRequest);
      
      if (response.success) {
        setResults(response.results);
        setTotal(response.total);
        setResponseTime(response.responseTime);
        saveSearchHistory(searchQuery);
        console.log(`✅ 搜索完成，找到 ${response.total} 个结果，耗时 ${response.responseTime}ms`);
      } else {
        throw new Error(response.error || '搜索失败');
      }
    } catch (err: any) {
      console.error('❌ 知识库搜索失败:', err);
      setError(err.message);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 清除搜索
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setError(null);
    setSelectedCategory('');
    setSelectedType('');
  };

  // 高亮搜索关键词
  const highlightText = (text: string, highlights: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    let highlightedText = text;
    highlights.forEach(highlight => {
      // 移除原有的Markdown高亮标记
      const cleanHighlight = highlight.replace(/\*\*(.*?)\*\*/g, '$1');
      const regex = new RegExp(`(${cleanHighlight})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-400/30 text-yellow-200">$1</mark>');
    });
    
    return highlightedText;
  };

  return (
    <div className={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-white ${className}`}>
      {/* 搜索头部 */}
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold">知识库搜索</h3>
        {total > 0 && (
          <span className="px-2 py-1 bg-purple-600/20 rounded text-sm">
            {total} 个结果
          </span>
        )}
        {responseTime > 0 && (
          <span className="text-xs text-white/60">
            {responseTime}ms
          </span>
        )}
      </div>

      {/* 搜索输入 */}
      <div className="mb-4">
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索知识库内容..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
            />
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
              >
                ×
              </button>
            )}
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 rounded-lg transition-colors flex items-center gap-1"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            搜索
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="筛选选项"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* 筛选器 */}
        {showFilters && (
          <div className="flex gap-2 mb-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-purple-500"
              title="选择分类"
            >
              <option value="">所有分类</option>
              <option value="设备连接">设备连接</option>
              <option value="检测算法">检测算法</option>
              <option value="AI配置">AI配置</option>
              <option value="系统监控">系统监控</option>
              <option value="常见问题">常见问题</option>
            </select>
            
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-purple-500"
              title="选择类型"
            >
              <option value="">所有类型</option>
              <option value="document">文档</option>
              <option value="faq">常见问题</option>
              <option value="technical">技术文档</option>
              <option value="troubleshooting">故障排除</option>
            </select>
          </div>
        )}

        {/* 搜索历史 */}
        {searchHistory.length > 0 && !query && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-white/60 mr-2">最近搜索:</span>
            {searchHistory.slice(0, 5).map((historyQuery, index) => (
              <button
                key={index}
                onClick={() => {
                  setQuery(historyQuery);
                  handleSearch(historyQuery);
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
              >
                {historyQuery}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/40 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-200">{error}</span>
        </div>
      )}

      {/* 搜索结果 */}
      {results.length > 0 && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={result.id}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors cursor-pointer"
              onClick={() => onSelectResult?.(result)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{result.title}</h4>
                    <span className="px-2 py-0.5 bg-blue-600/80 rounded text-xs">
                      {result.category}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-600/80 rounded text-xs">
                      {result.type}
                    </span>
                  </div>
                  
                  {/* 高亮的内容片段 */}
                  {result.highlights && result.highlights.length > 0 && (
                    <div className="mb-2">
                      {result.highlights.slice(0, 3).map((highlight, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-white/80 mb-1"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(highlight, [query])
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* 内容预览 */}
                  <p className="text-sm text-white/70 line-clamp-2">
                    {result.content.substring(0, 200)}
                    {result.content.length > 200 && '...'}
                  </p>
                  
                  {/* 标签和相关度 */}
                  <div className="flex items-center gap-2 mt-2 text-xs text-white/50">
                    {result.tags.length > 0 && (
                      <>
                        <Tag className="w-3 h-3" />
                        <span>{result.tags.slice(0, 3).join(', ')}</span>
                      </>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                      <Star className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400">
                        {(result.score * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {onSelectResult && (
                  <button 
                    className="p-1 hover:bg-white/20 rounded"
                    title="选择此知识条目"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-8 text-white/60">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div>未找到相关的知识条目</div>
          <div className="text-sm mt-1">尝试使用不同的关键词或调整筛选条件</div>
        </div>
      )}

      {/* 未搜索状态 */}
      {!loading && !error && results.length === 0 && !query && (
        <div className="text-center py-8 text-white/60">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div>输入关键词搜索知识库</div>
          <div className="text-sm mt-1">支持搜索标题、内容、标签等</div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeSearch;