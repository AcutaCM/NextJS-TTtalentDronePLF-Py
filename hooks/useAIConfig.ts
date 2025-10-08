import { useState, useCallback } from 'react';

interface AIConfig {
  apiKey: string;
  model: string;
  endpoint: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

interface AIAnalysisResult {
  id: string;
  timestamp: string;
  imageUrl: string;
  analysis: {
    plantCount: number;
    matureStrawberries: number;
    immatureStrawberries: number;
    diseaseDetected: boolean;
    healthScore: number;
    recommendations: string[];
  };
  confidence: number;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  model: 'gpt-4-vision-preview',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  temperature: 0.3,
  maxTokens: 1000,
  enabled: false
};

export const useAIConfig = () => {
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aiConfig');
      if (saved) {
        try {
          return { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
        } catch (error) {
          console.error('Failed to parse saved AI config:', error);
        }
      }
    }
    return DEFAULT_AI_CONFIG;
  });

  const [analysisResults, setAnalysisResults] = useState<AIAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateAIConfig = useCallback((updates: Partial<AIConfig>) => {
    setAIConfig(prev => {
      const newConfig = { ...prev, ...updates };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('aiConfig', JSON.stringify(newConfig));
      }
      return newConfig;
    });
  }, []);

  const testAIConnection = useCallback(async () => {
    if (!aiConfig.apiKey || !aiConfig.endpoint) {
      setTestResult({ success: false, message: '请先配置API密钥和端点' });
      return false;
    }

    try {
      setTestResult(null);
      
      const response = await fetch('/api/test-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          endpoint: aiConfig.endpoint
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'AI连接测试成功' });
        return true;
      } else {
        setTestResult({ success: false, message: result.error || 'AI连接测试失败' });
        return false;
      }
    } catch (error) {
      setTestResult({ success: false, message: '网络错误: ' + (error as Error).message });
      return false;
    }
  }, [aiConfig]);

  const analyzeImage = useCallback(async (imageData: string | File) => {
    if (!aiConfig.enabled || !aiConfig.apiKey) {
      throw new Error('AI分析未启用或未配置');
    }

    setIsAnalyzing(true);
    
    try {
      const formData = new FormData();
      
      if (typeof imageData === 'string') {
        // Base64 image data
        formData.append('image', imageData);
      } else {
        // File object
        formData.append('image', imageData);
      }
      
      formData.append('config', JSON.stringify(aiConfig));

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        const analysisResult: AIAnalysisResult = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          imageUrl: result.imageUrl,
          analysis: result.analysis,
          confidence: result.confidence
        };
        
        setAnalysisResults(prev => [analysisResult, ...prev].slice(0, 50)); // Keep last 50 results
        return analysisResult;
      } else {
        throw new Error(result.error || 'AI分析失败');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  }, [aiConfig]);

  const clearAnalysisResults = useCallback(() => {
    setAnalysisResults([]);
  }, []);

  const exportAnalysisResults = useCallback(() => {
    if (analysisResults.length === 0) {
      return null;
    }

    const exportData = {
      exportTime: new Date().toISOString(),
      totalResults: analysisResults.length,
      results: analysisResults
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return exportData;
  }, [analysisResults]);

  const getAnalysisStats = useCallback(() => {
    if (analysisResults.length === 0) {
      return {
        totalAnalyses: 0,
        averageConfidence: 0,
        totalPlants: 0,
        totalMatureStrawberries: 0,
        totalImmatureStrawberries: 0,
        diseaseDetectionRate: 0,
        averageHealthScore: 0
      };
    }

    const stats = analysisResults.reduce((acc, result) => {
      acc.totalPlants += result.analysis.plantCount;
      acc.totalMatureStrawberries += result.analysis.matureStrawberries;
      acc.totalImmatureStrawberries += result.analysis.immatureStrawberries;
      acc.totalConfidence += result.confidence;
      acc.totalHealthScore += result.analysis.healthScore;
      if (result.analysis.diseaseDetected) acc.diseaseCount++;
      return acc;
    }, {
      totalPlants: 0,
      totalMatureStrawberries: 0,
      totalImmatureStrawberries: 0,
      totalConfidence: 0,
      totalHealthScore: 0,
      diseaseCount: 0
    });

    return {
      totalAnalyses: analysisResults.length,
      averageConfidence: stats.totalConfidence / analysisResults.length,
      totalPlants: stats.totalPlants,
      totalMatureStrawberries: stats.totalMatureStrawberries,
      totalImmatureStrawberries: stats.totalImmatureStrawberries,
      diseaseDetectionRate: (stats.diseaseCount / analysisResults.length) * 100,
      averageHealthScore: stats.totalHealthScore / analysisResults.length
    };
  }, [analysisResults]);

  return {
    aiConfig,
    analysisResults,
    isAnalyzing,
    testResult,
    updateAIConfig,
    testAIConnection,
    analyzeImage,
    clearAnalysisResults,
    exportAnalysisResults,
    getAnalysisStats
  };
};