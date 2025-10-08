import React, { useState, useEffect } from 'react';
import { knowledgeBaseManager, KnowledgeItem } from '../lib/knowledgeBase';
import { knowledgeEnhancedQA } from '../lib/knowledgeEnhancedQA';
import {
  Brain,
  Lightbulb,
  Zap,
  MessageCircle,
  BookOpen,
  TrendingUp,
  Star,
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface AIKnowledgePanelProps {
  onAskAI: (question: string, context?: string) => void;
  className?: string;
}

const AIKnowledgePanel: React.FC<AIKnowledgePanelProps> = ({ onAskAI, className = '' }) => {
  const [recentKnowledge, setRecentKnowledge] = useState<KnowledgeItem[]>([]);
  const [quickQuestions, setQuickQuestions] = useState<string[]>([]);
  const [aiStats, setAiStats] = useState({
    totalKnowledge: 0,
    recentlyAdded: 0,
    categories: 0
  });

  useEffect(() => {
    loadAIKnowledgeData();
  }, []);

  const loadAIKnowledgeData = async () => {
    try {
      await knowledgeBaseManager.initialize();
      const allKnowledge = knowledgeBaseManager.getAllKnowledge();
      const stats = knowledgeBaseManager.getStats();
      
      // 获取最近添加的知识（24小时内）
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recent = allKnowledge
        .filter(item => item.createdAt > oneDayAgo)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5);
      
      setRecentKnowledge(recent);
      setAiStats({
        totalKnowledge: stats.totalItems,
        recentlyAdded: recent.length,
        categories: Object.keys(stats.categories).length
      });
      
      // 生成智能推荐问题
      generateQuickQuestions(allKnowledge);
      
    } catch (error) {
      console.error('加载AI知识库数据失败:', error);
    }
  };

  const generateQuickQuestions = (knowledge: KnowledgeItem[]) => {
    // 基于知识库内容生成智能问题
    const questions: string[] = [];
    
    // 从不同分类中提取问题
    const categories = ['设备连接', '检测算法', 'AI配置', '故障排除'];
    categories.forEach(category => {
      const categoryItems = knowledge.filter(item => item.category === category);
      if (categoryItems.length > 0) {
        const randomItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        questions.push(`如何${randomItem.title.replace(/^(如何|怎么|怎样)/, '')}？`);
      }
    });
    
    // 添加一些通用问题
    const generalQuestions = [
      '如何提高系统性能？',
      '遇到错误应该怎么办？',
      '有什么最佳实践建议？',
      '如何进行系统维护？'
    ];
    
    questions.push(...generalQuestions.slice(0, 2));
    setQuickQuestions(questions.slice(0, 6));
  };

  const handleQuickQuestion = (question: string) => {
    onAskAI(question);
  };

  const handleKnowledgeSelect = (item: KnowledgeItem) => {
    const contextualQuestion = `基于"${item.title}"的知识，请详细解释相关内容。`;
    onAskAI(contextualQuestion, item.content);
  };

  return (
    <div className={`bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl p-4 text-white ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Brain className="w-5 h-5 text-purple-400" />
            <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
          </div>
          <h3 className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            AI知识助手
          </h3>
        </div>
        
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-600/30 rounded-full">
            <BookOpen className="w-3 h-3" />
            <span>{aiStats.totalKnowledge}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-green-600/30 rounded-full">
            <TrendingUp className="w-3 h-3" />
            <span>{aiStats.recentlyAdded}</span>
          </div>
        </div>
      </div>

      {/* 快速问题 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-white/90">智能推荐问题</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {quickQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuickQuestion(question)}
              className="text-left p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-lg transition-all duration-200 group"
              title={`询问AI: ${question}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 group-hover:text-white">
                  {question}
                </span>
                <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-purple-400 transform group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 最近添加的知识 */}
      {recentKnowledge.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white/90">最近添加</span>
            <span className="px-2 py-0.5 bg-blue-600/30 rounded-full text-xs">
              {recentKnowledge.length}
            </span>
          </div>
          <div className="space-y-2">
            {recentKnowledge.map((item) => (
              <button
                key={item.id}
                onClick={() => handleKnowledgeSelect(item)}
                className="w-full text-left p-3 bg-gradient-to-r from-blue-600/10 to-purple-600/10 hover:from-blue-600/20 hover:to-purple-600/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg transition-all duration-200 group"
                title={`查看知识: ${item.title}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {item.title}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-600/80 rounded text-xs">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 line-clamp-2">
                      {item.content.substring(0, 80)}...
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/50">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.source === 'user_input' && (
                        <span className="px-1 py-0.5 bg-green-600/80 rounded text-xs">
                          用户添加
                        </span>
                      )}
                    </div>
                  </div>
                  <MessageCircle className="w-4 h-4 text-white/40 group-hover:text-blue-400 ml-2" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI功能提示 */}
      <div className="p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Zap className="w-4 h-4 text-purple-400 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium text-purple-200 mb-1">🤖 AI增强问答</div>
            <div className="text-purple-300/80 text-xs leading-relaxed">
              AI已加载 <span className="text-purple-200 font-semibold">{aiStats.totalKnowledge}</span> 条专业知识，
              覆盖 <span className="text-purple-200 font-semibold">{aiStats.categories}</span> 个分类。
              点击问题或知识条目即可获得AI智能回答。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIKnowledgePanel;