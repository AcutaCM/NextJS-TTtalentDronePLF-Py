import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '未提供有效的认证token' },
        { status: 401 }
      );
    }

    const token = authorization.split(' ')[1];
    const sessionData = userDatabase.getSessionByToken(token);
    
    if (!sessionData) {
      return NextResponse.json(
        { message: 'Token无效或已过期' },
        { status: 401 }
      );
    }

    const { oldPassword, newPassword } = await request.json();

    // 验证输入
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { message: '请提供旧密码和新密码' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: '新密码长度至少6位' },
        { status: 400 }
      );
    }

    // 更改密码
    const success = await userDatabase.changePassword(
      sessionData.user.id,
      oldPassword,
      newPassword
    );

    if (!success) {
      return NextResponse.json(
        { message: '旧密码不正确' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '密码修改成功'
    });

  } catch (error) {
    console.error('修改密码错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}