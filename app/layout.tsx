// app/layout.tsx
import type { Metadata, Viewport } from "next"
import "./globals.css"
import RouteProgress from "@/components/RouteProgress"

export const metadata: Metadata = {
  title: "IG 精選平台",
  description: "以商戶為單位，公開展示在後台勾選的 Instagram 貼文",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iOS 安全區
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {/* 全站容器：底部導覽留白（含安全區） */}
        <div className="min-h-[100dvh] pb-[64px]" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          <RouteProgress />
          {children}
        </div>
      </body>
    </html>
  )
}