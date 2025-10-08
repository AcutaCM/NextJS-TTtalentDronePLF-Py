"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import { Spacer } from "@heroui/spacer";
import { ArrowLeft, Mail } from "lucide-react";
import { DroneIcon } from "@/components/icons";
import DarkVeil from "@/components/DarkVeil";
import TextType from "@/components/TextType";
import PageTransition from "@/components/PageTransition";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const validateForm = () => {
    if (!email.trim()) {
      setError("请输入邮箱地址");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("邮箱格式不正确");
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
      // 调用真实的API发送重置密码邮件
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '发送失败，请重试');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || '发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageTransition>
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
                  输入您注册时使用的邮箱地址，我们将向您发送密码重置链接。
                </p>

                {/* 特性展示 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[
                    {
                      icon: Mail,
                      title: "安全重置",
                      description: "通过邮箱验证确保账户安全"
                    },
                    {
                      icon: DroneIcon,
                      title: "快速恢复",
                      description: "几分钟内即可重置密码并恢复访问"
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
                    {isSuccess ? "邮件已发送" : "忘记密码"}
                  </h3>
                  <p className="text-white/70">
                    {isSuccess 
                      ? "请检查您的邮箱并点击重置链接" 
                      : "输入您的邮箱地址以重置密码"}
                  </p>
                </div>

                {isSuccess ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-white/80 mb-6">
                      我们已向 <span className="text-blue-400 font-medium">{email}</span> 发送了密码重置链接。
                      请检查您的邮箱（包括垃圾邮件文件夹）。
                    </p>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                      size="lg"
                      onPress={() => router.push('/login')}
                    >
                      返回登录
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                      type="email"
                      label="邮箱地址"
                      placeholder="请输入您的邮箱"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      classNames={{
                        base: "w-full",
                        input: "text-white",
                        inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                        label: "text-white/80"
                      }}
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
                      disabled={isLoading || !email.trim()}
                    >
                      {isLoading ? "发送中..." : "发送重置链接"}
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
                    没有收到邮件？请检查您的垃圾邮件文件夹，或者
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
    </PageTransition>
  );
}