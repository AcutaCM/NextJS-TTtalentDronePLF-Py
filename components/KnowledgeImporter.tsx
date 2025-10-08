import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Upload, Database, FileText } from 'lucide-react';
import { knowledgeBaseManager } from '@/lib/knowledgeBase';

interface ImportStats {
  success: number;
  error: number;
  total: number;
}

interface KnowledgeItem {
  title: string;
  content: string;
  category: string;
  tags: string[];
  type: string;
  source: string;
  metadata: {
    originalFile: string;
    fileSize: number;
    importDate: string;
  };
}

const KnowledgeImporter: React.FC = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [currentItem, setCurrentItem] = useState<string>('');
  const [importLog, setImportLog] = useState<string[]>([]);

  // 草莓知识库数据 - 这里会被实际的导入脚本替换
  const getStrawberryKnowledgeData = async (): Promise<KnowledgeItem[]> => {
    try {
      // 动态导入生成的知识库数据
      const module = await import('../scripts/strawberry-knowledge-import.js');
      return module.strawberryKnowledgeData || [];
    } catch (error) {
      console.error('加载草莓知识库数据失败:', error);
      return [];
    }
  };

  const addToLog = (message: string) => {
    setImportLog(prev => [...prev.slice(-9), message]); // 保持最新10条日志
  };

  const importStrawberryKnowledge = async () => {
    setIsImporting(true);
    setImportProgress(0);
    setImportStats(null);
    setImportLog([]);
    
    try {
      addToLog('🍓 开始加载草莓知识库数据...');
      const knowledgeData = await getStrawberryKnowledgeData();
      
      if (knowledgeData.length === 0) {
        addToLog('⚠️ 没有找到可导入的知识数据');
        return;
      }

      addToLog(`📚 发现 ${knowledgeData.length} 个知识条目`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < knowledgeData.length; i++) {
        const knowledge = knowledgeData[i];
        setCurrentItem(knowledge.title);
        setImportProgress(((i + 1) / knowledgeData.length) * 100);
        
        try {
          await knowledgeBaseManager.addKnowledge(knowledge);
          successCount++;
          addToLog(`✅ 导入成功: ${knowledge.title}`);
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          addToLog(`❌ 导入失败: ${knowledge.title} - ${errorMessage}`);
        }
        
        // 添加小延迟以避免UI阻塞
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      const stats = {
        success: successCount,
        error: errorCount,
        total: knowledgeData.length
      };
      
      setImportStats(stats);
      addToLog(`🎉 导入完成！成功: ${successCount}, 失败: ${errorCount}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      addToLog(`❌ 导入过程发生错误: ${errorMessage}`);
    } finally {
      setIsImporting(false);
      setCurrentItem('');
      setImportProgress(100);
    }
  };

  const resetImport = () => {
    setImportStats(null);
    setImportProgress(0);
    setImportLog([]);
    setCurrentItem('');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          草莓知识库导入工具
        </CardTitle>
        <CardDescription>
          批量导入草莓种植相关的专业知识文档到系统知识库中
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 导入统计 */}
        {importStats && (
          <Alert className={importStats.error > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">导入完成统计</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>总计: {importStats.total}</div>
                <div className="text-green-600">成功: {importStats.success}</div>
                <div className="text-red-600">失败: {importStats.error}</div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 导入进度 */}
        {isImporting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>导入进度</span>
              <span>{Math.round(importProgress)}%</span>
            </div>
            <Progress value={importProgress} className="w-full" />
            {currentItem && (
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                正在处理: {currentItem}
              </div>
            )}
          </div>
        )}

        {/* 导入日志 */}
        {importLog.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">导入日志</h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              {importLog.map((log, index) => (
                <div key={index} className="text-xs font-mono text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={importStrawberryKnowledge}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? '导入中...' : '开始导入草莓知识库'}
          </Button>
          
          {importStats && (
            <Button
              variant="outline"
              onClick={resetImport}
              className="flex items-center gap-2"
            >
              重置状态
            </Button>
          )}
        </div>

        {/* 使用说明 */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">使用说明</div>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>本工具将批量导入139个草莓种植相关的专业文档</li>
              <li>包含病害防治、栽培技术、品种介绍、虫害管理等多个分类</li>
              <li>导入过程可能需要几分钟时间，请耐心等待</li>
              <li>导入完成后可在知识库管理界面查看和编辑内容</li>
              <li>重复导入会覆盖已存在的同名知识条目</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default KnowledgeImporter;