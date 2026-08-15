import type { NextConfig } from "next";

// 兼容占位：本项目的唯一构建路径是 vite + vinext（见 vite.config.ts）。
// next 只作为 API/类型兼容层（next/font、next/headers 等 import），不参与构建。
const nextConfig: NextConfig = {
  // 纯静态构建（GitHub Pages 等）：VEYLUMI_STATIC=1 时让 vinext 走 output:
  // "export"，把所有路由预渲染成纯 HTML。默认保持 SSR。
  // 注意：GitHub Pages 子路径前缀不在这里配置——vinext 的 output:"export"
  // 预渲染会按 basePath 剥离路由导致 404，子路径改由 vite.config.ts 的
  // base 处理（只改写资源 URL，不影响路由匹配）。
  output: process.env.VEYLUMI_STATIC === "1" ? "export" : undefined,
};

export default nextConfig;
