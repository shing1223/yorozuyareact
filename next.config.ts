// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
    {
      protocol: "https",
      hostname: "**.fbcdn.net", // Facebook/Instagram 圖片 CDN
    },
    {
      protocol: "https",
      hostname: "**.cdninstagram.com",
    },
  ],
    // ✅ 把會載圖的網域列進來
    domains: [
      "scontent.cdninstagram.com", // Instagram CDN 常見域名
      "instagram.com",
    ],
  },
};

export default nextConfig;