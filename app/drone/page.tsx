'use client';

import React from 'react';

export default function Page() {
  return (
    <main className="p-4 space-y-4">
      {/* 现有主页面内容保持不变，面板通过组件选择器添加 */}
      <section>
        <div className="text-center text-gray-500">
          使用右上角的组件选择器来添加面板
        </div>
      </section>
    </main>
  );
}