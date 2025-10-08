import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, UserRole } from '../../../../../lib/roles';
import { setUserRole, getUserRole } from '../../../../../lib/user-store';

export async function POST(req: NextRequest) {
  const callerEmail = (req.cookies.get('user_email')?.value || '').toLowerCase();
  const callerRole = callerEmail ? getUserRole(callerEmail) : 'normal';

  // 真实做法：从存储查询调用者角色
  // const callerRole = callerEmail ? getUserRole(callerEmail) : 'normal';

  if (!isAdmin(callerRole)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || '').toLowerCase();
  const role = String(body?.role || 'normal') as UserRole;
  if (!email || !['admin', 'normal'].includes(role)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  setUserRole(email, role);
  return NextResponse.json({ ok: true, email, role });
}