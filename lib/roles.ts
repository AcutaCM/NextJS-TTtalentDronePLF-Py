export type UserRole = 'admin' | 'normal';

export const DEFAULT_ROLE: UserRole = 'normal';

// 可扩展角色层级与权限点
export const isAdmin = (role?: string) => role === 'admin';