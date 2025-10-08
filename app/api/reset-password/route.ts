import { NextRequest, NextResponse } from 'next/server';

// 模拟用户数据库
const users = [
  { id: 1, email: 'user@example.com', name: 'Test User', resetToken: null, resetTokenExpiry: null }
];

// 生成随机重置令牌
function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }
    
    // 查找用户（在实际应用中，这里应该查询真实数据库）
    const user = users.find(u => u.email === email);
    
    if (!user) {
      // 为了安全，即使用户不存在也返回成功消息
      return NextResponse.json({ message: '如果该邮箱存在，重置链接已发送' });
    }
    
    // 生成重置令牌和过期时间（1小时后）
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1小时后过期
    
    // 在实际应用中，这里应该更新数据库中的用户记录
    // user.resetToken = resetToken;
    // user.resetTokenExpiry = resetTokenExpiry;
    
    // 构建重置URL
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    // 在实际应用中，这里应该发送真实的邮件
    // 由于nodemailer在服务端路由中的使用较为复杂，这里仅模拟邮件发送
    console.log(`发送重置邮件到: ${email}`);
    console.log(`重置链接: ${resetUrl}`);
    
    // 模拟邮件发送延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return NextResponse.json({ 
      message: '重置链接已发送到您的邮箱',
      success: true
    });
  } catch (error) {
    console.error('密码重置错误:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}