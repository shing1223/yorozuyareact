// app/layout.tsx
import type { Metadata, Viewport } from "next"
import "./globals.css"
import RouteProgress from "@/components/RouteProgress"
import { Suspense } from "react"          // ← 新增

export const metadata: Metadata = {
  title: "IG 精選平台",
  description: "以商戶為單位，公開展示在後台勾選的 Instagram 貼文",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IG 精選",
  },
}

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="min-h-[100dvh] pb-[64px]" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
        </div>
      </body>
    </html>
  )
}