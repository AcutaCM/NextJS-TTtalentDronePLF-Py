import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '未提供有效的认证token' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];

    try {
      // 验证会话 token
      const sessionData = userDatabase.getSessionByToken(token);
      
      if (!sessionData) {
        return NextResponse.json(
          { message: 'Token无效或已过期' },
          { status: 401 }
        );
      }

      const { user } = sessionData;
      const { password_hash, ...userWithoutPassword } = user;

      return NextResponse.json({
        success: true,
        user: userWithoutPassword
      });

    } catch (tokenError) {
      return NextResponse.json(
        { message: 'Token无效或已过期' },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Token验证错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}