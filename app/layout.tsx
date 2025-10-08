import "@/styles/globals.css";
// 引入 antd 基础样式重置，保证组件视觉一致性
import "antd/dist/reset.css";
import { Metadata, Viewport } from "next";
import { Link } from "@heroui/link";
import clsx from "clsx";
import { AnimatePresence } from "framer-motion";

import { Providers } from "./providers";

import { siteConfig } from "@/config/site";
// 移除 next/font 的导入以规避开发模式下的字体模块错误
// import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        suppressHydrationWarning
        className={clsx(
          "min-h-screen text-foreground font-sans antialiased",
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <AnimatePresence mode="wait">
            {children}
          </AnimatePresence>
        </Providers>
      </body>
    </html>
  );
}