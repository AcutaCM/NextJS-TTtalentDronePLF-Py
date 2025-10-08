"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { CheckCircle, Zap, Shield, Target } from "lucide-react";
import { DroneIcon, AiIcon } from "@/components/icons";
import PageTransition from "@/components/PageTransition";

export default function LoginSuccessPage() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const steps = [
    { icon: CheckCircle, text: "验证身份", color: "text-green-400" },
    { icon: Shield, text: "加载安全配置", color: "text-blue-400" },
    { icon: DroneIcon, text: "初始化系统", color: "text-purple-400" },
    { icon: Target, text: "准备就绪", color: "text-orange-400" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // 延迟一小会儿让用户看到完成状态
          setTimeout(() => {
            router.push('/');
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // 步骤更新
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          clearInterval(stepInterval);
          return steps.length - 1;
        }
        return prev + 1;
      });
    }, 800);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [router]);

  return (
    <PageTransition>
      <div className="min-h-screen w-full relative overflow-hidden flex items-center justify-center">
        {/* 动态背景 */}
        <div 
          className="absolute inset-0 transition-all duration-1000"
          style={{
            background: `
              radial-gradient(circle at 50% 30%, rgba(0, 255, 123, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 30% 70%, rgba(0, 102, 255, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 70% 60%, rgba(124, 58, 237, 0.15) 0%, transparent 50%),
              linear-gradient(135deg, #0a0e1a 0%, #1a1f3a 100%)
            `
          }}
        />

        {/* 装饰性粒子效果 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-green-400/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {/* 主内容 */}
        <div className="relative z-10 max-w-lg w-full mx-auto p-8">
          <Card className="bg-white/10 backdrop-blur-xl border-white/20">
            <CardBody className="p-12 text-center">
              {/* Logo和成功图标 */}
              <div className="flex justify-center items-center gap-4 mb-8">
                <div className="relative">
                  <Image 
                    src="/logo.svg" 
                    alt="TTtalentDronePLF Logo" 
                    width={48} 
                    height={48} 
                    className="text-blue-500"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>

              {/* 成功消息 */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-3">
                  登录成功！
                </h1>
                <p className="text-white/80 text-lg">
                  欢迎回到 TTtalentDronePLF 智能分析平台
                </p>
              </div>

              {/* 进度条 */}
              <div className="mb-8">
                <Progress
                  value={progress}
                  size="lg"
                  classNames={{
                    base: "w-full",
                    track: "bg-white/20",
                    indicator: "bg-gradient-to-r from-green-500 to-blue-500"
                  }}
                />
                <p className="text-white/70 text-sm mt-3">
                  正在加载系统... {Math.round(progress)}%
                </p>
              </div>

              {/* 加载步骤 */}
              <div className="space-y-4">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index <= currentStep;
                  const isCompleted = index < currentStep;
                  
                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                        isActive 
                          ? 'bg-white/10 border border-white/20' 
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className={`p-2 rounded-lg transition-all duration-300 ${
                        isActive 
                          ? 'bg-green-500/20 scale-110' 
                          : 'bg-white/10'
                      }`}>
                        <StepIcon className={`w-5 h-5 transition-colors duration-300 ${
                          isCompleted 
                            ? 'text-green-400' 
                            : isActive 
                              ? step.color 
                              : 'text-white/40'
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-medium transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-white/60'
                        }`}>
                          {step.text}
                        </p>
                        {isActive && !isCompleted && (
                          <div className="flex gap-1 mt-1">
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                          </div>
                        )}
                        {isCompleted && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-green-400 text-xs">完成</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 底部提示 */}
              {progress >= 100 && (
                <div className="mt-8 p-4 rounded-xl bg-green-500/20 border border-green-500/30 animate-in fade-in zoom-in-90">
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium">系统准备就绪，即将进入平台...</span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* 底部装饰 */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"></div>
      </div>
    </PageTransition>
  );
}