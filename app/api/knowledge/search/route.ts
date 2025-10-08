import { NextRequest, NextResponse } from 'next/server';

// 知识库搜索API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      category,
      type,
      limit = 10,
      threshold = 0.1
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: '搜索查询不能为空' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 模拟知识库搜索
    // 在实际实现中，这里会调用真实的知识库搜索引擎
    const mockResults = [
      {
        id: 'kb_001',
        title: '无人机连接问题排查指南',
        content: '本文档详细介绍了无人机连接问题的排查步骤和解决方案...',
        category: '故障排除',
        type: 'troubleshooting',
        tags: ['连接', '网络', '故障'],
        score: 0.92,
        highlights: [
          '检查**无人机**电源是否开启',
          '确认**WiFi连接**是否正常',
          '检查无人机与设备**距离**'
        ]
      },
      {
        id: 'kb_002',
        title: '草莓检测精度优化方法',
        content: '提高草莓检测精度的技术要点和最佳实践...',
        category: '检测算法',
        type: 'technical',
        tags: ['草莓检测', '精度优化', '算法'],
        score: 0.78,
        highlights: [
          '优化**光照条件**提高检测精度',
          '调整**检测参数**配置',
          '使用**多角度检测**方法'
        ]
      }
    ].filter(item => {
      // 应用过滤条件
      if (category && item.category !== category) return false;
      if (type && item.type !== type) return false;
      if (item.score < threshold) return false;
      return true;
    }).slice(0, limit);

    const response = {
      success: true,
      results: mockResults,
      total: mockResults.length,
      responseTime: Date.now() - startTime
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('知识库搜索API错误:', error);
    return NextResponse.json(
      {
        success: false,
        results: [],
        total: 0,
        responseTime: 0,
        error: error.message
      },
      { status: 500 }
    );
  }
}

// 支持GET请求用于健康检查
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'knowledge-search-api',
    timestamp: new Date().toISOString()
  });
}