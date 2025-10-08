import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据库
const users = [
  { 
    id: 1, 
    email: 'user@example.com', 
    name: 'Test User', 
    resetToken: 'sampletoken123', 
    resetTokenExpiry: new Date(Date.now() + 3600000) // 1小时后过期
  }
];

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();
    
    // 验证参数
    if (!token || !email || !password) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    // 验证密码强度
    if (password.length < 6) {
      return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
    }
    
    // 查找用户（在实际应用中，这里应该查询真实数据库）
    const user = users.find(u => u.email === email);
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }
    
    // 验证令牌
    if (user.resetToken !== token) {
      return NextResponse.json({ error: '重置令牌无效' }, { status: 400 });
    }
    
    // 验证令牌是否过期
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: '重置令牌已过期' }, { status: 400 });
    }
    
    // 在实际应用中，这里应该：
    // 1. 使用bcrypt等库对密码进行哈希处理
    // 2. 更新数据库中的用户密码
    // 3. 清除重置令牌和过期时间
    
    // 模拟密码更新
    console.log(`用户 ${email} 的密码已更新`);
    
    // 清除重置令牌
    // user.resetToken = null;
    // user.resetTokenExpiry = null;
    
    return NextResponse.json({ 
      message: '密码重置成功',
      success: true
    });
  } catch (error) {
    console.error('密码更新错误:', error);
    return NextResponse.json({ error: '重置失败，请稍后重试' }, { status: 500 });
  }
}