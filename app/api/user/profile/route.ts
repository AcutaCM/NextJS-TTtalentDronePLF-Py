import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

// 获取当前用户信息
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

  } catch (error) {
    console.error('获取用户信息错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 更新用户信息
export async function PUT(request: NextRequest) {
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

    const { name, avatar } = await request.json();
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (avatar !== undefined) updates.avatar = avatar;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: '没有提供要更新的字段' },
        { status: 400 }
      );
    }

    const updatedUser = userDatabase.updateUser(sessionData.user.id, updates);
    
    if (!updatedUser) {
      return NextResponse.json(
        { message: '用户不存在' },
        { status: 404 }
      );
    }

    const { password_hash, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      message: '用户信息更新成功',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('更新用户信息错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}