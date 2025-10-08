"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

interface CustomThemeContextType {
  theme: string | undefined;
  setTheme: (theme: string) => void;
  isDark: boolean;
}

const CustomThemeContext = createContext<CustomThemeContextType | undefined>(undefined);

export const CustomThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  
  // 确保在客户端渲染时才确定 isDark
  const [isDark, setIsDark] = React.useState(false);
  
  useEffect(() => {
    setIsDark(resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const value = {
    theme,
    setTheme,
    isDark,
  };

  return (
    <CustomThemeContext.Provider value={value}>
      {children}
    </CustomThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(CustomThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a CustomThemeProvider');
  }
  return context;
};