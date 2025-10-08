import React, { useState, useEffect } from 'react';
import { 
  knowledgeBaseManager, 
  KnowledgeItem, 
  KnowledgeStats 
} from '../lib/knowledgeBase';
import { 
  knowledgeSearchEngine, 
  DetailedSearchResult 
} from '../lib/knowledgeSearchEngine';
import KnowledgeImporter from './KnowledgeImporter';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Save,
  X,
  Tag,
  FileText,
  Filter,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  Book,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// 知识库管理界面组件
const KnowledgeBaseManager: React.FC = () => {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchResults, setSearchResults] = useState<DetailedSearchResult[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);

  // 编辑状态
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // 表单状态
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    type: 'document' as 'document' | 'faq' | 'technical' | 'manual' | 'troubleshooting',
    tags: [] as string[],
    source: 'manual'
  });

  // 初始化
  useEffect(() => {
    loadKnowledgeBase();
  }, []);

  // 加载知识库
  const loadKnowledgeBase = async () => {
    try {
      setLoading(true);
      await knowledgeBaseManager.initialize();
      const items = knowledgeBaseManager.getAllKnowledge();
      const statsData = knowledgeBaseManager.getStats();
      
      setKnowledgeItems(items);
      setStats(statsData);
      setSearchResults([]);
      
      console.log('📚 知识库管理界面加载完成，共', items.length, '条知识');
    } catch (error) {
      console.error('❌ 加载知识库失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 搜索知识库
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await knowledgeSearchEngine.search({
        query: searchQuery,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        type: selectedType !== 'all' ? selectedType : undefined,
        limit: 20
      });
      
      setSearchResults(results);
      console.log('🔍 搜索完成，找到', results.length, '个结果');
    } catch (error) {
      console.error('❌ 搜索失败:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: '',
      type: 'document',
      tags: [],
      source: 'manual'
    });
    setEditingItem(null);
    setIsCreating(false);
  };

  // 开始创建
  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  // 开始编辑
  const startEditing = (item: KnowledgeItem) => {
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      type: item.type,
      tags: [...item.tags],
      source: item.source || 'manual'
    });
    setEditingItem(item);
    setIsCreating(false);
  };

  // 保存知识条目
  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    try {
      if (editingItem) {
        // 更新现有条目
        await knowledgeBaseManager.updateKnowledge(editingItem.id, formData);
        console.log('✏️ 知识条目已更新:', formData.title);
      } else {
        // 创建新条目
        await knowledgeBaseManager.addKnowledge(formData);
        console.log('➕ 新知识条目已创建:', formData.title);
      }
      
      await loadKnowledgeBase();
      resetForm();
    } catch (error) {
      console.error('❌ 保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除知识条目
  const handleDelete = async (item: KnowledgeItem) => {
    if (!confirm(`确定要删除 "${item.title}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      await knowledgeBaseManager.deleteKnowledge(item.id);
      await loadKnowledgeBase();
      console.log('🗑️ 知识条目已删除:', item.title);
    } catch (error) {
      console.error('❌ 删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 添加标签
  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  // 移除标签
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 导出知识库
  const handleExport = () => {
    const data = {
      knowledge: knowledgeItems,
      stats,
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge_base_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取显示的条目列表
  const displayItems = searchResults.length > 0 ? searchResults.map(r => r.item) : knowledgeItems;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-white/70">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>加载知识库中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-lg p-4 text-white">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold">知识库管理</h2>
          {stats && (
            <span className="px-2 py-1 bg-purple-600/20 rounded text-sm">
              {stats.totalItems} 条知识
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="统计信息"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="导出知识库"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowImporter(!showImporter)}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="导入草莓知识库"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={loadKnowledgeBase}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={startCreating}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加知识
          </button>
        </div>
      </div>

      {/* 统计信息面板 */}
      {showStats && stats && (
        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
          <h3 className="font-medium mb-2">统计信息</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-white/60">总条数</div>
              <div className="text-lg font-semibold">{stats.totalItems}</div>
            </div>
            <div>
              <div className="text-white/60">分类数</div>
              <div className="text-lg font-semibold">{Object.keys(stats.categories).length}</div>
            </div>
            <div>
              <div className="text-white/60">最后更新</div>
              <div className="text-sm">{new Date(stats.lastUpdated).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-white/60">热门分类</div>
              <div className="text-sm">
                {Object.entries(stats.categories)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 2)
                  .map(([cat, count]) => `${cat}(${count})`)
                  .join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 rounded-lg transition-colors"
          >
            {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : '搜索'}
          </button>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-purple-500"
            title="选择分类"
          >
            <option value="all">所有分类</option>
            {stats && Object.keys(stats.categories).map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1 bg-white/10 border border-white/20 rounded text-sm focus:outline-none focus:border-purple-500"
            title="选择类型"
          >
            <option value="all">所有类型</option>
            <option value="document">文档</option>
            <option value="faq">常见问题</option>
            <option value="technical">技术文档</option>
            <option value="manual">用户手册</option>
            <option value="troubleshooting">故障排除</option>
          </select>
        </div>

        {searchResults.length > 0 && (
          <div className="text-sm text-white/70">
            找到 {searchResults.length} 个搜索结果
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="ml-2 text-purple-400 hover:text-purple-300"
            >
              清除搜索
            </button>
          </div>
        )}
      </div>

      {/* 编辑表单 */}
      {(isCreating || editingItem) && (
        <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {editingItem ? '编辑知识条目' : '创建新知识条目'}
            </h3>
            <button
              onClick={resetForm}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-white/70 mb-1">标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500"
                placeholder="输入知识条目标题"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm text-white/70 mb-1">分类</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500"
                  placeholder="输入分类"
                />
              </div>
              
              <div>
                <label className="block text-sm text-white/70 mb-1">类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500"
                >
                  <option value="document">文档</option>
                  <option value="faq">常见问题</option>
                  <option value="technical">技术文档</option>
                  <option value="manual">用户手册</option>
                  <option value="troubleshooting">故障排除</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-white/70 mb-1">来源</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500"
                >
                  <option value="manual">手动输入</option>
                  <option value="import">导入</option>
                  <option value="web">网络收集</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-white/70 mb-1">标签</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-purple-600/80 rounded text-xs flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:bg-white/20 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="输入标签后按回车添加"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    addTag(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/70 mb-1">内容</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                rows={8}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded focus:outline-none focus:border-purple-500 resize-vertical"
                placeholder="输入知识条目内容，支持Markdown格式"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded flex items-center gap-1"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 知识条目列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <Book className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <div>暂无知识条目</div>
            <button
              onClick={startCreating}
              className="mt-2 text-purple-400 hover:text-purple-300"
            >
              创建第一个知识条目
            </button>
          </div>
        ) : (
          displayItems.map((item, index) => (
            <div
              key={item.id}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <span className="px-2 py-0.5 bg-blue-600/80 rounded text-xs">
                      {item.category}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-600/80 rounded text-xs">
                      {item.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/70 line-clamp-2 mb-2">
                    {item.content.substring(0, 150)}
                    {item.content.length > 150 && '...'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                    {item.tags.length > 0 && (
                      <>
                        <Tag className="w-3 h-3 ml-2" />
                        <span>{item.tags.slice(0, 3).join(', ')}</span>
                        {item.tags.length > 3 && <span>+{item.tags.length - 3}</span>}
                      </>
                    )}
                    {searchResults.length > 0 && (
                      <>
                        <span className="ml-2">相关度:</span>
                        <span className="text-purple-400">
                          {((searchResults[index]?.score || 0) * 100).toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => startEditing(item)}
                    className="p-1 hover:bg-white/20 rounded"
                    title="编辑"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-400"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 草莓知识库导入器 */}
      {showImporter && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">草莓知识库导入</h3>
              <button
                onClick={() => setShowImporter(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <KnowledgeImporter />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseManager;
