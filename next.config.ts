// next.config.ts
import type { NextConfig } from "next";
import withPWA from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const baseConfig: NextConfig = {
  images: {
    // 建議只用 remotePatterns（涵蓋 IG/Facebook CDN）
    remotePatterns: [
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      { protocol: "https", hostname: "instagram.com" },
    ],
  },
};

export default withPWA({
  ...baseConfig,
  // PWA 設定
  pwa: {
    dest: "public",
    disable: !isProd,       // 只在 production 啟用
    register: true,
    skipWaiting: true,
    buildExcludes: [/middleware-manifest\.json$/],
    // 需要自訂 SW 再加上這行並提供檔案
    // sw: "service-worker.js",
    runtimeCaching: [
      // HTML 導航：優先線上，離線回退
      {
        urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
      // Next 靜態資源
      {
        urlPattern: /^https:\/\/[^/]+\/_next\/static\//,
        handler: "StaleWhileRevalidate",
        options: { cacheName: "next-static" },
      },
      // 圖片（含 IG / FB CDN）
      {
        urlPattern: ({ url }: { url: URL }) =>
          /\.(?:png|jpg|jpeg|gif|webp|avif|svg)$/i.test(url.pathname) ||
          url.hostname.includes("cdninstagram") ||
          url.hostname.includes("fbcdn"),
        handler: "CacheFirst",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
      // Supabase 檔案（如有）
      {
        urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith("supabase.co"),
        handler: "StaleWhileRevalidate",
        options: { cacheName: "supabase" },
      },
      // JSON / API（可視需求調整）
      {
        urlPattern: ({ request }: { request: Request }) =>
          (request as any).destination === "document" ||
          (request as any).destination === "",
        handler: "NetworkFirst",
        options: { cacheName: "api", networkTimeoutSeconds: 6 },
      },
    ],
  },
});