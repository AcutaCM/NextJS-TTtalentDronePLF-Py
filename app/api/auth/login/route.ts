import { NextRequest, NextResponse } from 'next/server';
import { getUserRole, setUserRole, hasAdmin } from '../../../../lib/user-store';
import { DEFAULT_ADMIN_EMAIL } from '../../../../lib/config';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  let role = getUserRole(email);
  // 若尚无管理员，且登录邮箱为默认管理员，则提升为管理员并持久化
  if (!hasAdmin() && email === DEFAULT_ADMIN_EMAIL && role !== 'admin') {
    setUserRole(email, 'admin');
    role = 'admin';
  }
  const res = NextResponse.json({ email, role });
  // 简单 cookie 登录（示例），生产环境应使用安全的会话/JWT
  res.cookies.set('user_email', email, { httpOnly: false, sameSite: 'lax', path: '/' });
  return res;
}