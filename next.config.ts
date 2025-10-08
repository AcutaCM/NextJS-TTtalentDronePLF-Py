import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // 跳过构建时的 ESLint 检查，避免因本地缺失插件阻塞构建
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;