import {heroui} from "@heroui/theme"

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        drone: {
          primary: "#0066ff",
          secondary: "#7c3aed",
          accent: "#06b6d4",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
        ai: {
          gradient: {
            from: "#667eea",
            to: "#764ba2",
          },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'drone-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'ai-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        // 深蓝/浅蓝动感弥散（随主题切换）
        'diffuse-light': 'radial-gradient(circle at 68% 28%, #93c5fd 0%, transparent 52%), radial-gradient(circle at 82% 20%, #67e8f9 0%, transparent 50%), radial-gradient(circle at 56% 34%, #60a5fa 0%, transparent 55%), radial-gradient(circle at 88% 26%, #7dd3fc 0%, transparent 52%)',
        'diffuse-dark': 'radial-gradient(circle at 70% 26%, #0b1e3f 0%, transparent 52%), radial-gradient(circle at 85% 18%, #1e3a8a 0%, transparent 50%), radial-gradient(circle at 58% 34%, #0c4a6e 0%, transparent 55%), radial-gradient(circle at 90% 24%, #0a3a8a 0%, transparent 52%)',
        // 兼容旧类名（可保留）
        'blue-diffuse': 'radial-gradient(circle at 70% 26%, #0b1e3f 0%, transparent 52%), radial-gradient(circle at 85% 18%, #1e3a8a 0%, transparent 50%), radial-gradient(circle at 58% 34%, #0c4a6e 0%, transparent 55%), radial-gradient(circle at 90% 24%, #0a3a8a 0%, transparent 52%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        // 提升可见度：更大的位移、更快的周期
        'blue-diffuse': 'blueDiffuse 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        // 背景渐变动画
        first: "moveVertical 30s ease infinite",
        second: "moveInCircle 20s reverse infinite",
        third: "moveInCircle 40s linear infinite",
        fourth: "moveHorizontal 40s ease infinite",
        fifth: "moveInCircle 20s ease infinite",
        // 流星效果
        'meteor-effect': 'meteor 5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        meteor: {
          '0%': {
            transform: 'rotate(215deg) translateX(0)',
            opacity: '1',
          },
          '70%': {
            opacity: '1',
          },
          '100%': {
            transform: 'rotate(215deg) translateX(-500px)',
            opacity: '0',
          },
        },
        // 加强版漂移：位移幅度与缩放更明显
        blueDiffuse: {
          '0%, 100%': {
            backgroundPosition: '68% 30%, 85% 20%, 58% 36%, 90% 28%',
            backgroundSize: '230% 230%, 190% 190%, 280% 280%, 210% 210%'
          },
          '25%': {
            backgroundPosition: '62% 22%, 78% 28%, 52% 30%, 92% 22%',
            backgroundSize: '260% 260%, 210% 210%, 320% 320%, 230% 230%'
          },
          '50%': {
            backgroundPosition: '74% 38%, 88% 16%, 64% 40%, 84% 34%',
            backgroundSize: '240% 240%, 200% 200%, 290% 290%, 220% 220%'
          },
          '75%': {
            backgroundPosition: '66% 26%, 80% 24%, 56% 42%, 94% 24%',
            backgroundSize: '255% 255%, 215% 215%, 310% 310%, 235% 235%'
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // 背景渐变动画关键帧
        moveHorizontal: {
          "0%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
          "50%": {
            transform: "translateX(50%) translateY(10%)",
          },
          "100%": {
            transform: "translateX(-50%) translateY(-10%)",
          },
        },
        moveInCircle: {
          "0%": {
            transform: "rotate(0deg)",
          },
          "50%": {
            transform: "rotate(180deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
        moveVertical: {
          "0%": {
            transform: "translateY(-50%)",
          },
          "50%": {
            transform: "translateY(50%)",
          },
          "100%": {
            transform: "translateY(-50%)",
          },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          background: "#ffffff",
          foreground: "#11181C",
          primary: {
            50: "#e6f1fe",
            100: "#cce3fd",
            200: "#99c7fb",
            300: "#66aaf9",
            400: "#338ef7",
            500: "#006FEE",
            600: "#005bc4",
            700: "#004493",
            800: "#002e62",
            900: "#001731",
            DEFAULT: "#006FEE",
            foreground: "#ffffff",
          },
          secondary: {
            50: "#f2f2f7",
            100: "#e6e6ef",
            200: "#ccccde",
            300: "#b3b3ce",
            400: "#9999bd",
            500: "#7c3aed",
            600: "#6366f1",
            700: "#4f46e5",
            800: "#4338ca",
            900: "#3730a3",
            DEFAULT: "#7c3aed",
            foreground: "#ffffff",
          },
        },
      },
      dark: {
        colors: {
          background: "#0D1117",
          foreground: "#ECEDEE",
          primary: {
            50: "#001731",
            100: "#002e62",
            200: "#004493",
            300: "#005bc4",
            400: "#006FEE",
            500: "#338ef7",
            600: "#66aaf9",
            700: "#99c7fb",
            800: "#cce3fd",
            900: "#e6f1fe",
            DEFAULT: "#006FEE",
            foreground: "#ffffff",
          },
          secondary: {
            50: "#3730a3",
            100: "#4338ca",
            200: "#4f46e5",
            300: "#6366f1",
            400: "#7c3aed",
            500: "#9999bd",
            600: "#b3b3ce",
            700: "#ccccde",
            800: "#e6e6ef",
            900: "#f2f2f7",
            DEFAULT: "#7c3aed",
            foreground: "#ffffff",
          },
        },
      },
      "drone-theme": {
        extend: "dark",
        colors: {
          background: "#0a0e1a",
          foreground: "#ffffff",
          primary: {
            DEFAULT: "#0066ff",
            foreground: "#ffffff",
          },
          secondary: {
            DEFAULT: "#7c3aed",
            foreground: "#ffffff",
          },
          success: {
            DEFAULT: "#10b981",
            foreground: "#ffffff",
          },
          warning: {
            DEFAULT: "#f59e0b",
            foreground: "#000000",
          },
          danger: {
            DEFAULT: "#ef4444",
            foreground: "#ffffff",
          },
        },
      },
    },
  })],
}

module.exports = config;