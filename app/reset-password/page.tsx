"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import { Spacer } from "@heroui/spacer";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { DroneIcon } from "@/components/icons";
import DarkVeil from "@/components/DarkVeil";
import TextType from "@/components/TextType";
import PageTransition from "@/components/PageTransition";
import { Suspense } from "react";

// 创建一个包装组件来处理 useSearchParams
function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 从URL参数获取token和email
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(emailParam);
    } else {
      setError("无效的重置链接");
    }
  }, [searchParams]);

  const validateForm = () => {
    if (!password) {
      setError("请输入新密码");
      return false;
    }
    
    if (password.length < 6) {
      setError("密码长度至少6位");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reset-password/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '重置失败，请重试');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || '重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
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
      <div className="absolute inset-0 bg-black/30 z-[1]" />

      <div className="relative z-10 min-h-screen flex">
        {/* 左侧内容区域 */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
          <div className="max-w-2xl">
            {/* Logo和标题 */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative">
                <Image 
                  src="/logo.svg" 
                  alt="TTtalentDronePLF Logo" 
                  width={48} 
                  height={48} 
                  className="text-blue-500"
                />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-2">
                  <TextType 
                    text={["TTtalentDronePLF"]}
                    typingSpeed={75}
                    pauseDuration={1500}
                    showCursor={true}
                    cursorCharacter="|"
                  />
                </h1>
                <p className="text-xl text-blue-300 font-medium">
                  智能无人机分析平台
                </p>
              </div>
            </div>

            {/* 产品描述 */}
            <div className="mb-12">
              <h2 className="text-2xl lg:text-3xl text-white font-semibold mb-4">
                重置您的密码
              </h2>
              <p className="text-lg text-white/80 leading-relaxed mb-8">
                为您的账户设置一个新的安全密码。
              </p>

              {/* 特性展示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[
                  {
                    icon: Lock,
                    title: "强密码保护",
                    description: "使用至少6位字符确保账户安全"
                  },
                  {
                    icon: DroneIcon,
                    title: "安全验证",
                    description: "通过邮箱验证确保账户所有权"
                  }
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <feature.icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-white/70 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧重置密码表单 */}
        <div className="w-full max-w-md flex items-center justify-center p-8">
          <Card className="w-full bg-white/10 backdrop-blur-xl border-white/20">
            <CardBody className="p-8">
              {/* 返回登录按钮 */}
              <div className="mb-6">
                <Button
                  variant="light"
                  onPress={() => router.push('/login')}
                  className="text-white/70 hover:text-white p-0 h-auto"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  返回登录
                </Button>
              </div>

              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full">
                    <Image 
                      src="/logo.svg" 
                      alt="TTtalentDronePLF Logo" 
                      width={32} 
                      height={32} 
                      className="text-blue-400"
                    />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  {isSuccess ? "密码重置成功" : "重置密码"}
                </h3>
                <p className="text-white/70">
                  {isSuccess 
                    ? "您的密码已成功更新" 
                    : "为您的账户设置新密码"}
                </p>
              </div>

              {isSuccess ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-white/80 mb-6">
                    您的密码已成功重置。现在可以使用新密码登录您的账户。
                  </p>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                    size="lg"
                    onPress={() => router.push('/login')}
                  >
                    前往登录
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Input
                    type={showPassword ? "text" : "password"}
                    label="新密码"
                    placeholder="请输入新密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    classNames={{
                      base: "w-full",
                      input: "text-white",
                      inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                      label: "text-white/80"
                    }}
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/60 hover:text-white/80 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                    isRequired
                  />

                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    label="确认密码"
                    placeholder="请再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    classNames={{
                      base: "w-full",
                      input: "text-white",
                      inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                      label: "text-white/80"
                    }}
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="text-white/60 hover:text-white/80 transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    }
                    isRequired
                  />

                  {error && (
                    <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                    size="lg"
                    isLoading={isLoading}
                    disabled={isLoading || !password || !confirmPassword}
                  >
                    {isLoading ? "重置中..." : "重置密码"}
                  </Button>

                  <Spacer y={4} />

                  <div className="text-center">
                    <p className="text-white/70 text-sm">
                      想起来了？{" "}
                      <Link
                        href="/login"
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        立即登录
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              {/* 帮助信息 */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-white/60 text-center leading-relaxed">
                  需要帮助？
                  <Link href="/support" className="text-blue-400 hover:text-blue-300">
                    联系支持
                  </Link>
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 底部装饰和版权信息 */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="bg-black/30 backdrop-blur-sm py-2">
          <p className="text-center text-white/60 text-xs">
            © {new Date().getFullYear()} TTtalentDronePLF. Developed by TTtalentDev Team. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordContent />
      </Suspense>
    </PageTransition>
  );
}