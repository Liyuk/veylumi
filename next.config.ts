import type { NextConfig } from "next";

// 兼容占位：本项目的唯一构建路径是 vite + vinext（见 vite.config.ts）。
// next 只作为 API/类型兼容层（next/font、next/headers 等 import），不参与构建。
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
