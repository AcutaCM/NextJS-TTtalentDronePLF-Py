"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

interface LoginCredentials {
  email: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  name?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查本地存储的认证状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // 验证token有效性
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
      } else {
        // Token无效，清除本地存储
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const email = String(credentials.email || '')
        .replace(/^mailto:/i, '')
        .trim();
      if (!email) throw new Error('请输入邮箱');

      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(t || `登录失败(${resp.status})`);
      }

      // 登录成功后，通过 /api/auth/me 获取用户与角色
      const me = await fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).catch(() => null);
      const role = me?.role || 'normal';

      // 统一前端 User 结构
      setUser({
        id: email,
        username: email,
        email,
        role,
      });
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      // 保留原注册接口，但注册成功后按 email 自动登录
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(t || `注册失败(${resp.status})`);
      }
      await login({ email: data.email });
    } catch (error) {
      console.error('注册失败:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 基于 Cookie 的退出登录，无需 Bearer 头
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('退出登录API调用失败:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 保护路由的HOC
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/70">验证身份中...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}