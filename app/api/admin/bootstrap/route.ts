import { NextRequest, NextResponse } from 'next/server';
import { listUsers, setUserRole } from '../../../../lib/user-store';

/**
 * 一次性管理员引导：
 * 当系统尚无任何管理员时，允许把指定邮箱设置为 admin。
 * 之后该接口将拒绝再次使用。
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').toLowerCase();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  // 检查是否已有管理员
  const users = listUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  if (hasAdmin) {
    return NextResponse.json({ error: 'already_bootstrapped' }, { status: 403 });
  }

  setUserRole(email, 'admin');
  return NextResponse.json({ ok: true, email, role: 'admin' });
}