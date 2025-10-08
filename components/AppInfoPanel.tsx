"use client";

import { Card, CardBody } from "@heroui/card";
import Image from "next/image";

interface AppInfoPanelProps {
  className?: string;
}

export default function AppInfoPanel({ className = "" }: AppInfoPanelProps) {
  return (
    <Card className={`w-full h-full bg-background/60 backdrop-blur-[15px] border border-divider ${className}`}>
      <CardBody className="p-0 relative">
        {/* 主要内容容器 */}
        <div className="relative p-[5%]">
          {/* Logo 和应用图标 */}
           <div className="flex items-start gap-[3%] mb-[5%]">
             {/* 应用图标容器 */}
             <div className="relative w-[50px] h-[50px] flex-shrink-0">
               {/* 图标背景 */}
               <div className="absolute inset-0 bg-content2 rounded-[25%] border border-divider shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]" />
               
               {/* 图标内容 - 使用项目 Logo */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <Image
                   src="/logo.svg"
                   alt="TTtalent Logo"
                   width={30}
                   height={23}
                   className="object-contain"
                 />
               </div>
             </div>
            
            {/* 应用名称和开发者信息 */}
            <div className="flex-1">
              {/* 主标题 */}
              <div className="mb-[0.5%]">
                <h2 className="text-foreground text-[1.125rem] font-bold leading-[1.75rem] font-inter">
                  TTtalent
                </h2>
              </div>
              
              {/* 副标题 */}
              <div className="mb-[3%]">
                <p className="text-foreground/60 text-[1rem] font-medium leading-[1.5rem] font-inter">
                  TTtalentDev
                </p>
              </div>
            </div>
          </div>
          
          {/* 应用描述 */}
          <div className="mb-[5%]">
            <p className="text-foreground text-[1rem] font-normal leading-[1.5rem] font-inter">
              TTtalentPLF是结合物联网、遥感与人工智能，为农田提供从监测、分析到执行的一体化管理平台。
            </p>
          </div>
          
          {/* GitHub链接 */}
          <div className="mb-[6%]">
            <a 
              href="#" 
              className="text-primary text-[1rem] font-medium leading-[1.5rem] font-inter hover:underline cursor-pointer"
            >
              在Github上查看我的代码
            </a>
          </div>
          
          {/* 版本信息 */}
          <div className="absolute bottom-[5%] right-[5%]">
            <p className="text-foreground text-[0.8125rem] font-normal leading-[1.125rem] font-sf-pro tracking-[-0.6%]">
              APP Ver: Alpha2.0.1
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}