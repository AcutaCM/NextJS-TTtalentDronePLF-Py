import { NextRequest, NextResponse } from 'next/server';
import { userDatabase } from '@/lib/userDatabase';

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, name } = await request.json();

    // 验证输入
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: '用户名、邮箱和密码不能为空' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { message: '密码长度至少6位' },
        { status: 400 }
      );
    }

    // 创建新用户
    try {
      const newUser = await userDatabase.createUser({
        username,
        email,
        password,
        name: name || username,
        role: 'user'
      });

      // 返回成功响应（不包含密码哈希）
      const { password_hash, ...userWithoutPassword } = newUser;

      return NextResponse.json({
        success: true,
        message: '注册成功',
        user: userWithoutPassword
      });
    } catch (dbError: any) {
      // 处理数据库错误（如重复用户名或邮箱）
      return NextResponse.json(
        { message: dbError.message },
        { status: 409 }
      );
    }

  } catch (error) {
    console.error('注册处理错误:', error);
    return NextResponse.json(
      { message: '服务器内部错误' },
      { status: 500 }
    );
  }
}