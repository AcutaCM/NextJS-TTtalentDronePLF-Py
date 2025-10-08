import { NextRequest, NextResponse } from 'next/server';

/**
 * 基于 Cookie 的退出登录：清除 user_email Cookie
 * 说明：与 /api/auth/login 设置的 cookie 策略保持一致
 */
export async function POST(_req: NextRequest) {
  const res = NextResponse.json({ success: true, message: '退出登录成功' });
  // 清除会话 Cookie
  res.cookies.set('user_email', '', { maxAge: 0, path: '/', httpOnly: false, sameSite: 'lax' });
  return res;
}