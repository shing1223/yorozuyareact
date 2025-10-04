// next.config.ts
import type { NextConfig } from "next"

// 用 require 匯入 next-pwa（它本身是 CJS）
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV !== "production",
  register: true,
  skipWaiting: true,
  // 可依需要補 runtimeCaching
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "instagram.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 降低 IG CDN 的熱鏈接拒絕率
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ]
  },
}

export default withPWA(nextConfig)