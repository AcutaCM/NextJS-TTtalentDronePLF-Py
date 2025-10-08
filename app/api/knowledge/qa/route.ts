import { NextRequest, NextResponse } from 'next/server';

// 知识库增强的智能问答API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      context,
      useKnowledge = true,
      maxKnowledgeItems = 5,
      includeSystemContext = false,
      systemStatus
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: '查询内容不能为空' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 模拟知识库搜索和AI问答处理
    // 在实际实现中，这里会调用知识库搜索引擎和AI模型
    const mockSources = [
      {
        title: '无人机连接问题排查',
        category: '故障排除',
        relevanceScore: 0.85,
        excerpts: [
          '检查无人机电源是否开启',
          '确认WiFi连接是否正常',
          '检查无人机与设备距离（建议10米内）'
        ]
      }
    ];

    // 模拟AI回答生成
    const mockAnswer = `基于知识库搜索结果，针对您的问题"${query}"，我提供以下建议：

${useKnowledge ? '根据知识库信息：' : ''}
1. 首先检查设备的基础连接状态
2. 确认相关配置是否正确
3. 查看是否有错误提示信息

${includeSystemContext && systemStatus ? '当前系统状态已纳入分析考虑。' : ''}

如需更详细的帮助，请提供具体的错误信息。`;

    const response = {
      success: true,
      answer: mockAnswer,
      sources: mockSources,
      confidence: 0.78,
      responseTime: Date.now() - startTime,
      usedKnowledge: useKnowledge && mockSources.length > 0
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('知识库问答API错误:', error);
    return NextResponse.json(
      {
        success: false,
        answer: '服务器内部错误，请稍后再试。',
        sources: [],
        confidence: 0,
        responseTime: 0,
        usedKnowledge: false,
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
    service: 'knowledge-qa-api',
    timestamp: new Date().toISOString()
  });
}