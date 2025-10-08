import { NextRequest, NextResponse } from 'next/server';
import { listUsers, getUserRole } from '../../../../../lib/user-store';

export async function GET(req: NextRequest) {
  const callerEmail = (req.cookies.get('user_email')?.value || '').toLowerCase();
  const callerRole = callerEmail ? getUserRole(callerEmail) : 'normal';
  if (callerRole !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const users = listUsers();
  const hasAdmin = users.some(u => u.role === 'admin');
  return NextResponse.json({ users, hasAdmin });
}