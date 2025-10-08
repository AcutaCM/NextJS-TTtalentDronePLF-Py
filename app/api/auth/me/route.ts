import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '../../../../lib/user-store';
import type { UserRole } from '../../../../lib/roles';

export async function GET(req: NextRequest) {
  const email = (req.cookies.get('user_email')?.value || '').toLowerCase();
  const role: UserRole = email ? getUserRole(email) : 'normal';
  // 可扩展 avatar 等字段，这里保持最小返回体以兼容现有调用
  return NextResponse.json({ email, role });
}