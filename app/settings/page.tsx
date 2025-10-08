"use client";

import React, { useState, useRef } from "react";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Tabs, Tab } from "@heroui/tabs";
import { Divider } from "@heroui/divider";
import { Switch } from "@heroui/switch";
import { Select, SelectItem } from "@heroui/select";
import { User, Lock, Settings as SettingsIcon, ArrowLeft, Bell, Monitor, Palette, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DarkVeil from "@/components/DarkVeil";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || ""
  });
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailNotifications: false,
    language: 'zh-CN',
    autoSave: true,
    soundEffects: true
  });
  
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handlePreferencesUpdate = async () => {
    try {
      // 将偏好设置保存到 localStorage
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      setMessage('偏好设置已保存');
      
      // 3秒后清除消息
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError('保存偏好设置失败');
    }
  };

  // 组件加载时读取保存的偏好设置
  React.useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        if (parsed.theme) {
          setTheme(parsed.theme);
          delete parsed.theme;
        }
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('读取偏好设置失败:', err);
      }
    }
  }, [setTheme]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* DarkVeil 动态背景 */}
        <div className="absolute inset-0 z-0">
          <DarkVeil 
            hueShift={25} 
            speed={2.2}
            noiseIntensity={0.05}
            warpAmount={0.3}
          />
        </div>
        
        {/* 背景遮罩层 */}
        <div className="absolute inset-0 bg-background/30 z-[1]" />
        
        <div className="relative z-10 text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">加载中...</p>
        </div>
      </div>
    );
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileForm.name,
          avatar: profileForm.avatar
        })
      });

      if (response.ok) {
        setMessage('个人信息更新成功');
        // 刷新页面以更新用户信息
        window.location.reload();
      } else {
        const errorData = await response.json();
        setError(errorData.message || '更新失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('新密码和确认密码不一致');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('新密码长度至少6位');
      return;
    }

    setIsChangingPassword(true);
    setMessage(null);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setMessage('密码修改成功');
        setPasswordForm({
          oldPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || '密码修改失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 处理文件选择
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 更新表单中的头像URL
        setProfileForm(prev => ({ ...prev, avatar: result.avatarUrl }));
        setMessage('头像上传成功');
      } else {
        setError(result.message || '头像上传失败');
      }
    } catch (err) {
      setError('上传失败，请重试');
    } finally {
      setIsUploading(false);
      // 清空文件输入框
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* DarkVeil 动态背景 */}
      <div className="absolute inset-0 z-0">
        <DarkVeil 
          hueShift={25} 
          speed={2.2}
          noiseIntensity={0.05}
          warpAmount={0.3}
        />
      </div>
      
      {/* 背景遮罩层 */}
      <div className="absolute inset-0 bg-background/30 z-[1]" />
      
      <div className="relative z-10 p-4">
        {/* 顶部导航 */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onPress={() => router.push('/')}
              className="text-foreground/70 hover:text-foreground p-2"
              startContent={<ArrowLeft className="w-4 h-4" />}
            >
              返回主页
            </Button>
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="Logo" width={32} height={32} />
              <h1 className="text-2xl font-bold text-foreground">账户设置</h1>
            </div>
          </div>
        </div>

        {/* 主内容 */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 用户信息卡片 */}
            <Card className="lg:col-span-1 bg-content1/80 dark:bg-content1/50 backdrop-blur-xl border-default-200/50">
              <CardBody className="p-6 text-center">
                <div className="relative inline-block">
                  <Avatar
                    src={profileForm.avatar || user.avatar}
                    name={user.name || user.username}
                    className="w-24 h-24 mx-auto mb-4"
                  />
                  <Button
                    isIconOnly
                    size="sm"
                    color="primary"
                    className="absolute bottom-4 right-0 text-white rounded-full w-8 h-8 min-w-0 min-h-0"
                    onPress={handleFileSelect}
                    isLoading={isUploading}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                  />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {user.name || user.username}
                </h2>
                <p className="text-foreground/70 mb-2">{user.email}</p>
                <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                  user.role === 'admin' 
                    ? 'bg-red-500/20 text-red-300'
                    : user.role === 'pilot'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-gray-500/20 text-gray-300'
                }`}>
                  {user.role === 'admin' ? '管理员' : 
                   user.role === 'pilot' ? '飞行员' : '用户'}
                </div>
              </CardBody>
            </Card>

            {/* 设置表单 */}
            <Card className="lg:col-span-2 bg-content1/80 dark:bg-content1/50 backdrop-blur-xl border-default-200/50">
              <CardHeader className="pb-0">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">设置</h3>
                </div>
              </CardHeader>
              <CardBody className="p-6">
                <Tabs defaultSelectedKey="profile" className="w-full">
                  <Tab
                    key="profile"
                    title={
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>个人信息</span>
                      </div>
                    }
                  >
                    <form onSubmit={handleProfileUpdate} className="space-y-6 mt-6">
                      <Input
                        label="姓名"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                      
                      <Input
                        label="邮箱"
                        value={profileForm.email}
                        disabled
                        description="邮箱地址不可修改"
                      />
                      
                      <div className="space-y-2">
                        <label className="text-sm text-foreground">头像</label>
                        <div className="flex items-center gap-4">
                          <Avatar
                            src={profileForm.avatar || user.avatar}
                            name={user.name || user.username}
                            className="w-12 h-12"
                          />
                          <Button
                            size="sm"
                            color="primary"
                            onPress={handleFileSelect}
                            isLoading={isUploading}
                            startContent={<Upload className="w-4 h-4" />}
                          >
                            上传头像
                          </Button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileUpload}
                          />
                        </div>
                        <p className="text-foreground/60 text-xs">支持 JPG、PNG、GIF 或 WebP 格式，最大 2MB</p>
                      </div>

                      <Input
                        label="头像URL"
                        value={profileForm.avatar}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, avatar: e.target.value }))}
                        placeholder="输入头像图片URL"
                      />

                      <Button
                        type="submit"
                        color="primary"
                        className="w-full font-semibold"
                        isLoading={isUpdatingProfile}
                        disabled={isUpdatingProfile}
                      >
                        更新个人信息
                      </Button>
                    </form>
                  </Tab>

                  <Tab
                    key="security"
                    title={
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>安全设置</span>
                      </div>
                    }
                  >
                    <form onSubmit={handlePasswordChange} className="space-y-6 mt-6">
                      <Input
                        type="password"
                        label="当前密码"
                        value={passwordForm.oldPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                        isRequired
                      />
                      
                      <Input
                        type="password"
                        label="新密码"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        description="密码长度至少6位"
                        isRequired
                      />
                      
                      <Input
                        type="password"
                        label="确认新密码"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        isRequired
                      />

                      <Button
                        type="submit"
                        color="primary"
                        className="w-full font-semibold"
                        isLoading={isChangingPassword}
                        disabled={isChangingPassword}
                      >
                        修改密码
                      </Button>
                    </form>
                  </Tab>

                  <Tab
                    key="preferences"
                    title={
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>系统偏好</span>
                      </div>
                    }
                  >
                    <div className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <h4 className="text-foreground font-medium">通知设置</h4>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground">桌面通知</p>
                            <p className="text-foreground/60 text-sm">允许显示桌面通知</p>
                          </div>
                          <Switch
                            isSelected={preferences.notifications}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, notifications: value }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground">邮件通知</p>
                            <p className="text-foreground/60 text-sm">接收邮件提醒</p>
                          </div>
                          <Switch
                            isSelected={preferences.emailNotifications}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, emailNotifications: value }))}
                          />
                        </div>
                      </div>

                      <Divider />

                      <div className="space-y-4">
                        <h4 className="text-foreground font-medium">界面设置</h4>
                        
                        <Select
                          label="主题"
                          selectedKeys={theme ? [theme] : ["dark"]}
                          onSelectionChange={(keys) => {
                            const newTheme = Array.from(keys)[0] as string;
                            setTheme(newTheme);
                          }}
                        >
                          <SelectItem key="dark">深色模式</SelectItem>
                          <SelectItem key="light">浅色模式</SelectItem>
                          <SelectItem key="system">跟随系统</SelectItem>
                        </Select>
                        
                        <Select
                          label="语言"
                          selectedKeys={[preferences.language]}
                          onSelectionChange={(keys) => {
                            const language = Array.from(keys)[0] as string;
                            setPreferences(prev => ({ ...prev, language }));
                          }}
                        >
                          <SelectItem key="zh-CN">中文（简体）</SelectItem>
                          <SelectItem key="en-US">English (US)</SelectItem>
                          <SelectItem key="ja-JP">日本語</SelectItem>
                        </Select>
                      </div>

                      <Divider />

                      <div className="space-y-4">
                        <h4 className="text-foreground font-medium">功能设置</h4>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground">自动保存</p>
                            <p className="text-foreground/60 text-sm">自动保存用户设置和数据</p>
                          </div>
                          <Switch
                            isSelected={preferences.autoSave}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, autoSave: value }))}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground">声音效果</p>
                            <p className="text-foreground/60 text-sm">启用界面声音效果</p>
                          </div>
                          <Switch
                            isSelected={preferences.soundEffects}
                            onValueChange={(value) => setPreferences(prev => ({ ...prev, soundEffects: value }))}
                          />
                        </div>
                      </div>

                      <Button
                        color="primary"
                        className="w-full font-semibold"
                        onPress={handlePreferencesUpdate}
                      >
                        保存偏好设置
                      </Button>
                    </div>
                  </Tab>
                </Tabs>

                {/* 消息显示 */}
                {(message || error) && (
                  <div className="mt-6">
                    <Divider className="mb-4" />
                    {message && (
                      <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30">
                        <p className="text-green-200 text-sm">{message}</p>
                      </div>
                    )}
                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                        <p className="text-red-200 text-sm">{error}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 退出登录 */}
                <div className="mt-8">
                  <Divider className="mb-4" />
                  <Button
                    color="danger"
                    variant="ghost"
                    onPress={logout}
                    className="w-full"
                  >
                    退出登录
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}