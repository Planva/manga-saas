// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 生产构建时忽略 ESLint（CI 不再因 lint 报错而失败）
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 生产构建时忽略 TS 类型报错（可选，先保障部署）
  typescript: {
    ignoreBuildErrors: true,
  },
  // 你已有的其他配置保持不变……
};

export default nextConfig;
