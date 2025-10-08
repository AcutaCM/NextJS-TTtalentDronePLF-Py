import { NextRequest, NextResponse } from 'next/server';
import { getUserRole, setUserRole, hasAdmin } from '../../../../lib/user-store';
import { UserRole } from '../../../../lib/roles';
import { DEFAULT_ADMIN_EMAIL } from '../../../../lib/config';

export async function GET(req: NextRequest) {
  const email = (req.cookies.get('user_email')?.value || '').toLowerCase();
  let role: UserRole = email ? getUserRole(email) : 'normal';
  // 若尚无管理员，且当前用户为默认管理员邮箱，自动设为管理员
  if (email && !hasAdmin() && email === DEFAULT_ADMIN_EMAIL && role !== 'admin') {
    setUserRole(email, 'admin');
    role = 'admin';
  }
  return NextResponse.json({ email, role });
}