"use client";

import * as React from "react";
import {NextUIProvider} from "@nextui-org/react";
import {useRouter} from "next/navigation";
import {ThemeProvider as NextThemesProvider} from "next-themes";
import {AuthProvider} from "@/contexts/AuthContext";
import { CustomThemeProvider } from "@/contexts/ThemeContext";
import { ConfigProvider, theme as antdTheme } from "antd";
import { ThemeProvider as AntdStyleThemeProvider } from "antd-style";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: React.ComponentProps<typeof NextThemesProvider>;
}

export function Providers({children, themeProps}: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push}>
      {/* 主题切换（class）与 antd-style/antd 集成 */}
      <NextThemesProvider {...themeProps}>
        <AntdStyleThemeProvider>
          <ConfigProvider theme={{ algorithm: antdTheme.darkAlgorithm }}>
            <CustomThemeProvider>
              <AuthProvider>
                {children}
              </AuthProvider>
            </CustomThemeProvider>
          </ConfigProvider>
        </AntdStyleThemeProvider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}