"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Card, CardBody } from "@heroui/card";
import { Link } from "@heroui/link";
import { Spacer } from "@heroui/spacer";
import { Eye, EyeOff, ArrowLeft, Plane, Zap, Shield, Target } from "lucide-react";
import { DroneIcon, AiIcon } from "@/components/icons";
import { useAuth } from "@/contexts/AuthContext";
import DarkVeil from "@/components/DarkVeil";
import TextType from "@/components/TextType";
import PageTransition from "@/components/PageTransition";
import TrueFocus from "@/components/TrueFocus";

interface RegisterFormData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { register } = useAuth();

  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("请填写姓名");
      return false;
    }
    if (!formData.username.trim()) {
      setError("请填写用户名");
      return false;
    }
    if (!formData.email.trim()) {
      setError("请填写邮箱");
      return false;
    }
    if (!formData.password) {
      setError("请填写密码");
      return false;
    }
    if (formData.password.length < 6) {
      setError("密码长度至少6位");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("两次输入的密码不一致");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
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
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      // 注册成功后跳转到过渡页面
      router.push('/login-success');
    } catch (err: any) {
      setError(err.message || '注册失败，请重试');
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
          {/* 左侧信息展示 */}
          <div className="flex-1 flex flex-col justify-center px-8 lg:px-16">
            <div className="max-w-2xl">
              {/* Logo和标题 */}
              <div className="flex items-center gap-3 mb-8">
                <Image 
                  src="/logo.svg" 
                  alt="TTtalentDronePLF Logo" 
                  width={48} 
                  height={48} 
                  className="text-blue-500"
                />
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
                <div className="text-lg text-white/80 leading-relaxed mb-8">
                  <TrueFocus 
                    sentence="集成 AI视觉识别 自动飞行控制 和 实时数据分析 为农业、安防、测绘等领域提供专业级无人机解决方案。"
                    manualMode={false}
                    blurAmount={3}
                    borderColor="#3b82f6"
                    glowColor="rgba(59, 130, 246, 0.6)"
                    animationDuration={0.8}
                    pauseBetweenAnimations={1.5}
                  />
                </div>

                {/* 特性展示 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[
                    {
                      icon: DroneIcon,
                      title: "智能无人机控制",
                      description: "先进的飞行控制和自动导航系统"
                    },
                    {
                      icon: AiIcon,
                      title: "AI视觉分析",
                      description: "基于深度学习的实时图像识别与分析"
                    },
                    {
                      icon: Target,
                      title: "精准检测",
                      description: "高精度的目标识别和位置定位"
                    },
                    {
                      icon: Shield,
                      title: "安全可靠",
                      description: "企业级安全保障和数据保护"
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

          {/* 右侧注册表单 */}
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
                        className="text-purple-400"
                      />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    创建新账户
                  </h3>
                  <p className="text-white/70">
                    填写信息完成注册
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    type="text"
                    label="姓名"
                    placeholder="请输入您的姓名"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    classNames={{
                      base: "w-full",
                      input: "text-white",
                      inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                      label: "text-white/80"
                    }}
                    isRequired
                  />

                  <Input
                    type="text"
                    label="用户名"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    classNames={{
                      base: "w-full",
                      input: "text-white",
                      inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                      label: "text-white/80"
                    }}
                    isRequired
                  />

                  <Input
                    type="email"
                    label="邮箱地址"
                    placeholder="请输入您的邮箱"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    classNames={{
                      base: "w-full",
                      input: "text-white",
                      inputWrapper: "bg-white/10 border-white/20 hover:bg-white/15 data-[hover=true]:bg-white/15 group-data-[focus=true]:bg-white/15",
                      label: "text-white/80"
                    }}
                    isRequired
                  />

                  <Input
                    type={showPassword ? "text" : "password"}
                    label="密码"
                    placeholder="请输入密码"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
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
                    placeholder="请再次输入密码"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
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
                    disabled={isLoading}
                  >
                    {isLoading ? "注册中..." : "创建账户"}
                  </Button>

                  <Spacer y={4} />

                  <div className="text-center">
                    <p className="text-white/70 text-sm">
                      已有账户？{" "}
                      <Link
                        href="/login"
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        立即登录
                      </Link>
                    </p>
                  </div>
                </form>

                {/* 服务条款 */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-xs text-white/60 text-center leading-relaxed">
                    注册即表示您同意我们的{" "}
                    <Link href="/terms" className="text-blue-400 hover:text-blue-300">
                      服务条款
                    </Link>{" "}
                    和{" "}
                    <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                      隐私政策
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