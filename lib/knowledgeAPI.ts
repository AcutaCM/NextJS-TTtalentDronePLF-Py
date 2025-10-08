// 知识库增强的智能问答API
// POST /api/knowledge/qa

import { NextRequest, NextResponse } from 'next/server';

// 这个API需要在服务器端实现
// 这里提供客户端调用的接口定义和服务器端处理逻辑

export interface KnowledgeQARequest {
  query: string;
  context?: string;
  useKnowledge?: boolean;
  maxKnowledgeItems?: number;
  includeSystemContext?: boolean;
  systemStatus?: any;
}

export interface KnowledgeQAResponse {
  success: boolean;
  answer: string;
  sources: Array<{
    title: string;
    category: string;
    relevanceScore: number;
    excerpts: string[];
  }>;
  confidence: number;
  responseTime: number;
  usedKnowledge: boolean;
  error?: string;
}

// 客户端调用函数
export async function callKnowledgeQA(request: KnowledgeQARequest): Promise<KnowledgeQAResponse> {
  try {
    const response = await fetch('/api/knowledge/qa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('知识库问答API调用失败:', error);
    return {
      success: false,
      answer: '知识库服务暂时不可用，请稍后再试。',
      sources: [],
      confidence: 0,
      responseTime: 0,
      usedKnowledge: false,
      error: error.message
    };
  }
}

// 搜索知识库API
export interface KnowledgeSearchRequest {
  query: string;
  category?: string;
  type?: string;
  limit?: number;
  threshold?: number;
}

export interface KnowledgeSearchResponse {
  success: boolean;
  results: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    type: string;
    tags: string[];
    score: number;
    highlights: string[];
  }>;
  total: number;
  responseTime: number;
  error?: string;
}

export async function searchKnowledge(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResponse> {
  try {
    const response = await fetch('/api/knowledge/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`搜索API请求失败: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error('知识库搜索API调用失败:', error);
    return {
      success: false,
      results: [],
      total: 0,
      responseTime: 0,
      error: error.message
    };
  }
}